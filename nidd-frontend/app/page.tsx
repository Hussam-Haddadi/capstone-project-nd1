import Image from "next/image";
import Link from "next/link";
import { AnimatedCounter, AnimatedTextCounter } from "@/components/AnimatedCounter";
import { ParticleField } from "@/components/ParticleField";

const WHY_NIDD = [
  {
    title: "حماية قبل وصول الرسالة",
    body: "ندّ يفحص الرسالة فورًا ويمنع المحتوى الخطر قبل أن يصل إلى المستخدم.",
  },
  {
    title: "استجابة سريعة جدًا",
    body: "تحليل بزمن منخفض مناسب للتشغيل المباشر داخل بيئات الاتصالات.",
  },
  {
    title: "مبني للرسائل العربية",
    body: "مصمم للتعامل مع أنماط التصيد المحلية وصيغ اللغة العربية بدقة أعلى.",
  },
] as const;

const CATCHES = [
  {
    en: "Brand Impersonation",
    ar: "انتحال علامة",
    pct: "25%",
    ex: "stc-secure.cc",
  },
  {
    en: "Reward Scams",
    ar: "احتيال جوائز",
    pct: "15%",
    ex: "مبروك فزت بجائزة!",
  },
  {
    en: "Delivery Scams",
    ar: "احتيال شحن",
    pct: "15%",
    ex: "شحنتك محتجزة",
  },
  {
    en: "Government",
    ar: "جهات رسمية",
    pct: "12%",
    ex: "أبشر: حدّث بياناتك",
  },
  {
    en: "Phone Scams",
    ar: "احتيال هاتفي",
    pct: "12%",
    ex: "تهديد أو إزعاج عبر الرقم",
  },
  {
    en: "Leetspeak",
    ar: "استبدال حروف",
    pct: "8%",
    ex: "za1n بدل zain",
  },
  {
    en: "URL Shortener",
    ar: "روابط مختصرة",
    pct: "8%",
    ex: "bit.ly/abc",
  },
  {
    en: "Social Engineering",
    ar: "هندسة اجتماعية",
    pct: "5%",
    ex: "No URL, no phone",
  },
] as const;

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl">
      <section className="relative -mx-4 flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center overflow-hidden px-4 py-16">
        <ParticleField className="absolute inset-0 h-full w-full" opacity={0.55} />

        <div className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
          <Image
            src="/logo-v2.png"
            alt="ندّ"
            width={240}
            height={240}
            priority
            className="h-auto w-[min(72vw,280px)] max-w-[280px] object-contain"
          />

          <h1 className="mt-8 text-[clamp(3.25rem,10vw,5.5rem)] font-bold leading-none text-[var(--text-primary)]" dir="rtl">
            ندّ
          </h1>

          <p className="mt-5 text-2xl font-bold text-[var(--text-secondary)] md:text-3xl" dir="rtl">
            الخصم الذكي لرسائل التصيد
          </p>

          <p className="mt-4 max-w-xl text-base text-[var(--text-muted)]" dir="rtl">
            كشف تصيد الرسائل النصية بالعربية — تعلم آلي وقواعد دفاعية.
          </p>

          <Link
            href="/scan"
            className="focus-ring mt-10 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[var(--brand-dark)] via-[var(--brand)] to-[color-mix(in_oklab,var(--accent-blue)_55%,var(--brand))] px-8 py-4 text-lg font-bold text-white shadow-[0_0_34px_color-mix(in_oklab,var(--brand)_45%,transparent)]"
            dir="rtl"
          >
            ابدأ التحليل
          </Link>

          <div className="mt-14 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[color-mix(in_oklab,var(--border)_90%,transparent)] bg-[color-mix(in_oklab,var(--bg-card)_75%,transparent)] px-5 py-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
              <div className="text-sm font-semibold text-[var(--text-dim)]" dir="rtl">
                الكشف
              </div>
              <div className="mt-2 font-mono text-[32px] font-bold text-[var(--safe)] num-glow-green">
                <AnimatedCounter value={99.6} decimals={1} suffix="%" />
              </div>
              <div className="mt-1 text-base text-[var(--text-secondary)]" dir="rtl">
                دقة رصد التصيد
              </div>
            </div>
            <div className="rounded-2xl border border-[color-mix(in_oklab,var(--border)_90%,transparent)] bg-[color-mix(in_oklab,var(--bg-card)_75%,transparent)] px-5 py-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
              <div className="text-sm font-semibold text-[var(--text-dim)]" dir="rtl">
                السرعة
              </div>
              <div className="mt-2 font-mono text-[32px] font-bold text-[color-mix(in_oklab,#38bdf8_85%,white)] num-glow-cyan">
                <AnimatedTextCounter text="<10ms" />
              </div>
              <div className="mt-1 text-base text-[var(--text-secondary)]" dir="rtl">
                زمن استجابة تقريبي
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-20 border-t border-[var(--border)] pt-16">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--text-muted)]" dir="rtl">
            لماذا ندّ؟
          </h2>
          <p className="text-3xl font-bold text-[var(--text-primary)]" dir="rtl">
            منصة دفاعية بمعيار مؤسسي
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {WHY_NIDD.map((c) => (
            <article
              key={c.title}
              className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition duration-200 hover:-translate-y-1 hover:border-[color-mix(in_oklab,var(--brand)_55%,transparent)] hover:shadow-[0_0_26px_color-mix(in_oklab,var(--brand)_18%,transparent)]"
            >
              <div className="border-t-2 border-[var(--brand)] pt-4">
                <h3 className="mt-3 text-xl font-bold text-[var(--text-primary)]" dir="rtl">
                  {c.title}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-[var(--text-secondary)]" dir="rtl">
                  {c.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-20 border-t border-[var(--border)] pt-16 pb-10">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--text-muted)]" dir="rtl">
            أنواع التهديدات
          </h2>
          <p className="text-3xl font-bold text-[var(--text-primary)]" dir="rtl">
            ماذا يكشف؟
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATCHES.map((x) => (
            <article
              key={x.en}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--brand)_35%,transparent)] hover:shadow-[0_12px_40px_-20px_color-mix(in_oklab,var(--brand)_22%,transparent)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="font-mono text-[12px] text-[var(--brand-light)]">{x.pct}</div>
              </div>
              <div className="mt-3">
                <div className="text-lg font-bold text-[var(--text-primary)]" dir="rtl">
                  {x.ar}
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[var(--bg-base)] px-3 py-2.5 text-sm text-[var(--text-muted)]" dir="rtl">
                {x.ex}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
