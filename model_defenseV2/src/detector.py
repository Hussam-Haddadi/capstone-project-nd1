"""
PhishingDetector
=================
The main public API for phishing detection.

Usage:
    >>> from model_defenseV2.src.detector import PhishingDetector
    >>> detector = PhishingDetector("model_defenseV2/models/defence_model_v2.pkl")
    >>> result = detector.predict("تحذير! ادخل على stc-portal.cc")
    >>> result["is_phishing"]    # True
    >>> result["label_ar"]       # "تصيد احتيالي"
    >>> result["risk_score"]     # 10.0
    >>> result["flags"]          # ["رابط بنطاق مشبوه", ...]
"""

import pickle
from pathlib import Path
from typing import Dict, List, Union

import numpy as np
from scipy.sparse import hstack, csr_matrix

from model_defenseV2.src.features import (
    extract_features,
    extract_domains,  # re-exported in feature module; kept for backward parity
    url_text_for_tfidf,
    FEATURE_NAMES,
)
from model_defenseV2.src.rules import hard_rules


class PhishingDetector:
    """Arabic SMS phishing detector.

    Combines an ensemble ML model with hand-crafted features and
    deterministic hard rules to detect phishing messages.
    """

    # Confidence thresholds
    _CONF_HIGH_RISK = 5.0
    _CONF_MED_RISK = 2.0

    def __init__(self, model_path: Union[str, Path]):
        """Load a trained model artifact.

        Args:
            model_path: Path to the .pkl file containing model + vectorizers.

        Raises:
            FileNotFoundError: If the model file doesn't exist.
            KeyError: If the artifact is missing required keys.
        """
        model_path = Path(model_path)
        if not model_path.exists():
            raise FileNotFoundError(f"Model file not found: {model_path}")

        with open(model_path, "rb") as f:
            artifact = pickle.load(f)

        required = ["model", "tfidf_word", "tfidf_char", "tfidf_url"]
        missing = [k for k in required if k not in artifact]
        if missing:
            raise KeyError(f"Model artifact missing keys: {missing}")

        self.model = artifact["model"]
        self.tfidf_word = artifact["tfidf_word"]
        self.tfidf_char = artifact["tfidf_char"]
        self.tfidf_url = artifact["tfidf_url"]
        self.version = artifact.get("version", "unknown")
        self.training_samples = artifact.get("training_samples", 0)

    # --------------------------------------------------------
    # Public API
    # --------------------------------------------------------

    def predict(self, message: str) -> Dict:
        """Analyze a single SMS message.

        Args:
            message: The SMS text to classify.

        Returns:
            A dict with:
                - is_phishing   (bool)
                - label         (str): "phishing" / "safe"
                - label_ar      (str): Arabic label
                - confidence    (str): "high" / "medium" / "low"
                - risk_score    (float)
                - flags         (list): human-readable reasons
                - detection_method (str): "ml" / "rules" / "ml+rules"
        """
        if not isinstance(message, str) or not message.strip():
            raise ValueError("Message must be a non-empty string")

        # 1. Extract features
        features = extract_features(message)

        # 2. Build feature matrix for ML model
        x_manual = np.array([[features[k] for k in FEATURE_NAMES]])
        x_word = self.tfidf_word.transform([message])
        x_char = self.tfidf_char.transform([message])
        x_url = self.tfidf_url.transform([url_text_for_tfidf(message)])
        x = hstack([x_word, x_char, x_url, csr_matrix(x_manual)])

        # 3. ML prediction + hard rules
        ml_pred = int(self.model.predict(x)[0])
        rules_flag = hard_rules(message)
        is_phishing = bool(ml_pred == 1 or rules_flag)

        # 4. Determine detection method
        if ml_pred == 1 and rules_flag:
            method = "ml+rules"
        elif rules_flag:
            method = "rules"
        else:
            method = "ml"

        # 5. Compute confidence
        confidence = self._compute_confidence(
            is_phishing, features["risk"], method
        )

        # 6. Generate human-readable flags
        flags = self._generate_flags(features)

        return {
            "is_phishing": is_phishing,
            "label": "phishing" if is_phishing else "safe",
            "label_ar": "تصيد احتيالي" if is_phishing else "رسالة آمنة",
            "confidence": confidence,
            "risk_score": float(features["risk"]),
            "flags": flags,
            "detection_method": method,
        }

    def predict_batch(self, messages: List[str]) -> List[Dict]:
        """Analyze multiple messages."""
        return [self.predict(msg) for msg in messages]

    # --------------------------------------------------------
    # Internal helpers
    # --------------------------------------------------------

    def _compute_confidence(
        self, is_phishing: bool, risk: float, method: str
    ) -> str:
        """Map risk score to a confidence label."""
        if is_phishing:
            if risk >= self._CONF_HIGH_RISK or method == "ml+rules":
                return "high"
            if risk >= self._CONF_MED_RISK:
                return "medium"
            return "low"
        # Safe message
        if risk == 0:
            return "high"
        if risk <= self._CONF_MED_RISK:
            return "medium"
        return "low"

    @staticmethod
    def _generate_flags(f: Dict[str, float]) -> List[str]:
        """Convert feature values into human-readable Arabic flags."""
        flags = []

        # URL-related
        if f["sus_tld"]:
            flags.append("رابط بنطاق مشبوه")
        if f["brand_imp"]:
            flags.append("انتحال هوية علامة تجارية")
        if f["hyph_url"]:
            flags.append("رابط بشرطات")
        if f["shortener"]:
            flags.append("رابط مختصر مشبوه")
        if f["typosquat"]:
            flags.append("تقليد نطاق حقيقي")
        if f["leet"]:
            flags.append("تشفير حروف (leetspeak)")

        # Phone-related
        if f["ph_spam"]:
            flags.append("رقم جوال + خدمة سبام")
        if f["mobile"] and not f["official_ph"]:
            flags.append("رقم جوال شخصي")
        if f["spam_svc"]:
            flags.append("إعلان خدمات مشبوهة")

        # Pattern-based
        if f["social_eng"]:
            flags.append("هندسة اجتماعية")
        if f["vishing"]:
            flags.append("تصيد صوتي محتمل")

        # Psychological
        if f["urgency"]:
            flags.append(f"كلمات استعجال ({int(f['urgency'])})")
        if f["reward"]:
            flags.append(f"كلمات مكافآت ({int(f['reward'])})")
        if f["threat"]:
            flags.append(f"كلمات تهديد ({int(f['threat'])})")
        if f["action"]:
            flags.append(f"كلمات حث ({int(f['action'])})")

        # Positive signals
        if f["trusted_dom"]:
            flags.append("نطاق موثوق ✓")

        return flags

    def __repr__(self) -> str:
        return (
            f"PhishingDetector(version={self.version!r}, "
            f"trained_on={self.training_samples} samples)"
        )

