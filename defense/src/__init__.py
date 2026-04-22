"""Arabic SMS Phishing Defense — Core Library.

    >>> from defense.src.detector import PhishingDetector
    >>> detector = PhishingDetector("defense/models/defence_model.pkl")
    >>> result = detector.predict("تحذير! ادخل على stc-portal.cc")
"""
from defense.src.detector import PhishingDetector
__version__ = "4.0.0"
__all__ = ["PhishingDetector"]
