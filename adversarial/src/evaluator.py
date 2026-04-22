"""
Adversarial Evaluator
======================
Tests attack messages against the trained defense model.
Only works AFTER both attack and defense are complete.
"""

import sys
from pathlib import Path

# Add project root to path
_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(_ROOT))

from defense.src.detector import PhishingDetector


class AdversarialEvaluator:
    """Tests phishing messages against the defense model."""

    def __init__(self, model_path=None):
        if model_path is None:
            model_path = str(_ROOT / "defense" / "models" / "defence_model.pkl")
        self.detector = PhishingDetector(model_path)

    def evaluate_single(self, message):
        result = self.detector.predict(message)
        return {
            "text": message,
            "detected": result["is_phishing"],
            "evaded": not result["is_phishing"],
            "risk_score": result["risk_score"],
            "method": result["detection_method"],
            "flags": result["flags"],
        }

    def evaluate(self, messages):
        results = [self.evaluate_single(m) for m in messages]
        detected = sum(1 for r in results if r["detected"])
        evaded = sum(1 for r in results if r["evaded"])
        return {
            "total": len(results),
            "detected": detected,
            "evaded": evaded,
            "detection_rate": detected / max(len(results), 1),
            "evasion_rate": evaded / max(len(results), 1),
            "evaded_messages": [r for r in results if r["evaded"]],
            "all_results": results,
        }

    def evaluate_mutations(self, mutation_results):
        mutation_stats = {}
        total_evasions = 0
        for mut in mutation_results:
            orig_r = self.detector.predict(mut["original"])
            mut_r = self.detector.predict(mut["mutated"])
            evasion = orig_r["is_phishing"] and not mut_r["is_phishing"]
            if evasion:
                total_evasions += 1
            for m in mut.get("mutations_applied", []):
                if m not in mutation_stats:
                    mutation_stats[m] = {"total": 0, "evasions": 0}
                mutation_stats[m]["total"] += 1
                if evasion:
                    mutation_stats[m]["evasions"] += 1
        for s in mutation_stats.values():
            s["evasion_rate"] = s["evasions"] / max(s["total"], 1)
        return {
            "total_tested": len(mutation_results),
            "total_evasions": total_evasions,
            "evasion_rate": total_evasions / max(len(mutation_results), 1),
            "per_mutation_stats": mutation_stats,
        }
