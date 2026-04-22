import { apiUrl } from "./config";
import type { TwilioRelayEvent, TwilioRelayStatusPayload } from "./types";

function safeJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function fetchTwilioRelayStatus(): Promise<
  { ok: true; data: TwilioRelayStatusPayload } | { ok: false; error: string }
> {
  try {
    const res = await fetch(apiUrl("twilio/relay/status"), { method: "GET", cache: "no-store" });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} — ${text.slice(0, 160)}` };
    const data = safeJson<TwilioRelayStatusPayload>(text);
    if (!data) return { ok: false, error: "Invalid JSON" };
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

export async function fetchTwilioRelayEvents(): Promise<
  { ok: true; items: TwilioRelayEvent[] } | { ok: false; error: string }
> {
  try {
    const res = await fetch(apiUrl("twilio/relay/events"), { method: "GET", cache: "no-store" });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} — ${text.slice(0, 160)}` };
    const raw = safeJson<{ items?: TwilioRelayEvent[] }>(text);
    const items = Array.isArray(raw?.items) ? raw.items : [];
    return { ok: true, items };
  } catch {
    return { ok: false, error: "Network error" };
  }
}
