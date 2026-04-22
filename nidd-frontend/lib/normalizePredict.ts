import type { PredictResult } from "./types";

function asBool(v: unknown): boolean {
  if (v === true || v === 1 || v === "1") return true;
  if (v === false || v === 0 || v === "0") return false;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    if (s === "true" || s === "phishing") return true;
    if (s === "false" || s === "safe") return false;
  }
  return Boolean(v);
}

function asNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

/** Accepts several backend shapes (camelCase, numeric booleans, flat vs wrapped). */
export function normalizePredictResult(input: unknown): PredictResult | null {
  if (!input || typeof input !== "object") return null;
  const root = input as Record<string, unknown>;
  const raw =
    root.result && typeof root.result === "object"
      ? (root.result as Record<string, unknown>)
      : (root as Record<string, unknown>);

  const ipRaw = raw.is_phishing ?? raw.isPhishing ?? raw.phishing;
  const label = typeof raw.label === "string" ? raw.label.toLowerCase() : "";

  let is_phishing: boolean;
  if (typeof ipRaw === "boolean") is_phishing = ipRaw;
  else if (ipRaw !== undefined && ipRaw !== null) is_phishing = asBool(ipRaw);
  else if (label === "phishing") is_phishing = true;
  else if (label === "safe") is_phishing = false;
  else return null;

  const label_ar = String(raw.label_ar ?? raw.labelAr ?? (is_phishing ? "تصيد احتيالي" : "رسالة آمنة"));
  const risk_score = asNumber(raw.risk_score ?? raw.risk ?? raw.riskScore);
  const confidence = (raw.confidence ?? "medium") as PredictResult["confidence"];
  const flags = asStringArray(raw.flags ?? raw.reasons);
  const detection_method = String(
    raw.detection_method ?? raw.detectionMethod ?? "rules",
  ) as PredictResult["detection_method"];

  return {
    is_phishing,
    label: typeof raw.label === "string" ? raw.label : undefined,
    label_ar,
    risk_score,
    confidence,
    flags,
    detection_method,
  };
}
