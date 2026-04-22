"""
Feature Extraction
===================
Extracts 39 hand-crafted features from an SMS message:

  - URL features (14)      : domain, TLD, typosquatting, shortener, etc.
  - Phone features (5)     : mobile vs. official numbers
  - Spam features (2)      : service spam detection
  - Text structure (7)     : length, punctuation, language ratio
  - Psychological (10)     : urgency, reward, threat, action words
  - Risk score (1)         : composite weighted score
"""

import re
from typing import Dict, List

from model_defenseV2.src import config


# ============================================================
# Pre-compiled regex patterns
# ============================================================

_URL_FULL = re.compile(r'https?://([^\s\]\[/]+)')
_URL_WWW = re.compile(r'www\.([^\s\]\[/]+)')
_URL_BARE = re.compile(
    r'(?<![/@\w])([a-zA-Z0-9](?:[a-zA-Z0-9\-]*[a-zA-Z0-9])?'
    r'(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]*[a-zA-Z0-9])?)+\.[a-zA-Z]{2,})'
)
_PHONE = re.compile(r'(?:05\d{8}|9200\d{5,6}|800\d{7})')
_ARABIC = re.compile(r'[\u0600-\u06FF]')


# ============================================================
# URL Extraction
# ============================================================

def extract_domains(text: str) -> List[str]:
    """Extract all domain names from the text."""
    t = str(text)
    full = _URL_FULL.findall(t)
    www = _URL_WWW.findall(t)
    bare = _URL_BARE.findall(t)
    return list(set(
        d.lower().rstrip('/').lstrip('www.')
        for d in full + www + bare
    ))


def get_tld(domain: str) -> str:
    """Extract the TLD properly (handles .com.sa as a single unit)."""
    parts = domain.split('.')
    if len(parts) >= 3 and parts[-1] == 'sa':
        return '.' + '.'.join(parts[-2:])
    return '.' + parts[-1] if len(parts) >= 2 else ''


# ============================================================
# Typosquatting Detection
# ============================================================

def _leet_variants(s: str) -> List[str]:
    """Return multiple leetspeak decodings of the string."""
    return [
        s,
        s.replace('1', 'i').replace('0', 'o').replace('3', 'e')
         .replace('4', 'a').replace('7', 't'),
        s.replace('1', 'l').replace('0', 'o').replace('3', 'e'),
        s.replace('0', 'o').replace('6', 'b'),
    ]


def is_leetspeak(domain: str) -> bool:
    """Detect number-for-letter substitution (e.g., za1n for zain)."""
    domain_lower = domain.lower()
    for real in config.REAL_DOMAINS:
        brand_name = real.split('.')[0]
        if len(brand_name) < 3:
            continue
        for variant in _leet_variants(domain_lower):
            if (brand_name in variant
                    and brand_name not in domain_lower
                    and real != domain):
                return True
    return False


def is_typosquatting(domain: str) -> bool:
    """Detect imitation of a real domain (e.g., bankalbilad.com.golv)."""
    domain_lower = domain.lower()

    # Trusted TLD: only leetspeak is suspicious
    if any(domain_lower.endswith(t.lstrip('.')) for t in config.TRUSTED_TLDS):
        return is_leetspeak(domain)

    # Non-trusted TLD: check if brand appears but the exact real domain doesn't
    # (we compare exact domain match, not substring, to catch .com.golv tricks)
    for real in config.REAL_DOMAINS:
        brand_name = real.split('.')[0]
        if len(brand_name) < 4:
            continue
        # Brand is present in the domain
        if brand_name in domain_lower:
            # But the domain is NOT exactly the real one (or a subdomain)
            if domain_lower != real and not domain_lower.endswith('.' + real):
                return True

    return is_leetspeak(domain)


def levenshtein_min_distance(domain: str) -> int:
    """Minimum char-level distance to any known real domain."""
    domain_core = domain.lower().split('/')[0].split('.')[0]
    min_dist = 10

    for real in config.REAL_DOMAINS:
        real_core = real.split('.')[0]
        if len(real_core) < 3 or len(domain_core) < 3:
            continue
        dist = (sum(1 for a, b in zip(real_core, domain_core) if a != b)
                + abs(len(real_core) - len(domain_core)))
        min_dist = min(min_dist, dist)

    return min_dist


def is_trusted_domain(domains: List[str]) -> bool:
    """Check if any domain is a legitimate trusted domain."""
    for d in domains:
        for trusted in config.TRUSTED_DOMAINS:
            if trusted in d and not is_typosquatting(d):
                return True
    return False


def has_trusted_tld(domains: List[str]) -> bool:
    """Check if any domain uses a trusted TLD (.com.sa, .gov.sa, ...)."""
    return any(
        any(d.endswith(t.lstrip('.')) for t in config.TRUSTED_TLDS)
        for d in domains
    )


# ============================================================
# Main Feature Extraction Function
# ============================================================

FEATURE_NAMES = [
    # URL (14)
    'has_url', 'url_count', 'sus_tld', 'trusted_tld', 'trusted_dom',
    'brand_imp', 'hyph_url', 'url_hyph_n', 'shortener', 'typosquat',
    'leet', 'url_max_len', 'url_dot_count', 'url_levenshtein',
    # Phone (5)
    'has_phone', 'phone_n', 'mobile', 'official_ph', 'multi_phone',
    # Spam (2)
    'spam_svc', 'ph_spam',
    # Text structure (7)
    'txt_len', 'word_n', 'excl', 'question', 'arabic_ratio',
    'has_https', 'has_http_no_s',
    # Psychological (10)
    'urgency', 'reward', 'threat', 'action', 'manip',
    'thr_act', 'rew_act', 'social_eng', 'vishing', 'personal_addr',
    # Risk score (1)
    'risk',
]


def extract_features(text: str) -> Dict[str, float]:
    """Extract all 39 features from a message.

    Args:
        text: The SMS message to analyze.

    Returns:
        A dict of feature_name -> value. All numeric.
    """
    t = str(text)
    domains = extract_domains(t)
    phones = _PHONE.findall(t)
    f = {}

    # --- URL features (14) ---
    f['has_url'] = 1 if domains else 0
    f['url_count'] = len(domains)
    f['sus_tld'] = int(any(
        get_tld(d) in config.SUSPICIOUS_TLDS for d in domains
    ))
    f['trusted_tld'] = int(has_trusted_tld(domains))
    f['trusted_dom'] = int(is_trusted_domain(domains))
    f['brand_imp'] = int(any(
        get_tld(d) in config.SUSPICIOUS_TLDS
        and any(b in d for b in config.BRANDS)
        for d in domains
    ))
    f['hyph_url'] = int(any('-' in d.split('/')[0] for d in domains))
    f['url_hyph_n'] = sum(d.split('/')[0].count('-') for d in domains)
    f['shortener'] = int(any(
        s in d for d in domains for s in config.URL_SHORTENERS
    ))
    f['typosquat'] = int(any(is_typosquatting(d) for d in domains))
    f['leet'] = int(any(is_leetspeak(d) for d in domains))
    f['url_max_len'] = max([len(d) for d in domains], default=0)
    f['url_dot_count'] = max([d.count('.') for d in domains], default=0)
    f['url_levenshtein'] = (
        min([levenshtein_min_distance(d) for d in domains], default=10)
        if domains else 10
    )

    # --- Phone features (5) ---
    f['has_phone'] = 1 if phones else 0
    f['phone_n'] = len(phones)
    f['mobile'] = int(any(p.startswith('05') for p in phones))
    f['official_ph'] = int(any(p.startswith(('920', '800')) for p in phones))
    f['multi_phone'] = int(len(phones) > 1)

    # --- Spam features (2) ---
    f['spam_svc'] = int(any(s in t for s in config.SPAM_SERVICES))
    f['ph_spam'] = int(f['mobile'] and f['spam_svc'])

    # --- Text structure (7) ---
    f['txt_len'] = len(t)
    f['word_n'] = len(t.split())
    f['excl'] = t.count('!')
    f['question'] = t.count('?')
    f['arabic_ratio'] = len(_ARABIC.findall(t)) / max(len(t), 1)
    f['has_https'] = int('https' in t.lower())
    f['has_http_no_s'] = int(
        'http://' in t.lower() and 'https' not in t.lower()
    )

    # --- Psychological features (10) ---
    f['urgency'] = sum(1 for w in config.URGENCY_WORDS if w in t)
    f['reward'] = sum(1 for w in config.REWARD_WORDS if w in t)
    f['threat'] = sum(1 for w in config.THREAT_WORDS if w in t)
    f['action'] = sum(1 for w in config.ACTION_WORDS if w in t)
    f['manip'] = (
        f['urgency'] + f['reward'] * 1.5 + f['threat'] * 1.5 + f['action']
    )
    f['thr_act'] = int(f['threat'] > 0 and f['action'] > 0)
    f['rew_act'] = int(f['reward'] > 0 and f['action'] > 0)
    f['social_eng'] = int(
        not f['has_url'] and not f['has_phone'] and f['manip'] >= 3
    )
    f['vishing'] = int(
        not f['has_url'] and f['thr_act'] and f['urgency'] > 0
    )
    f['personal_addr'] = int(any(
        w in t for w in ['عزيزي', 'عميل', 'عميلنا', 'مرحبا']
    ))

    # --- Composite risk score ---
    risk = (
        f['sus_tld'] * 3
        + f['brand_imp'] * 4
        + f['hyph_url'] * 2
        + f['shortener'] * 3
        + f['typosquat'] * 5
        + f['leet'] * 5
        + f['ph_spam'] * 4
        + (f['mobile'] if not f['official_ph'] else 0)
        + f['spam_svc'] * 2
        + f['social_eng'] * 3
        + f['vishing'] * 3
        + f['has_http_no_s'] * 1
        + min(f['urgency'], 3)
        + min(f['reward'], 3) * 1.5
        + min(f['threat'], 3) * 1.5
        + f['thr_act'] * 2
        + f['rew_act'] * 2
        + f['multi_phone'] * 1
        - f['trusted_dom'] * 5
        - f['trusted_tld'] * 3
        - f['official_ph'] * 2
    )
    f['risk'] = max(risk, 0)

    return f


def url_text_for_tfidf(text: str) -> str:
    """Return a string of just the domains, for URL-specific TF-IDF."""
    domains = extract_domains(text)
    return ' '.join(domains) if domains else 'no_url'

