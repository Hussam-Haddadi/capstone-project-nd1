"""
NLP-Based SMS Generator
=========================
Combines N-gram language model + template engine + slot filling
to generate realistic Arabic SMS messages (phishing & safe).
"""

import re, random, pickle
from collections import defaultdict
from pathlib import Path

# Import config relative to this file
import sys
sys.path.insert(0, str(Path(__file__).parent))
import config


class NgramModel:
    """Word-level n-gram language model for Arabic SMS."""

    def __init__(self, n=2):
        self.n = n
        self.word_model = defaultdict(lambda: defaultdict(int))
        self.starters = []

    def fit(self, texts):
        for text in texts:
            words = text.split()
            if len(words) < 2:
                continue
            self.starters.append(tuple(words[:min(self.n, len(words))]))
            for i in range(len(words) - self.n):
                key = tuple(words[i:i + self.n])
                self.word_model[key][words[i + self.n]] += 1

    def generate_sentence(self, max_words=25):
        if not self.starters:
            return ""
        current = list(random.choice(self.starters))
        result = list(current)
        for _ in range(max_words - self.n):
            key = tuple(result[-self.n:])
            dist = self.word_model.get(key, {})
            if not dist:
                break
            items = list(dist.items())
            total = sum(w for _, w in items)
            r = random.random() * total
            cumsum = 0
            for word, weight in items:
                cumsum += weight
                if r <= cumsum:
                    result.append(word)
                    break
        return " ".join(result)


class PhishingGenerator:
    """Full SMS phishing & safe message generator."""

    def __init__(self, seed=42):
        self.rng = random.Random(seed)
        self.ngram = NgramModel(n=2)
        self._fitted = False

    def fit(self, texts):
        self.ngram.fit(texts)
        self._fitted = True

    # --- URL builders ---
    def _sus_url(self, brand):
        eng = config.TRANSLIT.get(brand, brand.lower().replace(" ", ""))
        suffix = self.rng.choice(config.URL_SUFFIXES)
        tld = self.rng.choice(config.SUS_TLDS)
        return self.rng.choice([f"{eng}{suffix}{tld}", f"{self.rng.choice(config.URL_PREFIXES)}{eng}{tld}"])

    def _short_url(self):
        path = "".join(self.rng.choices("abcdefghijklmnopqrstuvwxyz0123456789", k=self.rng.randint(5, 8)))
        return f"http://{self.rng.choice(config.SHORTENERS)}/{path}"

    def _leet_domain(self, brand):
        eng = config.TRANSLIT.get(brand, brand.lower())
        chars = list(eng)
        reps = [i for i, c in enumerate(chars) if c in config.LEET_MAP]
        if reps:
            p = self.rng.choice(reps)
            chars[p] = config.LEET_MAP[chars[p]]
        return "".join(chars) + ".com.sa"

    def _typo_domain(self, brand):
        eng = config.TRANSLIT.get(brand, brand.lower())
        return eng + self.rng.choice(config.TYPO_SUFFIXES)

    def _phone(self):
        return f"05{self.rng.randint(10000000, 99999999)}"

    def _official(self):
        return f"920{self.rng.randint(100000, 999999)}"

    def _tracking(self):
        return f"SA{self.rng.randint(10000000, 99999999)}"

    def _vary(self, msg):
        pre = self.rng.choice(["", "", "", "رسالة من خدمة العملاء: ", "إشعار رسمي: ", "هذه رسالة آلية. "])
        suf = self.rng.choice(["", "", "", f" رقم المرجع: {self.rng.randint(100000, 999999)}", " شكراً لتعاونكم."])
        return pre + msg + suf

    # --- Category generators ---
    def _gen_brand(self):
        b = self.rng.choice(config.TELECOM + config.BANKS)
        u = self._sus_url(b)
        t = self.rng.choice([
            f"{b}: تم اكتشاف {self.rng.choice(config.THREATS)} على حسابك. {self.rng.choice(config.ACTIONS)} {u}",
            f"تحذير من {b}: {self.rng.choice(config.THREATS)}. يرجى الدخول إلى {u} لتأمين حسابك",
            f"{b}: حسابك {self.rng.choice(config.STATUSES)}. لإعادة التفعيل: {u}",
            f"تنبيه أمني من {b}: {self.rng.choice(config.THREATS)}. قم بتحديث بياناتك على {u}",
            f"عزيزي عميل {b}، {self.rng.choice(config.THREATS)}. يرجى تأكيد هويتك عبر {u}",
        ])
        return self._vary(t), "brand"

    def _gen_reward(self):
        b = self.rng.choice(config.TELECOM + config.SHOPPING + config.BANKS)
        u = self.rng.choice([self._sus_url(b), self._short_url(), self._typo_domain(b)])
        t = self.rng.choice([
            f"مبروك! فزت بـ{self.rng.choice(config.PRIZES)} من {b}. {self.rng.choice(config.ACTIONS)} {u}",
            f"تهانينا! تم اختيارك للحصول على {self.rng.choice(config.PRIZES)}. {self.rng.choice(config.ACTIONS)} {u}",
            f"{b}: ربحت {self.rng.choice(config.PRIZES)} في السحب الشهري! {self.rng.choice(config.ACTIONS)} {u}",
            f"لقد تم اختيارك للفوز بمكافأة مالية ضخمة من {b}! {self.rng.choice(config.ACTIONS)} {u}",
        ])
        return self._vary(t), "reward"

    def _gen_delivery(self):
        b = self.rng.choice(config.DELIVERY)
        u = self.rng.choice([self._sus_url(b), self._short_url()])
        t = self.rng.choice([
            f"{b}: شحنتك رقم {self._tracking()} {self.rng.choice(config.DELIVERY_ISSUES)}. {self.rng.choice(config.ACTIONS)} {u}",
            f"{b}: لم نتمكن من توصيل طردك. {self.rng.choice(config.ACTIONS)} {u}",
            f"{b}: شحنتك محتجزة. لاستلامها: {u}",
        ])
        return self._vary(t), "delivery"

    def _gen_gov(self):
        b = self.rng.choice(config.GOV + config.HEALTH)
        u = self.rng.choice([self._sus_url(b), self._short_url(), self._typo_domain(b)])
        t = self.rng.choice([
            f"{b}: حسابك بحاجة لتحديث بياناتك الشخصية. {self.rng.choice(config.ACTIONS)} {u}",
            f"إشعار من {b}: يرجى تحديث رقم الهوية قبل {self.rng.choice(config.DEADLINES)}. {self.rng.choice(config.ACTIONS)} {u}",
            f"{b}: سيتم تعليق خدماتك بدون تحديث. {self.rng.choice(config.ACTIONS)} {u}",
            f"{b}: لديك مبلغ مالي لم يتم صرفه. لاستلامه: {u}",
        ])
        return self._vary(t), "gov"

    def _gen_phone(self):
        if self.rng.random() < 0.5:
            t = self.rng.choice([
                f"عزيزي العميل، بطاقتك البنكية معلقة. اتصل فوراً على {self._phone()} لإعادة التفعيل",
                f"تم إيقاف حسابك مؤقتاً. للاستعلام تواصل على {self._phone()}",
                f"تنبيه: تم رصد عملية مشبوهة على حسابك. اتصل فوراً {self._phone()}",
                f"حسابك معرض للإغلاق. للحل اتصل {self._phone()}",
            ])
        else:
            svc = self.rng.choice(config.SPAM_SERVICES)
            t = self.rng.choice([
                f"مكتب خدمات {svc} للتواصل {self._phone()}",
                f"نوفر لك {svc} بأسعار مميزة. تواصل {self._phone()}",
                f"{svc} بأقل الأسعار. للحجز {self._phone()}",
                f"خدمات {svc} للمؤسسات والشركات {self._phone()}",
            ])
        return self._vary(t), "phone"

    def _gen_leet(self):
        b = self.rng.choice(config.TELECOM + config.BANKS)
        d = self._leet_domain(b) if self.rng.random() < 0.55 else self._typo_domain(b)
        t = self.rng.choice([
            f"تحذير أمني: سجل دخول من جهاز غريب. تحقق: https://{d}/verify",
            f"حسابك بحاجة لتحديث. ادخل على https://{d}/update",
            f"إشعار أمني: أكد هويتك عبر https://www.{d}/confirm",
            f"عزيزي العميل، تم تحديث أنظمة الحماية. يرجى تأكيد بياناتك: https://www.{d}/",
        ])
        return self._vary(t), "leet"

    def _gen_shortener(self):
        b = self.rng.choice(config.ALL_BRANDS)
        u = self._short_url()
        t = self.rng.choice([
            f"عرض خاص لعملاء {b}: {u}",
            f"{b}: تحديث أمني مطلوب لحسابك {u}",
            f"فرصة استثمارية حصرية! التفاصيل: {u}",
            f"خبر عاجل: {u}",
            f"وظائف حكومية شاغرة. التقديم: {u}",
            f"ولي العهد وجّه بمشروع جديد. التفاصيل: {u}",
        ])
        return self._vary(t), "shortener"

    def _gen_social(self):
        t = self.rng.choice([
            "تنبيه: تم فصل خدمتك مؤقتًا بسبب عدم تحديث معلوماتك الشخصية. قم بزيارة الرابط لاستعادة الخدمة.",
            "اكتشف نظامنا مشكلة في حسابك تتطلب تحديث البيانات على وجه السرعة.",
            "حسابك في خطر! يرجى تأكيد بياناتك الشخصية لتجنب الإغلاق النهائي.",
            "خدمتك ستتوقف خلال 24 ساعة ما لم تقم بتحديث بياناتك.",
            "تم تعليق حسابك بسبب عدم التحقق. يرجى تحديث معلوماتك لاستعادة الوصول.",
            "نظام الحماية اكتشف تسجيل دخول من دولة أخرى. حسابك معلق حتى تأكيد هويتك.",
            "تم اكتشاف عملية تحويل غير مصرح بها من حسابك. يرجى التواصل معنا فوراً.",
        ])
        pre = self.rng.choice(["عاجل! ", "تحذير! ", "تنبيه هام: ", "إشعار أمني: ", "", "", ""])
        return pre + t, "social"

    def _gen_safe(self):
        b = self.rng.choice(config.TELECOM + config.BANKS + config.GOV + config.DELIVERY)
        t = self.rng.choice([
            f"{b}: تم تفعيل باقتك الشهرية بنجاح.",
            f"{b}: رصيدك الحالي {self.rng.choice(config.AMOUNTS)} ريال.",
            f"شكراً لاختيارك {b}. باقتك تتجدد قريباً.",
            f"{b}: عملية شراء بمبلغ {self.rng.choice(config.AMOUNTS)} ريال من {self.rng.choice(config.STORES)}.",
            f"{b}: تم تحويل {self.rng.choice(config.AMOUNTS)} ريال لحسابك بنجاح.",
            f"{b}: راتبك الشهري تم إيداعه.",
            f"{b}: تذكير بموعد سداد بطاقتك الائتمانية.",
            f"{b}: موعدك المسجل يوم {self.rng.choice(config.DAYS)} الساعة {self.rng.choice(config.TIMES)}.",
            f"{b}: شحنتك في الطريق. الموعد المتوقع: {self.rng.choice(config.DAYS)}.",
            f"{b}: تم تسليم شحنتك بنجاح.",
            f"تذكير: موعدك في {self.rng.choice(config.PLACES)} يوم {self.rng.choice(config.DAYS)} الساعة {self.rng.choice(config.TIMES)}.",
            f"موعدك في {self.rng.choice(config.PLACES)} يوم {self.rng.choice(config.DAYS)}. للاستفسار: {self._official()}",
            f"{b}: للدعم الفني تواصل معنا على {self._official()}",
            f"سائقك في الطريق. للتواصل: {self._phone()}",
            f"مندوب التوصيل سيصل خلال 15 دقيقة. رقمه: {self._phone()}",
            f"فني الصيانة سيزورك اليوم. للتنسيق: {self._phone()}",
            f"تم تأكيد طلبك. خدمة العملاء: {self._official()}",
            f"تم إرسال رمز التحقق: {self.rng.randint(1000, 9999)}. صالح لمدة 5 دقائق.",
        ])
        return t, "safe"

    # --- Main API ---
    _CAT_MAP = {"brand":"_gen_brand","reward":"_gen_reward","delivery":"_gen_delivery","gov":"_gen_gov",
                "phone":"_gen_phone","leet":"_gen_leet","shortener":"_gen_shortener","social":"_gen_social","safe":"_gen_safe"}

    def generate(self, category=None, count=1):
        results = []
        for _ in range(count):
            if category:
                cat = category
            else:
                cats = list(config.CATEGORY_WEIGHTS.keys())
                weights = [config.CATEGORY_WEIGHTS[c] for c in cats]
                cat = self.rng.choices(cats, weights=weights, k=1)[0]
            text, actual = getattr(self, self._CAT_MAP.get(cat, "_gen_brand"))()
            results.append({"text": text, "category": actual})
        return results

    def generate_dataset(self, n_phishing=800, n_safe=600, original_phishing=None, original_safe=None):
        dataset = []
        if original_phishing:
            for t in original_phishing:
                dataset.append({"text": t, "category": "original", "label": 0})
        if original_safe:
            for t in original_safe:
                dataset.append({"text": t, "category": "safe", "label": 1})
        for cat, weight in config.CATEGORY_WEIGHTS.items():
            n = max(1, int(n_phishing * weight))
            for m in self.generate(category=cat, count=n):
                dataset.append({"text": m["text"], "category": m["category"], "label": 0})
        for m in self.generate(category="safe", count=n_safe):
            dataset.append({"text": m["text"], "category": m["category"], "label": 1})
        seen = set()
        return [d for d in dataset if d["text"] not in seen and not seen.add(d["text"])]

    def save(self, path):
        with open(path, "wb") as f:
            pickle.dump({"ngram": self.ngram, "seed": self.rng.getstate(), "version": "1.0"}, f)

    def load(self, path):
        with open(path, "rb") as f:
            data = pickle.load(f)
        self.ngram = data["ngram"]
        self._fitted = True
