"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchHistory, fetchStats } from "@/lib/api";
import { formatDetectionMethod } from "@/lib/detectionMethodLabel";
import { normalizeStats } from "@/lib/stats";
import type { HistoryEntry } from "@/lib/types";

type Filter = "all" | "phishing" | "safe";

function normalizeHistoryRow(raw: unknown, i: number): HistoryEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const message = String(r.message ?? r.sms ?? r.text ?? "");
  if (!message) return null;
  const is_phishing = Boolean(r.is_phishing ?? r.isPhishing ?? r.phishing);
  const label_ar = String(r.label_ar ?? r.labelAr ?? (is_phishing ? "تصيّد" : "آمن"));
  const risk_score = Number(r.risk_score ?? r.risk ?? 0);
  const detection_method = String(r.detection_method ?? r.method ?? "ml");
  const timestamp = String(r.timestamp ?? r.created_at ?? r.time ?? new Date().toISOString());
  const id = String(r.id ?? `${timestamp}-${i}`);
  return { id, message, is_phishing, label_ar, risk_score, detection_method, timestamp };
}

const TOOLTIP_STYLE = {
  backgroundColor: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  color: "var(--text-primary)",
  fontFamily: "var(--font-mono)",
  fontSize: "13px",
};

export function DashboardClient() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [statsPayload, setStatsPayload] = useState<Record<string, unknown> | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [s, h] = await Promise.all([fetchStats(), fetchHistory()]);
      if (cancelled) return;
      if (s.ok) setStatsPayload(s.stats as unknown as Record<string, unknown>);
      else setStatsPayload(null);
      if (h.ok) {
        const rows = h.history
          .map((x, i) => normalizeHistoryRow(x, i))
          .filter(Boolean) as HistoryEntry[];
        setHistory(rows);
      } else {
        setHistory([]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => normalizeStats(statsPayload ?? undefined), [statsPayload]);

  const filtered = useMemo(() => {
    if (filter === "phishing") return history.filter((x) => x.is_phishing);
    if (filter === "safe") return history.filter((x) => !x.is_phishing);
    return history;
  }, [filter, history]);

  const barData = useMemo(() => {
    const dist = stats.categoryDistribution;
    const entries = Object.entries(dist);
    if (entries.length) {
      return entries
        .map(([name, value]) => ({ name, value: Number(value) || 0 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    }

    // Fallback when /api/stats returns empty categories.
    const fromHistory = history
      .filter((x) => x.is_phishing)
      .reduce<Record<string, number>>((acc, row) => {
        const key = row.label_ar?.trim() || "تصيّد";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});
    const fallbackEntries = Object.entries(fromHistory);
    if (!fallbackEntries.length) return [{ name: "لا بيانات", value: 0 }];
    return fallbackEntries
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [history, stats.categoryDistribution]);

  const donutData = useMemo(() => {
    const p = stats.threats;
    const s = stats.clear;
    return [
      { name: "تصيد", value: p, color: "var(--danger)" },
      { name: "آمن", value: s, color: "var(--safe)" },
    ];
  }, [stats.clear, stats.threats]);

  const threatPct = stats.total ? (stats.threats / stats.total) * 100 : 0;
  const clearPct = stats.total ? (stats.clear / stats.total) * 100 : 0;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-10">
        <h1 className="text-sm font-semibold tracking-wide text-[var(--text-muted)]" dir="rtl">
          مركز الرصد الأمني
        </h1>
      </div>

      {loading ? (
        <div className="text-base text-[var(--text-muted)]" dir="rtl">
          جاري التحميل…
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="text-sm font-semibold text-[var(--text-dim)]" dir="rtl">
            الرسائل الممسوحة
          </div>
          <div className="mt-2 font-mono text-[32px] font-bold text-[var(--brand-light)] num-glow-purple">
            {stats.total.toLocaleString("en-US")}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="text-sm font-semibold text-[var(--text-dim)]" dir="rtl">
            التهديدات
          </div>
          <div className="mt-2 font-mono text-[32px] font-bold text-[var(--danger)] num-glow-red">
            {stats.threats.toLocaleString("en-US")}
          </div>
          <div className="mt-1 text-sm text-[var(--text-muted)]" dir="rtl">
            {threatPct.toFixed(1)}٪ من الإجمالي
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="text-sm font-semibold text-[var(--text-dim)]" dir="rtl">
            الرسائل الآمنة
          </div>
          <div className="mt-2 font-mono text-[32px] font-bold text-[var(--safe)] num-glow-green">
            {stats.clear.toLocaleString("en-US")}
          </div>
          <div className="mt-1 text-sm text-[var(--text-muted)]" dir="rtl">
            {clearPct.toFixed(1)}٪ من الإجمالي
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="text-sm font-semibold text-[var(--text-dim)]" dir="rtl">
            متوسط الخطر
          </div>
          <div className="mt-2 font-mono text-[32px] font-bold text-[var(--warning)] num-glow-amber">
            {stats.avgRisk.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="mb-3 text-sm font-semibold text-[var(--text-muted)]" dir="rtl">
            فئات التصيد
          </div>
          <div className="h-[320px] w-full min-w-0">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={barData}
                  margin={{ top: 16, right: 12, left: 8, bottom: 56 }}
                  barCategoryGap="35%"
                >
                  <CartesianGrid stroke="var(--border)" strokeOpacity={0.65} vertical={false} strokeDasharray="4 4" />
                  <XAxis
                    dataKey="name"
                    tick={{
                      fill: "var(--text-muted)",
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                    }}
                    interval={0}
                    angle={-22}
                    dy={6}
                    textAnchor="end"
                    height={68}
                    tickMargin={14}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    width={44}
                    tick={{
                      fill: "var(--text-muted)",
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                    }}
                    tickMargin={10}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" maxBarSize={72} radius={[8, 8, 0, 0]}>
                    {barData.map((_, idx) => (
                      <Cell key={idx} fill="var(--brand)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full" />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="mb-3 text-sm font-semibold text-[var(--text-muted)]" dir="rtl">
            تصيد مقابل آمن
          </div>
          <div className="relative h-[320px] w-full min-w-0">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Pie
                    data={donutData}
                    dataKey="value"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    stroke="var(--bg-card)"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full" />
            )}

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-2">
              <div className="font-mono text-[28px] font-bold text-[var(--text-primary)] num-glow-purple">
                {stats.total.toLocaleString("en-US")}
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--text-muted)]" dir="rtl">
                الإجمالي
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-10 border-t border-[var(--border)] pt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-[var(--text-muted)]" dir="rtl">
              سجل المسح
            </h2>
            <p className="mt-2 text-base text-[var(--text-secondary)]" dir="rtl">
              أحدث الرسائل أولاً.
            </p>
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="تصفية السجل">
            {(
              [
                ["all", "الكل"],
                ["phishing", "تصيد"],
                ["safe", "آمن"],
              ] as const
            ).map(([key, label]) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={[
                    "focus-ring rounded-xl px-3 py-2 text-sm font-semibold tracking-wide",
                    active
                      ? "border border-[color-mix(in_oklab,var(--brand)_45%,transparent)] bg-[color-mix(in_oklab,var(--brand)_14%,transparent)] text-[var(--brand-light)]"
                      : "border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)]",
                  ].join(" ")}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)]">
          {filtered.length ? (
            <ul className="divide-y divide-[var(--border)]">
              {filtered.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-3 bg-[var(--bg-card)] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div
                      className="mt-1 h-10 w-[3px] shrink-0 rounded-full"
                      style={{ background: row.is_phishing ? "var(--danger)" : "var(--safe)" }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-3">
                        <span className="font-mono text-[12px] text-[var(--brand-light)]">
                          {row.risk_score.toFixed(1)}
                        </span>
                        <span
                          className={row.is_phishing ? "text-[var(--danger)]" : "text-[var(--safe)]"}
                          dir="rtl"
                        >
                          {row.label_ar}
                        </span>
                      </div>
                      <div className="mt-2 truncate font-mono text-[11px] text-[var(--text-muted)]" dir="rtl" title={row.message}>
                        {row.message}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">
                    <span className="rounded-lg border border-[color-mix(in_oklab,var(--brand)_45%,transparent)] bg-[color-mix(in_oklab,var(--brand)_12%,transparent)] px-2 py-1 text-xs font-semibold text-[var(--brand-light)]">
                      {formatDetectionMethod(row.detection_method)}
                    </span>
                    <span className="text-xs text-[var(--text-dim)]" dir="ltr">
                      {new Date(row.timestamp).toLocaleString("en-US")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-base text-[var(--text-muted)]" dir="rtl">
              لا توجد سجلات بعد
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
