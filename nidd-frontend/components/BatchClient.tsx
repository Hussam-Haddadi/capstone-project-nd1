"use client";

import { useMemo, useRef, useState } from "react";
import { ApiErrorHint } from "@/components/ApiErrorHint";
import { predictBatch } from "@/lib/api";
import { confidenceToPercent } from "@/lib/confidence";
import { formatDetectionMethod } from "@/lib/detectionMethodLabel";
import type { PredictResult } from "@/lib/types";

type Row = { message: string; result: PredictResult };

export function BatchClient() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  const messages = useMemo(() => {
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  }, [text]);

  async function run() {
    setError(null);
    setRows([]);
    if (!messages.length) return;

    setBusy(true);
    setProgress(0);
    setLabel(`جاري التحليل 0 / ${messages.length}…`);

    const tick = window.setInterval(() => {
      setProgress((p) => Math.min(92, p + 2));
    }, 140);

    const resp = await predictBatch(messages);
    window.clearInterval(tick);

    if (!resp.ok) {
      setError(resp.error);
      setBusy(false);
      setProgress(0);
      setLabel("");
      return;
    }

    const n = Math.min(messages.length, resp.results.length);
    const paired: Row[] = messages.slice(0, n).map((m, i) => ({
      message: m,
      result: resp.results[i]!,
    }));

    setRows(paired);
    setProgress(100);
    setLabel(`اكتمل: ${n} / ${messages.length}`);
    setBusy(false);
  }

  function exportCsv() {
    const header = ["message", "is_phishing", "risk_score", "confidence", "detection_method", "flags"];
    const lines = [header.join(",")];
    for (const r of rows) {
      const flags = `"${(r.result.flags ?? []).join(" | ").replace(/"/g, '""')}"`;
      const conf =
        typeof r.result.confidence === "number"
          ? String(r.result.confidence)
          : String(r.result.confidence);
      lines.push(
        [
          `"${r.message.replace(/"/g, '""')}"`,
          String(r.result.is_phishing),
          String(r.result.risk_score),
          `"${conf.replace(/"/g, '""')}"`,
          `"${String(r.result.detection_method).replace(/"/g, '""')}"`,
          flags,
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nidd-batch-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onPickFile(file: File | null) {
    if (!file) return;
    const t = await file.text();
    setText(t);
  }

  const phishing = rows.filter((r) => r.result.is_phishing).length;
  const safe = rows.filter((r) => !r.result.is_phishing).length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-10">
        <h1 className="text-sm font-semibold tracking-wide text-[var(--text-muted)]" dir="rtl">
          الدفعات
        </h1>
        <p className="mt-2 max-w-2xl text-base text-[var(--text-secondary)]" dir="rtl">
          تحليل دفعة كاملة عبر واجهة <span className="font-mono text-[var(--text-muted)]" dir="ltr">/api/predict/batch</span>.
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-6 border border-[color-mix(in_oklab,var(--danger)_55%,transparent)] bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] px-4 py-3 text-base text-[var(--text-primary)]"
          dir="rtl"
        >
          <p className="font-medium">{error}</p>
          <ApiErrorHint message={error} />
        </div>
      ) : null}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <label className="block text-sm font-semibold text-[var(--text-muted)]" dir="rtl">
          الرسائل (سطر لكل رسالة)
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          placeholder="الصق الرسائل، كل رسالة في سطر مستقل…"
          className="focus-ring mt-3 min-h-[220px] w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-[var(--brand)]"
          aria-label="رسائل الدفعة"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="hidden"
            onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="focus-ring rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]"
            onClick={() => fileRef.current?.click()}
          >
            رفع ملف
          </button>
          <div className="text-sm text-[var(--text-muted)]" dir="rtl">
            <span className="font-semibold text-[var(--brand-light)]">{messages.length}</span> رسالة جاهزة للتحليل
          </div>
        </div>

        <button
          type="button"
          disabled={busy || messages.length === 0}
          onClick={() => void run()}
          className={[
            "focus-ring mt-5 w-full rounded-xl px-4 py-3 text-sm font-bold tracking-wide",
            busy || messages.length === 0
              ? "cursor-not-allowed bg-[var(--bg-elevated)] text-[var(--text-dim)]"
              : "bg-gradient-to-r from-[var(--brand-dark)] via-[var(--brand)] to-[color-mix(in_oklab,var(--accent-blue)_50%,var(--brand))] text-white shadow-[0_0_28px_color-mix(in_oklab,var(--brand)_40%,transparent)]",
          ].join(" ")}
        >
          تحليل الكل
        </button>

        {busy ? (
          <div className="mt-5">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-[var(--text-muted)]" dir="rtl">
                {label}
              </div>
              <div className="text-sm font-semibold text-[var(--brand-light)]">{progress}%</div>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full border border-[var(--border)] bg-[var(--bg-base)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--brand-dark)] to-[var(--brand)] transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}
      </section>

      {rows.length ? (
        <section className="mt-10">
          <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-card)_90%,transparent)] px-4 py-3 text-base text-[var(--text-secondary)]" dir="rtl">
            <span className="text-[var(--danger)]">{phishing} تصيد</span>
            <span className="mx-2 text-[var(--text-dim)]">/</span>
            <span className="text-[var(--safe)]">{safe} آمنة</span>
            <span className="mx-2 text-[var(--text-dim)]">من أصل</span>
            <span className="text-[var(--text-primary)]">{rows.length}</span>
            <span className="text-[var(--text-dim)]"> رسالة</span>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className="focus-ring rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]"
              onClick={exportCsv}
            >
              تصدير CSV
            </button>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)]">
            <ul className="divide-y divide-[var(--border)]">
              {rows.map((row, idx) => (
                <li key={`${idx}-${row.message.slice(0, 24)}`} className="bg-[var(--bg-card)] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      <div
                        className="mt-1 h-10 w-[3px] shrink-0 rounded-full"
                        style={{
                          background: row.result.is_phishing ? "var(--danger)" : "var(--safe)",
                        }}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-3">
                          <span className="font-mono text-[12px] text-[var(--brand-light)]">
                            {Number(row.result.risk_score).toFixed(1)}
                          </span>
                          <span
                            className={row.result.is_phishing ? "text-[var(--danger)]" : "text-[var(--safe)]"}
                            dir="rtl"
                          >
                            {row.result.is_phishing ? "تصيّد" : "آمن"}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]" dir="rtl">
                            ثقة {confidenceToPercent(row.result.confidence)}
                          </span>
                        </div>
                        <div className="mt-2 truncate font-mono text-[11px] text-[var(--text-muted)]" dir="rtl" title={row.message}>
                          {row.message}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className="rounded-lg border border-[color-mix(in_oklab,var(--brand)_45%,transparent)] bg-[color-mix(in_oklab,var(--brand)_12%,transparent)] px-2 py-1 font-mono text-[10px] tracking-[0.2em] text-[var(--brand-light)]">
                        {formatDetectionMethod(row.result.detection_method)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
