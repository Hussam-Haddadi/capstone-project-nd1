import type { DetectionMethod } from "./types";

export function formatDetectionMethod(method: DetectionMethod): string {
  const m = String(method).toLowerCase();
  if (m === "ml+rules" || m === "ml_rules") return "تعلم آلي + قواعد";
  if (m === "ml") return "تعلم آلي";
  if (m === "rules") return "قواعد";
  return String(method);
}
