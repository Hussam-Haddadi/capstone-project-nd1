"""
Nidd API — matches the Next.js frontend contract:
  POST /api/predict        { "message": "..." }  (also accepts text / sms)
  POST /api/predict/batch  { "messages": ["...", "..."] }
  GET  /api/stats
  GET  /api/history
  GET  /api/twilio/relay/status
  GET  /api/twilio/relay/events
  POST /webhooks/twilio/sms   (Twilio SMS webhook; form-encoded)

Loads ML from model_defenseV2/models/defence_model_v2.pkl when present (or NIDD_MODEL_PATH).
Otherwise uses rules + feature risk. Predict paths are wrapped so normal requests avoid 500.
"""

from __future__ import annotations

import logging
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from nidd_api.twilio_relay import attach_twilio_routes

logger = logging.getLogger("nidd_api")

ROOT = Path(__file__).resolve().parents[1]
try:
    from dotenv import load_dotenv

    load_dotenv(ROOT / ".env")
except ImportError:
    pass
# So `from defense.src...` works even if uvicorn is started from another cwd (common locally).
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
DEFAULT_MODEL = ROOT / "model_defenseV2" / "models" / "defence_model_v2.pkl"
MODEL_PATH = Path(os.environ.get("NIDD_MODEL_PATH", str(DEFAULT_MODEL))).resolve()

_detector: Any = None  # None = not checked yet; object() sentinel = no model on disk
_NO_MODEL = object()


def _get_detector():
    global _detector
    if _detector is _NO_MODEL:
        return None
    if _detector is not None:
        return _detector
    if not MODEL_PATH.is_file():
        _detector = _NO_MODEL
        return None
    try:
        from defense.src.detector import PhishingDetector

        _detector = PhishingDetector(str(MODEL_PATH))
        return _detector
    except Exception:
        logger.exception("Failed to load ML model from %s; using rules-only fallback", MODEL_PATH)
        _detector = _NO_MODEL
        return None


def _confidence_label(is_phishing: bool, risk: float, method: str) -> str:
    if is_phishing:
        if risk >= 12 or method == "ml+rules":
            return "high"
        if risk >= 7:
            return "medium"
        return "low"
    if risk == 0:
        return "high"
    if risk <= 6:
        return "medium"
    return "low"


def _flags_from_features(f: Dict[str, float]) -> List[str]:
    from defense.src.detector import PhishingDetector

    return PhishingDetector._generate_flags(f)


def _predict_light(message: str) -> Dict[str, Any]:
    from defense.src.features import extract_features
    from defense.src.rules import hard_rules

    f = extract_features(message)
    rules_hit = hard_rules(message)
    risk = float(f["risk"])
    # Without ML weights: treat strong feature risk like the rules layer.
    is_phishing = bool(rules_hit or risk >= 10.0)
    if rules_hit:
        method = "rules"
    elif is_phishing:
        method = "rules"
    else:
        method = "ml"
    flags = _flags_from_features(f)
    conf = _confidence_label(is_phishing, risk, method)
    return {
        "is_phishing": is_phishing,
        "label": "phishing" if is_phishing else "safe",
        "label_ar": "تصيد احتيالي" if is_phishing else "رسالة آمنة",
        "confidence": conf,
        "risk_score": risk,
        "flags": flags[:12],
        "detection_method": method,
    }


def _predict_one(message: str) -> Dict[str, Any]:
    message = (message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="empty message")

    det = _get_detector()
    if det is not None:
        try:
            return det.predict(message)
        except Exception:
            logger.exception("ML predict failed; falling back to rules-only")
            return _predict_light(message)
    return _predict_light(message)


def _minimal_fallback_result() -> Dict[str, Any]:
    """Last resort so the API never returns 500 for a normal predict request."""
    return {
        "is_phishing": False,
        "label": "safe",
        "label_ar": "رسالة آمنة",
        "confidence": "low",
        "risk_score": 0.0,
        "flags": ["تعذّر إكمال التحليل"],
        "detection_method": "rules",
    }


def _predict_one_safe(message: str) -> Dict[str, Any]:
    try:
        return _predict_one(message)
    except HTTPException:
        raise
    except Exception:
        logger.exception("predict pipeline failed")
        try:
            return _predict_light(message)
        except Exception:
            logger.exception("rules-only fallback also failed")
            return _minimal_fallback_result()


# --- in-memory history (MVP for dashboard) ---
_HISTORY: List[Dict[str, Any]] = []
_MAX_HISTORY = 500


def _record_scan(message: str, result: Dict[str, Any]) -> None:
    entry = {
        "id": str(uuid.uuid4()),
        "message": message,
        "risk_score": float(result.get("risk_score", 0)),
        "is_phishing": bool(result.get("is_phishing")),
        "label_ar": result.get("label_ar", "تصيد احتيالي" if result.get("is_phishing") else "رسالة آمنة"),
        "detection_method": result.get("detection_method", "rules"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    _HISTORY.insert(0, entry)
    del _HISTORY[_MAX_HISTORY:]


# --- pydantic ---
class PredictBody(BaseModel):
    message: str = ""
    text: str = ""
    sms: str = ""

    def text_in(self) -> str:
        return (self.message or self.text or self.sms or "").strip()


class BatchBody(BaseModel):
    messages: List[str] = Field(default_factory=list)


app = FastAPI(title="Nidd API", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("NIDD_CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "model_loaded": _get_detector() is not None,
        "model_path": str(MODEL_PATH),
    }


@app.post("/api/predict")
def predict(body: PredictBody):
    text = body.text_in()
    if not text:
        raise HTTPException(status_code=400, detail="missing message/text/sms")
    result = _predict_one_safe(text)
    _record_scan(text, result)
    return {"result": result}


@app.post("/api/predict/batch")
def predict_batch(body: BatchBody):
    msgs = [m.strip() for m in body.messages if isinstance(m, str) and m.strip()]
    if not msgs:
        raise HTTPException(status_code=400, detail="messages[] required")
    out: List[Dict[str, Any]] = []
    for m in msgs:
        r = _predict_one_safe(m)
        _record_scan(m, r)
        out.append(r)
    return {"results": out}


@app.get("/api/stats")
def stats():
    total = len(_HISTORY)
    threats = sum(1 for h in _HISTORY if h.get("is_phishing"))
    clear = total - threats
    avg_risk = (
        sum(float(h.get("risk_score", 0)) for h in _HISTORY) / total if total else 0.0
    )
    return {
        "total_scanned": total,
        "phishing_count": threats,
        "safe_count": clear,
        "avg_risk": round(avg_risk, 3),
        "category_distribution": {},
    }


@app.get("/api/history")
def history():
    return {"items": _HISTORY}


attach_twilio_routes(
    app,
    predict_fn=_predict_one_safe,
    model_loaded_fn=lambda: _get_detector() is not None,
)
