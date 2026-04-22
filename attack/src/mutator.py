"""
Adversarial Mutator — 8 evasion techniques for testing defense robustness.
"""

import re, random
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent))
import config


class AdversarialMutator:
    def __init__(self, seed=42):
        self.rng = random.Random(seed)

    def leetspeak_url(self, text):
        for real in config.SAFE_URLS:
            if real in text:
                eng = real.split(".")[0]
                chars = list(eng)
                reps = [i for i, c in enumerate(chars) if c in config.LEET_MAP]
                if reps:
                    p = self.rng.choice(reps)
                    chars[p] = config.LEET_MAP[chars[p]]
                    return text.replace(real, "".join(chars) + ".com.sa"), "leetspeak"
        return text, "none"

    def typosquat_url(self, text):
        for real in config.SAFE_URLS:
            if real in text:
                eng = real.split(".")[0]
                return text.replace(real, eng + self.rng.choice(config.TYPO_SUFFIXES)), "typosquat"
        return text, "none"

    def shorten_url(self, text):
        urls = re.findall(r'https?://[^\s]+|[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}(?:/\S*)?', text)
        if urls:
            orig = self.rng.choice(urls)
            domain = self.rng.choice(config.SHORTENERS)
            path = "".join(self.rng.choices("abcdefghijklmnopqrstuvwxyz0123456789", k=6))
            return text.replace(orig, f"http://{domain}/{path}"), "shortener"
        return text, "none"

    def char_duplicate(self, text):
        for kw in ["تحذير", "تنبيه", "إيقاف", "مبروك", "جائزة", "حسابك"]:
            if kw in text:
                p = self.rng.randint(0, len(kw) - 1)
                return text.replace(kw, kw[:p] + kw[p] + kw[p:], 1), "char_dup"
        return text, "none"

    def synonym_swap(self, text):
        swaps = {"تحذير":"تنويه","تنبيه":"إخطار","إيقاف":"وقف","حسابك":"حسابكم",
                 "يرجى":"نرجو","فوراً":"بشكل عاجل","اضغط":"انقر","مبروك":"ألف مبروك","فزت":"كسبت"}
        mutated, applied = text, False
        for old, new in swaps.items():
            if old in mutated and self.rng.random() < 0.5:
                mutated = mutated.replace(old, new, 1)
                applied = True
        return (mutated, "synonym") if applied else (text, "none")

    def word_reorder(self, text):
        words = text.split()
        if len(words) < 5:
            return text, "none"
        mid = self.rng.randint(1, len(words) - 3)
        words[mid], words[mid + 1] = words[mid + 1], words[mid]
        return " ".join(words), "reorder"

    def mixed_script(self, text):
        m = re.search(r'[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}', text)
        if m:
            url = m.group()
            p = self.rng.randint(1, len(url) - 2)
            return text.replace(url, url[:p] + "\u200b" + url[p:]), "zwsp"
        return text, "none"

    def add_noise(self, text):
        words = text.split()
        if len(words) < 3:
            return text, "none"
        p = self.rng.randint(1, len(words) - 1)
        words[p] += self.rng.choice(["ـ", "\u200b", "\u200c"])
        return " ".join(words), "noise"

    ALL_MUTATIONS = ["leetspeak_url", "typosquat_url", "shorten_url", "char_duplicate",
                     "synonym_swap", "word_reorder", "mixed_script", "add_noise"]

    def mutate(self, text, mutation=None):
        if mutation is None:
            mutation = self.rng.choice(self.ALL_MUTATIONS)
        method = getattr(self, mutation, None)
        if not method:
            return {"original": text, "mutated": text, "mutation": "none", "changed": False}
        mutated, mut_type = method(text)
        return {"original": text, "mutated": mutated, "mutation": mut_type, "changed": mutated != text}

    def mutate_batch(self, texts, mutations_per_text=2):
        results = []
        for text in texts:
            muts = self.rng.sample(self.ALL_MUTATIONS, min(mutations_per_text, len(self.ALL_MUTATIONS)))
            current, applied = text, []
            for m in muts:
                r = self.mutate(current, m)
                if r["changed"]:
                    current = r["mutated"]
                    applied.append(r["mutation"])
            results.append({"original": text, "mutated": current, "mutations_applied": applied, "changed": current != text})
        return results
