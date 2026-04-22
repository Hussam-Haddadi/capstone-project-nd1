"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MessageSquare, Radio, Shield, Smartphone } from "lucide-react";
import { fetchTwilioRelayEvents, fetchTwilioRelayStatus } from "@/lib/twilioRelay";
import type { TwilioRelayEvent, TwilioRelayStatusPayload } from "@/lib/types";

const POLL_MS = 3500;

function statusLabelAr(status: string): string {
  const m: Record<string, string> = {
    received: "تم الاستلام",
    analyzing: "جاري التحليل",
    safe: "آمن",
    phishing: "تصيّد",
    forwarded: "تم التوجيه إلى واتساب",
    blocked: "محظور",
    failed: "فشل الإرسال",
  };
  return m[status] ?? status;
}

function predictionLabelAr(p: string | null): string {
  if (p === "safe") return "آمن";
  if (p === "phishing") return "تصيّد";
  return "—";
}

export function TwilioRelayClient() {
  const [statusPayload, setStatusPayload] = useState<TwilioRelayStatusPayload | null>(null);
  const [items, setItems] = useState<TwilioRelayEvent[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      const [s, e] = await Promise.all([fetchTwilioRelayStatus(), fetchTwilioRelayEvents()]);
      if (cancelled) return;
      if (!s.ok) setErr(s.error);
      else {
        setErr(null);
        setStatusPayload(s.data);
      }
      if (e.ok) setItems(e.items);
      else if (!s.ok) setErr((prev) => prev ?? e.error);
    }
    void tick();
    const id = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const latest = items[0] ?? null;
  const tw = statusPayload?.twilio;

  const configOk = Boolean(tw?.twilio_configured);
  const modelOk = Boolean(statusPayload?.model_loaded);

  const flowHint = useMemo(() => {
    if (!latest) return "في انتظار أول رسالة SMS…";
    if (latest.status === "analyzing" || latest.status === "received") return "المحرك يحلّل الرسالة…";
    if (latest.status === "blocked" || latest.prediction === "phishing")
      return "وصلت الرسالة إلى الموقع وتم تصنيفها كتصيّد — لن تُمرَّر إلى واتساب.";
    if (latest.status === "forwarded") return "تم تمرير الرسالة الآمنة إلى واتساب.";
    if (latest.status === "failed") {
      if (latest.forwarding_result === "signature_rejected")
        return "الرسالة وصلت لكن رُفض التحقق من Twilio — راجع PUBLIC_BASE_URL أو عطّل التحقق للتجربة.";
      if (latest.forwarding_result === "predict_error") return "خطأ أثناء تشغيل نموذج الكشف — راجع السجل أدناه.";
      if (latest.forwarding_result === "send_failed")
        return "الرسالة آمنة لكن فشل إرسال واتساب (راجع Sandbox والأرقام).";
      return "تعذّر إكمال المعالجة — راجع تفاصيل الخطأ في اللوحة.";
    }
    return "";
  }, [latest]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-2 border-b border-[var(--border)] pb-6">
        <p className="text-xs font-semibold tracking-wide text-[var(--brand-light)]">تجريبي — Twilio</p>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] md:text-3xl">بث SMS حي عبر ندّ</h1>
        <p className="max-w-3xl text-[var(--text-muted)]">
          أرسل SMS إلى رقم Twilio؛ يصل الطلب إلى الخادم، يمر عبر نموذج الحماية، ثم يُمرَّر إلى واتساب (Sandbox)
          إذا كانت الرسالة آمنة، أو يُحظر إذا وُجد تصيّد.
        </p>
        <p className="max-w-3xl text-xs leading-relaxed text-[var(--text-dim)]">
          متغير البيئة <span className="font-mono">TWILIO_WHATSAPP_FROM</span> يجب أن يكون{" "}
          <strong className="text-[var(--text-muted)]">رقم الإرسال من واتساب في Twilio</strong> (مثل رقم الـ Sandbox
          من Console → Messaging → WhatsApp sandbox)، وليس بالضرورة نفس رقم SMS إلا إذا كان ذلك الرقم مفعّلاً للواتساب
          في حسابك.
        </p>
      </header>

      {err ? (
        <div
          className="rounded-2xl border border-[color-mix(in_oklab,var(--danger)_45%,var(--border))] bg-[color-mix(in_oklab,var(--danger)_12%,var(--bg-card))] px-4 py-3 text-sm text-[var(--text-primary)]"
          role="alert"
        >
          تعذر الاتصال بالواجهة الخلفية: {err}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatusCard
          title="جاهزية Twilio"
          ok={configOk && !tw?.whatsapp_from_same_as_sms}
          detail={
            configOk
              ? tw?.whatsapp_from_same_as_sms
                ? "TWILIO_WHATSAPP_FROM نفس رقم SMS — غالباً خطأ"
                : "المتغيرات الأساسية مضبوطة"
              : tw?.missing_env?.length
                ? `ناقص: ${tw.missing_env.join(", ")}`
                : "غير مضبوط"
          }
        />
        <StatusCard
          title="نموذج ML"
          ok={modelOk}
          detail={modelOk ? "تم تحميل النموذج" : "وضع القواعد/احتياطي"}
        />
        <StatusCard
          title="مرسل واتساب (From)"
          ok={configOk && !tw?.whatsapp_from_same_as_sms}
          detail={tw?.whatsapp_from_preview || "—"}
        />
        <StatusCard
          title="هدف واتساب (إلى)"
          ok={configOk}
          detail={tw?.target_whatsapp_preview || "—"}
        />
        <StatusCard
          title="آخر حدث"
          ok={Boolean(latest)}
          detail={latest ? statusLabelAr(latest.status) : "لا يوجد بعد"}
        />
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 md:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
          <Radio className="h-5 w-5 text-[var(--brand-light)]" aria-hidden />
          مسار الرسالة
        </h2>
        <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between md:gap-2">
          <FlowNode
            icon={<Smartphone className="h-6 w-6" />}
            title="هاتفك (SMS)"
            subtitle={latest?.source_phone || "المرسل"}
            accent="var(--accent-blue)"
          />
          <ArrowLeft className="hidden h-6 w-6 shrink-0 text-[var(--text-dim)] md:block rtl:rotate-180" />
          <FlowNode
            icon={<Shield className="h-6 w-6" />}
            title="محرك ندّ"
            subtitle={flowHint}
            accent="var(--brand)"
          />
          <ArrowLeft className="hidden h-6 w-6 shrink-0 text-[var(--text-dim)] md:block rtl:rotate-180" />
          <FlowNode
            icon={<MessageSquare className="h-6 w-6" />}
            title="واتساب (Sandbox)"
            subtitle={tw?.target_whatsapp_preview || "المستلم"}
            accent="var(--safe)"
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 md:p-6">
          <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">أحدث رسالة</h2>
          {!latest ? (
            <p className="text-sm text-[var(--text-muted)]">لا توجد أحداث بعد. أرسل SMS إلى رقم Twilio.</p>
          ) : (
            <dl className="space-y-2 text-sm">
              <Row label="المرسل" value={latest.source_phone || "—"} />
              <Row label="النص" value={latest.body || "—"} mono />
              <Row label="التنبؤ" value={predictionLabelAr(latest.prediction)} />
              <Row label="الثقة" value={latest.confidence || "—"} />
              <Row label="الحالة" value={statusLabelAr(latest.status)} />
              <Row label="نتيجة التوجيه" value={latest.forwarding_result || "—"} />
              {latest.forwarding_error ? (
                <Row label="خطأ" value={latest.forwarding_error} danger />
              ) : null}
              <Row label="وقت الاستلام" value={latest.created_at} mono />
              <Row label="آخر تحديث" value={latest.updated_at} mono />
            </dl>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 md:p-6">
          <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">مؤشرات التحليل</h2>
          {!latest ? (
            <p className="text-sm text-[var(--text-muted)]">—</p>
          ) : (
            <ul className="list-inside list-disc space-y-1 text-sm text-[var(--text-secondary)]">
              {(latest.flags?.length ? latest.flags : ["لا مؤشرات"]).map((f, i) => (
                <li key={`${f}-${i}`}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 md:p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">سجل الرسائل</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-right text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="p-2 font-medium">الوقت</th>
                <th className="p-2 font-medium">المرسل</th>
                <th className="p-2 font-medium">مقتطف</th>
                <th className="p-2 font-medium">التنبؤ</th>
                <th className="p-2 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-[var(--text-muted)]">
                    لا سجل بعد
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="border-b border-[color-mix(in_oklab,var(--border)_70%,transparent)]">
                    <td className="p-2 font-mono text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {row.created_at.slice(11, 19)}
                    </td>
                    <td className="max-w-[140px] truncate p-2 font-mono text-xs">{row.source_phone}</td>
                    <td className="max-w-[200px] truncate p-2">{row.body}</td>
                    <td className="p-2">{predictionLabelAr(row.prediction)}</td>
                    <td className="p-2">{statusLabelAr(row.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-[var(--text-dim)]">يُحدَّث تلقائياً كل {POLL_MS / 1000} ثانية.</p>
      </section>
    </div>
  );
}

function StatusCard({ title, ok, detail }: { title: string; ok: boolean; detail: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${ok ? "bg-[var(--safe)]" : "bg-[var(--warning)]"}`}
          aria-hidden
        />
        <span className="text-xs font-semibold text-[var(--text-muted)]">{title}</span>
      </div>
      <p className="text-sm font-medium text-[var(--text-primary)]">{detail}</p>
    </div>
  );
}

function FlowNode({
  icon,
  title,
  subtitle,
  accent,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ color: accent }}>
        {icon}
      </span>
      <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
      <span className="text-xs leading-relaxed text-[var(--text-muted)]">{subtitle}</span>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  danger,
}: {
  label: string;
  value: string;
  mono?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="shrink-0 text-[var(--text-muted)]">{label}</dt>
      <dd
        className={[
          "min-w-0 flex-1",
          mono ? "font-mono text-xs" : "",
          danger ? "text-[var(--danger)]" : "text-[var(--text-primary)]",
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}
