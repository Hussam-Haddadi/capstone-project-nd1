"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { predictMessage } from "@/lib/api";
import { confidenceToPercent } from "@/lib/confidence";
import { formatDetectionMethod } from "@/lib/detectionMethodLabel";
import { flagTone, toneColor } from "@/lib/flagTone";
import { PHISHING_SAMPLES, SAFE_SAMPLES } from "@/lib/samples";
import type { PredictResult } from "@/lib/types";
import { ApiErrorHint } from "@/components/ApiErrorHint";
import { RiskGauge } from "@/components/RiskGauge";

type Phase = "idle" | "scanning" | "result";

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function ScanClient() {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictResult | null>(null);

  const canScan = text.trim().length > 0 && phase !== "scanning";

  const confLabel = useMemo(() => {
    if (phase !== "result" || !result) return "—";
    return confidenceToPercent(result.confidence);
  }, [phase, result]);

  const confValue = useMemo(() => {
    if (phase !== "result" || !result) return 0;
    const pct = Number.parseFloat(confidenceToPercent(result.confidence).replace("%", ""));
    return Number.isFinite(pct) ? pct : 0;
  }, [phase, result]);

  async function handleScan() {
    setError(null);
    setResult(null);
    setPhase("scanning");

    const trimmed = text.trim();
    const respP = predictMessage(trimmed);
    const minP = new Promise<void>((r) => window.setTimeout(r, 1500));
    const [resp] = await Promise.all([respP, minP]);

    if (!resp.ok) {
      setError(resp.error);
      setPhase("idle");
      return;
    }

    setResult(resp.result);
    setPhase("result");
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-sm font-semibold tracking-wide text-[var(--text-muted)]" dir="rtl">
          محرك ندّ
        </h1>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-label="إدخال الرسالة">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-[var(--text-muted)]" dir="rtl">
              الإدخال — رسالة نصية
            </div>
            <span className="rounded-lg border border-[color-mix(in_oklab,var(--brand)_45%,transparent)] bg-[color-mix(in_oklab,var(--brand)_14%,transparent)] px-2 py-1 text-xs font-semibold text-[var(--brand-light)]">
              عربي
            </span>
          </div>

          <div className="relative">
            {phase === "scanning" ? (
              <div
                className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-2xl"
                aria-hidden
              >
                <div className="scan-line absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--brand)] to-transparent shadow-[0_0_18px_color-mix(in_oklab,var(--brand)_65%,transparent)]" />
              </div>
            ) : null}

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              dir="rtl"
              spellCheck={false}
              placeholder="ألصق رسالة SMS هنا..."
              className="focus-ring min-h-[160px] w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 text-lg text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-[var(--brand)]"
              aria-label="نص الرسالة"
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr]">
            <button
              type="button"
              className="focus-ring rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] hover:border-[color-mix(in_oklab,var(--brand)_45%,transparent)]"
              onClick={() => {
                setText("");
                setPhase("idle");
                setResult(null);
                setError(null);
              }}
            >
              مسح
            </button>
            <button
              type="button"
              disabled={!canScan}
              onClick={() => void handleScan()}
              className={[
                "focus-ring rounded-xl px-4 py-3 text-sm font-bold tracking-wide",
                canScan
                  ? "bg-gradient-to-r from-[var(--brand-dark)] via-[var(--brand)] to-[color-mix(in_oklab,var(--accent-blue)_50%,var(--brand))] text-white shadow-[0_0_28px_color-mix(in_oklab,var(--brand)_40%,transparent)]"
                  : "cursor-not-allowed bg-[var(--bg-elevated)] text-[var(--text-dim)] shadow-none",
              ].join(" ")}
            >
              تحليل
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="focus-ring rounded-xl border border-[color-mix(in_oklab,var(--danger)_35%,transparent)] bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] px-3 py-2 text-base text-[var(--text-primary)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--danger)_55%,transparent)] hover:shadow-[0_10px_26px_-16px_color-mix(in_oklab,var(--danger)_45%,transparent)] active:translate-y-0"
              dir="rtl"
              onClick={() => setText(pickRandom(PHISHING_SAMPLES))}
            >
              رسالة تصيد
            </button>
            <button
              type="button"
              className="focus-ring rounded-xl border border-[color-mix(in_oklab,var(--safe)_35%,transparent)] bg-[color-mix(in_oklab,var(--safe)_10%,transparent)] px-3 py-2 text-base text-[var(--text-primary)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--safe)_55%,transparent)] hover:shadow-[0_10px_26px_-16px_color-mix(in_oklab,var(--safe)_45%,transparent)] active:translate-y-0"
              dir="rtl"
              onClick={() => setText(pickRandom(SAFE_SAMPLES))}
            >
              رسالة آمنة
            </button>
          </div>
        </section>

        <section aria-label="نتيجة التحليل">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-[var(--text-muted)]" dir="rtl">
              المخرجات — الحكم
            </div>
            <div className="text-sm text-[var(--text-secondary)]" dir="rtl">
              الثقة: <span className="font-semibold text-[var(--brand-light)]">{confLabel}</span>
            </div>
          </div>

          <div className="relative min-h-[320px] rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            {phase === "idle" ? (
              <div className="flex h-[320px] flex-col items-center justify-center text-center">
                <div className="font-mono text-3xl text-[var(--text-dim)]" aria-hidden>
                  ⟐
                </div>
                <div className="mt-4 text-sm font-medium text-[var(--text-muted)]" dir="rtl">
                  في انتظار الرسالة…
                </div>
              </div>
            ) : null}

            {phase === "scanning" ? (
              <div className="flex h-[320px] flex-col items-center justify-center text-center">
                <div className="pulse-soft font-mono text-3xl text-[var(--brand-light)]" aria-hidden>
                  ◎
                </div>
                <div className="mt-4 text-sm font-medium text-[var(--brand-light)]" dir="rtl">
                  جاري التحليل…
                </div>
              </div>
            ) : null}

            <AnimatePresence>
              {phase === "result" && result ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <div className="flex gap-4">
                    <div
                      className={[
                        "flex h-14 w-14 shrink-0 items-center justify-center rounded-md text-2xl",
                        result.is_phishing
                          ? "bg-[color-mix(in_oklab,var(--danger)_18%,transparent)] text-[var(--danger)]"
                          : "bg-[color-mix(in_oklab,var(--safe)_18%,transparent)] text-[var(--safe)]",
                      ].join(" ")}
                      aria-hidden
                    >
                      {result.is_phishing ? "⚠" : "✓"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={[
                          "text-[28px] font-bold leading-tight",
                          result.is_phishing ? "text-[var(--danger)]" : "text-[var(--safe)]",
                        ].join(" ")}
                        dir="rtl"
                      >
                        {result.is_phishing ? "تصيّد" : "آمن"}
                      </div>
                      <div className="mt-1 text-sm text-[var(--text-muted)]" dir="rtl">
                        {result.is_phishing ? "تم رصد محاولة تصيد" : "الرسالة آمنة"}
                      </div>
                    </div>
                  </div>

                  <ul className="mt-5 space-y-2" aria-label="العلامات">
                    {result.flags.slice(0, 5).map((flag) => {
                      const tone = flagTone(flag, result.is_phishing);
                      return (
                        <li
                          key={flag}
                          className={["flex gap-2 text-base leading-snug", toneColor(tone)].join(" ")}
                          dir="rtl"
                        >
                          <span aria-hidden>▸</span>
                          <span className="min-w-0">{flag}</span>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-6 flex items-center gap-3 border-t border-[var(--border)] pt-5">
                    <span className="text-sm font-semibold text-[var(--text-dim)]" dir="rtl">
                      المحرك
                    </span>
                    <span className="rounded-lg border border-[color-mix(in_oklab,var(--brand)_45%,transparent)] bg-[color-mix(in_oklab,var(--brand)_12%,transparent)] px-2 py-1 text-xs font-semibold text-[var(--brand-light)]">
                      {formatDetectionMethod(result.detection_method)}
                    </span>
                  </div>

                  <RiskGauge
                    key={`${confValue.toFixed(1)}-${result.is_phishing ? "p" : "s"}`}
                    confidence={confValue}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
}
