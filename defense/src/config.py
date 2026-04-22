"""
Configuration Constants
========================
All lookup lists and constants used throughout the system.
Edit this file to add new brands, suspicious TLDs, keywords, etc.
"""

# ============================================================
# Top-Level Domains
# ============================================================

SUSPICIOUS_TLDS = [
    ".cc", ".online", ".xyz", ".info", ".top", ".club",
    ".tk", ".ml", ".ga", ".cf", ".site", ".space", ".fun",
    ".golv",  # fake TLD used in typosquatting
]

TRUSTED_TLDS = [
    ".com.sa", ".gov.sa", ".edu.sa", ".org.sa", ".net.sa",
]


# ============================================================
# Trusted Domains
# ============================================================

TRUSTED_DOMAINS = [
    # Telecom
    "stc.com.sa", "mobily.com.sa", "zain.com.sa",
    # Banks
    "alrajhi.com.sa", "sab.com", "alinma.com", "bankalbilad.com",
    # Government
    "gov.sa", "absher.sa", "tawakkalna.sdaia",
    # Delivery
    "splonline.com", "smsa.com.sa",
    # Healthcare
    "sehaty.sa", "moh.gov.sa",
]

REAL_DOMAINS = [
    "stc.com.sa", "mobily.com.sa", "zain.com.sa",
    "alrajhi.com.sa", "bankalbilad.com", "alinma.com", "sab.com",
    "absher.sa", "nafath.sa", "smsa.com.sa", "sehaty.sa", "moh.gov.sa",
]


# ============================================================
# Brand Names (English transliteration)
# ============================================================

BRANDS = [
    "stc", "mobily", "zain", "lebara", "virgin", "salam",
    "alrajhi", "alahli", "alinma", "albilad", "sab", "aljazira",
    "samba", "bankalbilad",
    "absher", "nafath", "tawakkalna", "muqeem", "balady",
    "najiz", "elm", "qiwa", "moh", "moroor",
    "aramex", "smsa", "dhl", "fedex", "ups", "naqel",
    "noon", "amazon", "jarir", "extra", "namshi", "shein",
    "talabat", "hungerstation", "mrsool",
    "sehaty",
]


# ============================================================
# URL Shorteners
# ============================================================

URL_SHORTENERS = [
    "bit.ly", "t.co", "goo.gl", "tinyurl.com",
    "cutt.ly", "rb.gy", "shorturl.at", "is.gd", "ow.ly",
]


# ============================================================
# Spam Service Keywords
# ============================================================

SPAM_SERVICES = [
    "تأشيرات", "استقدام", "نقل كفالة", "قروض", "تمويل بدون",
    "سداد مديونيات", "تعقيب", "شغالات", "سائقين",
    "فوركس", "تداول", "عقارات", "أراضي", "فلل للبيع",
]


# ============================================================
# Psychological Manipulation Keywords
# ============================================================

URGENCY_WORDS = [
    "عاجل", "تحذير", "تنبيه", "فوري", "حظر", "إيقاف",
    "تعليق", "غير مصرح", "احتيال", "إنذار",
    "فوراً", "حالاً", "الآن", "خلال 24", "قبل فوات",
    "لا تفوت", "على وجه السرعة", "في خطر",
]

REWARD_WORDS = [
    "فزت", "مبروك", "تهانينا", "جائزة", "ربحت",
    "مجاني", "مجانية", "مكافأة", "هدية", "فائز",
    "تم اختيارك",
]

THREAT_WORDS = [
    "حظر", "إيقاف", "تعليق", "إغلاق", "انتهاك",
    "غير مصرح", "تم اكتشاف", "مشبوهة", "اختراق",
    "تجميد", "تقييد", "مغلق", "معلق", "معرض",
    "فصل", "في خطر", "محاولة",
]

ACTION_WORDS = [
    "اضغط", "ادخل", "قم بالدخول", "قم بتحديث",
    "يرجى الدخول", "لتفعيل", "لتأمين", "لاستلام",
    "سارع", "أكد هوي", "تحقق من", "توجه إلى",
    "يرجى الاتصال", "اتصل", "للتواصل", "تواصل",
    "يرجى تحديث", "يرجى تأكيد", "يرجى دفع",
]


# ============================================================
# Export helpers
# ============================================================

def get_config_dict() -> dict:
    """Return all config as a dict (used when saving the model artifact)."""
    return {
        "SUSPICIOUS_TLDS": SUSPICIOUS_TLDS,
        "TRUSTED_TLDS": TRUSTED_TLDS,
        "TRUSTED_DOMAINS": TRUSTED_DOMAINS,
        "REAL_DOMAINS": REAL_DOMAINS,
        "BRANDS": BRANDS,
        "URL_SHORTENERS": URL_SHORTENERS,
        "SPAM_SERVICES": SPAM_SERVICES,
        "URGENCY_WORDS": URGENCY_WORDS,
        "REWARD_WORDS": REWARD_WORDS,
        "THREAT_WORDS": THREAT_WORDS,
        "ACTION_WORDS": ACTION_WORDS,
    }
