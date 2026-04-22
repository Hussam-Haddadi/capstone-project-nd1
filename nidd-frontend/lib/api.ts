import { apiUrl } from "./config";
import { normalizePredictResult } from "./normalizePredict";
import type {
  BatchPredictResponse,
  HistoryEntry,
  HistoryPayload,
  PredictResult,
  StatsPayload,
} from "./types";

function safeJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function predictMessage(
  message: string,
): Promise<{ ok: true; result: PredictResult } | { ok: false; error: string }> {
  try {
    const res = await fetch(apiUrl("predict"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const text = await res.text();
    if (!res.ok) {
      const errJson = safeJson<{ detail?: unknown }>(text);
      const detail =
        typeof errJson?.detail === "string"
          ? errJson.detail
          : errJson?.detail
            ? JSON.stringify(errJson.detail)
            : text.slice(0, 200);
      return { ok: false, error: `HTTP ${res.status} — ${detail}` };
    }
    const data = safeJson<unknown>(text) ?? null;
    const result = normalizePredictResult(data);
    if (!result) return { ok: false, error: "Unexpected response shape" };
    return { ok: true, result };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

export async function predictBatch(
  messages: string[],
): Promise<{ ok: true; results: PredictResult[] } | { ok: false; error: string }> {
  try {
    const res = await fetch(apiUrl("predict/batch"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const text = await res.text();
    if (!res.ok) {
      const errJson = safeJson<{ detail?: unknown }>(text);
      const detail =
        typeof errJson?.detail === "string"
          ? errJson.detail
          : errJson?.detail
            ? JSON.stringify(errJson.detail)
            : text.slice(0, 200);
      return { ok: false, error: `HTTP ${res.status} — ${detail}` };
    }
    const data = safeJson<BatchPredictResponse | PredictResult[]>(text) ?? null;
    if (!data) return { ok: false, error: "Invalid JSON" };
    if (Array.isArray(data)) {
      const results = data.map((x) => normalizePredictResult(x)).filter(Boolean) as PredictResult[];
      return results.length === data.length
        ? { ok: true, results }
        : { ok: false, error: "Unexpected batch item shape" };
    }
    const arr = data.results ?? data.predictions ?? data.data;
    if (!Array.isArray(arr)) return { ok: false, error: "Unexpected response shape" };
    const results = arr.map((x) => normalizePredictResult(x)).filter(Boolean) as PredictResult[];
    return results.length === arr.length
      ? { ok: true, results }
      : { ok: false, error: "Unexpected batch item shape" };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

function normalizeHistoryPayload(data: HistoryPayload | HistoryEntry[] | null): HistoryEntry[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.items ?? data.history ?? data.scans ?? [];
}

export async function fetchStats(): Promise<
  { ok: true; stats: StatsPayload } | { ok: false; error: string }
> {
  try {
    const res = await fetch(apiUrl("stats"), { method: "GET" });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} — ${text.slice(0, 160)}` };
    const stats = safeJson<StatsPayload>(text) ?? {};
    return { ok: true, stats };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

export async function fetchHistory(): Promise<
  { ok: true; history: HistoryEntry[] } | { ok: false; error: string }
> {
  try {
    const res = await fetch(apiUrl("history"), { method: "GET" });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} — ${text.slice(0, 160)}` };
    const data = safeJson<HistoryPayload | HistoryEntry[]>(text) ?? null;
    return { ok: true, history: normalizeHistoryPayload(data) };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

export async function pingBackend(): Promise<boolean> {
  const res = await fetchStats();
  return res.ok;
}
