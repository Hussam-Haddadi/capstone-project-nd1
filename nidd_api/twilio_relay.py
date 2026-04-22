"""
Twilio SMS webhook → defense model → optional WhatsApp forward (sandbox).
In-memory event log (MVP). Register via attach_twilio_routes(app, predict_fn).
"""

from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import PlainTextResponse

logger = logging.getLogger("nidd_api.twilio_relay")

PredictFn = Callable[[str], Dict[str, Any]]

_RELAY_EVENTS: List[Dict[str, Any]] = []
_MAX_RELAY = 200

STATUS_RECEIVED = "received"
STATUS_ANALYZING = "analyzing"
STATUS_SAFE = "safe"
STATUS_PHISHING = "phishing"
STATUS_FORWARDED = "forwarded"
STATUS_BLOCKED = "blocked"
STATUS_FAILED = "failed"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _twilio_env() -> Dict[str, Optional[str]]:
    return {
        "account_sid": os.environ.get("TWILIO_ACCOUNT_SID"),
        "auth_token": os.environ.get("TWILIO_AUTH_TOKEN"),
        "sms_number": os.environ.get("TWILIO_SMS_NUMBER"),
        "whatsapp_from": os.environ.get("TWILIO_WHATSAPP_FROM"),
        "target_whatsapp": os.environ.get("TARGET_WHATSAPP_NUMBER"),
        "public_base_url": os.environ.get("PUBLIC_BASE_URL", "").rstrip("/"),
    }


def _mask_phone(p: str) -> str:
    p = (p or "").strip()
    if len(p) <= 6:
        return "***" if p else ""
    return p[:3] + "…" + p[-3:]


def _normalize_whatsapp_addr(raw: Optional[str]) -> str:
    """E.164 after whatsapp: — strips quotes and duplicate whatsapp: prefixes."""
    if not raw:
        return ""
    s = raw.strip().strip('"').strip("'")
    s = " ".join(s.split())
    if not s:
        return ""
    while s.lower().startswith("whatsapp:"):
        s = s[9:].strip()
    if not s:
        return ""
    return f"whatsapp:{s}"


def relay_config_ready() -> Dict[str, Any]:
    env = _twilio_env()
    required = ("account_sid", "auth_token", "sms_number", "whatsapp_from", "target_whatsapp")
    missing = [k for k in required if not env.get(k)]
    wa_from_raw = (env.get("whatsapp_from") or "").strip()
    wa_norm = _normalize_whatsapp_addr(wa_from_raw) if wa_from_raw else ""
    wa_preview = _mask_phone(wa_norm.replace("whatsapp:", "", 1)) if wa_norm else ""
    sms_raw = (env.get("sms_number") or "").strip().strip('"').strip("'")
    wa_body = wa_norm.replace("whatsapp:", "", 1) if wa_norm else ""
    wa_digits = "".join(c for c in wa_body if c.isdigit())
    sms_digits = "".join(c for c in sms_raw if c.isdigit())
    same_as_sms = bool(wa_digits and sms_digits and wa_digits == sms_digits)
    return {
        "twilio_configured": len(missing) == 0,
        "missing_env": missing,
        "public_base_url_set": bool(env["public_base_url"]),
        "sms_number_preview": _mask_phone(sms_raw),
        "whatsapp_from_preview": wa_preview,
        "whatsapp_from_same_as_sms": same_as_sms,
        "target_whatsapp_preview": _mask_phone(env.get("target_whatsapp") or ""),
    }


def _append_event(entry: Dict[str, Any]) -> None:
    _RELAY_EVENTS.insert(0, entry)
    del _RELAY_EVENTS[_MAX_RELAY:]


def _send_whatsapp_safe(body: str, from_sms: str) -> tuple[bool, Optional[str]]:
    env = _twilio_env()
    if not all(
        env.get(k)
        for k in ("account_sid", "auth_token", "whatsapp_from", "target_whatsapp")
    ):
        return False, "Twilio WhatsApp env incomplete"

    try:
        from twilio.rest import Client  # type: ignore
    except ImportError:
        return False, "twilio package not installed"

    client = Client(env["account_sid"], env["auth_token"])
    wa_from = _normalize_whatsapp_addr(env.get("whatsapp_from"))
    wa_to = _normalize_whatsapp_addr(env.get("target_whatsapp"))
    if not wa_from or not wa_to:
        return False, "Twilio WhatsApp from/to address empty after normalization"

    text = f"[ندّ] من {from_sms}\n\n{body}"
    try:
        client.messages.create(from_=wa_from, to=wa_to, body=text)
        return True, None
    except Exception as ex:
        logger.exception("Twilio WhatsApp send failed")
        return False, str(ex)[:500]


def _twilio_signature_ok(request: Request, form: Dict[str, str]) -> bool:
    """Return True if request is allowed (skip, invalid config, or valid signature)."""
    if os.environ.get("TWILIO_SKIP_SIGNATURE_VALIDATION", "").strip().lower() in (
        "1",
        "true",
        "yes",
    ):
        return True
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    base = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/")
    sig = request.headers.get("X-Twilio-Signature") or ""
    if not token or not base:
        return True
    try:
        from twilio.request_validator import RequestValidator  # type: ignore

        url = f"{base}/webhooks/twilio/sms"
        ok = bool(RequestValidator(token).validate(url, form, sig))
        if not ok:
            logger.warning("Twilio signature validation failed for url=%s", url)
        return ok
    except Exception:
        logger.exception("Twilio signature check error; allowing request")
        return True


def attach_twilio_routes(app: Any, predict_fn: PredictFn, model_loaded_fn: Callable[[], bool]) -> None:
    router = APIRouter(tags=["twilio-relay"])

    @router.get("/api/twilio/relay/status")
    def relay_status():
        tw = relay_config_ready()
        latest = _RELAY_EVENTS[0] if _RELAY_EVENTS else None
        return {
            "relay_active": bool(tw["twilio_configured"]),
            "model_loaded": model_loaded_fn(),
            "twilio": tw,
            "latest_message_id": latest.get("id") if latest else None,
        }

    @router.get("/api/twilio/relay/events")
    def relay_events():
        return {"items": list(_RELAY_EVENTS)}

    @router.post("/webhooks/twilio/sms")
    async def twilio_sms_webhook(request: Request):
        form = await request.form()
        form_dict = {k: str(v) for k, v in form.items()}

        from_raw = (form_dict.get("From") or "").strip()
        body = (form_dict.get("Body") or "").strip()
        sid = (form_dict.get("MessageSid") or "").strip() or f"local-{uuid.uuid4().hex[:12]}"

        if not body and not from_raw:
            raise HTTPException(status_code=400, detail="missing Twilio fields")

        eid = str(uuid.uuid4())
        created = _now_iso()
        entry: Dict[str, Any] = {
            "id": eid,
            "source_phone": from_raw,
            "body": body,
            "prediction": None,
            "confidence": None,
            "label": None,
            "flags": [],
            "risk_score": None,
            "detection_method": None,
            "status": STATUS_RECEIVED,
            "twilio_sid": sid,
            "forwarding_result": None,
            "forwarding_error": None,
            "created_at": created,
            "updated_at": created,
        }
        _append_event(entry)

        entry["status"] = STATUS_ANALYZING
        entry["updated_at"] = _now_iso()

        if not _twilio_signature_ok(request, form_dict):
            entry["status"] = STATUS_FAILED
            entry["forwarding_result"] = "signature_rejected"
            entry["forwarding_error"] = (
                "فشل التحقق من توقيع Twilio — راجع أن PUBLIC_BASE_URL يطابق رابط الويبهوك بالضبط (بدون مسار زائد)، أو عيّن "
                "TWILIO_SKIP_SIGNATURE_VALIDATION=true للتجربة المحلية."
            )
            entry["updated_at"] = _now_iso()
            return PlainTextResponse("", status_code=204)

        if not body:
            entry["status"] = STATUS_FAILED
            entry["forwarding_error"] = "empty message body"
            entry["updated_at"] = _now_iso()
            return PlainTextResponse("", status_code=204)

        try:
            result = predict_fn(body)
        except Exception as ex:
            logger.exception("predict_fn failed for Twilio SMS")
            entry["status"] = STATUS_FAILED
            entry["forwarding_result"] = "predict_error"
            entry["forwarding_error"] = str(ex)[:500]
            entry["updated_at"] = _now_iso()
            return PlainTextResponse("", status_code=204)

        is_phishing = bool(result.get("is_phishing"))
        conf = result.get("confidence")
        if isinstance(conf, (int, float)):
            conf_str = str(conf)
        else:
            conf_str = str(conf or "")

        entry["prediction"] = "phishing" if is_phishing else "safe"
        entry["confidence"] = conf_str
        entry["label"] = str(result.get("label") or ("phishing" if is_phishing else "safe"))
        entry["flags"] = list(result.get("flags") or [])[:20]
        entry["risk_score"] = float(result.get("risk_score") or 0)
        entry["detection_method"] = str(result.get("detection_method") or "rules")
        entry["updated_at"] = _now_iso()

        if is_phishing:
            entry["status"] = STATUS_PHISHING
            entry["updated_at"] = _now_iso()
            entry["status"] = STATUS_BLOCKED
            entry["forwarding_result"] = "blocked"
            entry["forwarding_error"] = None
            entry["updated_at"] = _now_iso()
            return PlainTextResponse("", status_code=204)

        entry["status"] = STATUS_SAFE
        entry["updated_at"] = _now_iso()

        ok, err = _send_whatsapp_safe(body, from_raw or "?")
        if ok:
            entry["status"] = STATUS_FORWARDED
            entry["forwarding_result"] = "whatsapp_sent"
            entry["forwarding_error"] = None
        else:
            entry["status"] = STATUS_FAILED
            entry["forwarding_result"] = "send_failed"
            entry["forwarding_error"] = err
        entry["updated_at"] = _now_iso()

        return PlainTextResponse("", status_code=204)

    app.include_router(router)
