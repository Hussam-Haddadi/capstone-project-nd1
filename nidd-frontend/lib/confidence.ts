export function confidenceToPercent(confidence: string | number): string {
  if (typeof confidence === "number" && Number.isFinite(confidence)) {
    const v = confidence <= 1 ? confidence * 100 : confidence;
    return `${v.toFixed(1)}%`;
  }
  switch (String(confidence).toLowerCase()) {
    case "high":
      return "96.0%";
    case "medium":
      return "78.0%";
    case "low":
      return "52.0%";
    default:
      return "—";
  }
}
