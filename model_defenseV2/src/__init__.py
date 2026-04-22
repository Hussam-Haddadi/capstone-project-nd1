"""Arabic SMS Phishing Defense — Core Library (V2 training pipeline).

    >>> from model_defenseV2.src.detector import PhishingDetector
    >>> detector = PhishingDetector("model_defenseV2/models/defence_model_v2.pkl")
    >>> result = detector.predict("تحذير! ادخل على stc-portal.cc")
"""

from model_defenseV2.src.detector import PhishingDetector

__version__ = "4.0.0-v2"
__all__ = ["PhishingDetector"]

