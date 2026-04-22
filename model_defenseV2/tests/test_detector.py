"""Unit + regression tests for PhishingDetector (V2 package)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from model_defenseV2.src.detector import PhishingDetector
from model_defenseV2.src.features import extract_domains, is_typosquatting, is_leetspeak
from model_defenseV2.src.rules import hard_rules

MODEL = str(Path(__file__).parent.parent / "models" / "defence_model_v2.pkl")


def test_all():
    d = PhishingDetector(MODEL)

    # Phishing cases must be detected
    phishing = [
        "لقد تم اختيارك للفوز بمكافأة من موبايلي! https://www.mobily.cc/",
        "بطاقة الصراف مغلق، يرجى الاتصال للتحديث./0500311490",
        "ولي العهد وجه بإعداد لوائح http://bit.ly/2JBe1lG",
        "مكتب خدمات إستخراج تأشيرات للتواصل 0505395985",
        "يرجى تأكيد بياناتك: https://www.bankalbilad.com.golv/",
        "سجل دخول غريب. تحقق: https://za1n.com.sa/verify",
        "وزارة الصحة: يرجى دفع رسوم: http://smsa.net/",
    ]
    # Safe cases must pass
    safe = [
        "تم تفعيل باقتك بنجاح. شكراً لاختيارك زين",
        "الراجحي: عملية شراء 500 ريال. للاستفسار: 920003344",
        "موبايلي: عرض خاص عبر mobily.com.sa/app",
        "زين: شحن رصيدك 50 ريال. زر zain.com.sa",
        "سائقك في الطريق. للتواصل: 0551234567",
    ]

    errors = []
    for msg in phishing:
        r = d.predict(msg)
        if not r["is_phishing"]:
            errors.append(f"MISSED: {msg[:60]}")
    for msg in safe:
        r = d.predict(msg)
        if r["is_phishing"]:
            errors.append(f"FALSE POS: {msg[:60]}")

    # Feature tests
    assert "zain.com.sa" in extract_domains("زر zain.com.sa")
    assert is_typosquatting("bankalbilad.com.golv")
    assert not is_typosquatting("bankalbilad.com")
    assert is_leetspeak("za1n.com.sa")
    assert not is_leetspeak("zain.com.sa")
    assert hard_rules("ادخل على https://stc-portal.cc")
    assert hard_rules("http://bit.ly/abc")
    assert not hard_rules("تم تفعيل باقتك")

    if errors:
        for e in errors:
            print(f"  ✗ {e}")
        raise AssertionError(f"{len(errors)} test(s) failed")
    print(
        f"✓ All tests passed ({len(phishing)} phishing + {len(safe)} safe + features + rules)"
    )


if __name__ == "__main__":
    test_all()

