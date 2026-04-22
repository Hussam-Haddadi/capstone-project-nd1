"""
Hard Rules Safety Net
======================
Deterministic rules applied on top of the ML model. These catch
obvious phishing patterns even if the ML model misses them.

Rules:
  R1: Suspicious TLD + brand name → phishing
  R2: Suspicious TLD + hyphenated domain → phishing
  R3: Typosquatting / leetspeak → phishing
  R4: URL shortener (always suspicious in SMS) → phishing
  R5: Multiple reward signals + non-trusted URL → phishing
  R6: Threat + action + non-trusted URL → phishing
  R7: Mobile phone + spam service → phishing
  R8: Mobile phone + threat + action (no official number) → phishing
"""

import re
from defense.src import config
from defense.src.features import (
    extract_domains,
    get_tld,
    is_typosquatting,
    is_trusted_domain,
    has_trusted_tld,
)


# Strong signal keywords (subset of config lists, tightened for precision)
_STRONG_REWARD = [
    "فزت", "مبروك", "تهانينا", "ربحت", "جائزة", "مكافأة", "تم اختيارك"
]
_STRONG_THREAT = [
    "حظر", "إيقاف", "تعليق", "تجميد", "مغلق", "معلق", "فصل", "في خطر"
]
_STRONG_ACTION = [
    "اضغط", "ادخل", "قم بالدخول", "يرجى الدخول", "سارع بالدخول",
    "يرجى الاتصال", "اتصل فوراً", "يرجى دفع"
]

_MOBILE_PHONE = re.compile(r"05\d{8}")
_OFFICIAL_PHONE = re.compile(r"(?:920|800)\d{5,7}")

MIN_REWARD_SIGNALS = 2


def hard_rules(text: str) -> bool:
    """Apply hard rules to detect obvious phishing.

    Returns True if the message matches any phishing pattern.
    """
    t = str(text)
    domains = extract_domains(t)
    trusted = is_trusted_domain(domains)
    has_ttld = has_trusted_tld(domains)

    # R1 & R2: Suspicious TLD + brand OR hyphen
    for d in domains:
        tld = get_tld(d)
        if tld in config.SUSPICIOUS_TLDS:
            if any(b in d for b in config.BRANDS):
                return True
            if "-" in d.split("/")[0]:
                return True

    # R3: Typosquatting / leetspeak
    if any(is_typosquatting(d) for d in domains):
        return True

    # R4: URL shortener (always suspicious in SMS)
    if any(s in d for d in domains for s in config.URL_SHORTENERS):
        return True

    # R5: Multiple reward signals + untrusted URL
    reward_count = sum(1 for w in _STRONG_REWARD if w in t)
    if (reward_count >= MIN_REWARD_SIGNALS
            and domains and not trusted and not has_ttld):
        return True

    # R6: Threat + action + untrusted URL
    has_threat = any(w in t for w in _STRONG_THREAT)
    has_action = any(w in t for w in _STRONG_ACTION)
    if has_threat and has_action and domains and not trusted and not has_ttld:
        return True

    # R7 & R8: Phone-based patterns
    mobile_phones = _MOBILE_PHONE.findall(t)
    official_phones = _OFFICIAL_PHONE.findall(t)

    if mobile_phones and any(s in t for s in config.SPAM_SERVICES):
        return True

    if (mobile_phones and not official_phones
            and has_threat and has_action):
        return True

    return False
