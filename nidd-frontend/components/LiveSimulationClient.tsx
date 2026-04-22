"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ApiErrorHint } from "@/components/ApiErrorHint";
import { predictMessage } from "@/lib/api";
import { confidenceToPercent } from "@/lib/confidence";
import {
  Activity,
  Battery,
  Cpu,
  Link2,
  Radar,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SignalHigh,
  Skull,
  Sparkles,
  Wifi,
} from "lucide-react";

type Phase =
  | "idle"
  | "transmit_attack"
  | "analyze"
  | "block"
  | "deliver"
  | "error";

type VerdictBanner = {
  id: string;
  is_phishing: boolean;
  confidence_label: string;
  flags: string[];
  label_ar: string;
};

function shortPreview(s: string, max = 42) {
  const t = s.trim();
  if (t.length > max) return `${t.slice(0, max)}…`;
  return t;
}

/** Apple iPhone 17 Pro Max body (tech specs): width × height × depth (mm). */
const IPHONE_17_PRO_MAX_MM = { w: 78, h: 163.4, depth: 8.75 } as const;

/**
 * Proportional mockup: CSS `aspect-ratio` = width/height of device silhouette.
 * 3D: perspective parent + rotateY/rotateX on chassis, rim light, contact shadow.
 */
function IPhoneFrame({
  role,
  children,
}: {
  role: "attacker" | "subscriber";
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const isAttacker = role === "attacker";

  const chassisTilt = reduceMotion
    ? "none"
    : isAttacker
      ? "rotateY(-11deg) rotateX(3.5deg)"
      : "rotateY(11deg) rotateX(3.5deg)";

  const frameMetal = isAttacker
    ? [
        "border-[color-mix(in_oklab,var(--danger)_28%,#3a3a3c)]",
        "bg-[linear-gradient(165deg,#5c3d42_0%,#2a181c_22%,#151012_55%,#0d0a0b_100%)]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-8px_16px_rgba(0,0,0,0.35),0_32px_64px_-16px_rgba(0,0,0,0.65),0_12px_28px_rgba(239,68,68,0.12)]",
      ].join(" ")
    : [
        "border-[color-mix(in_oklab,var(--safe)_22%,#3a3a3c)]",
        "bg-[linear-gradient(165deg,#2d3834_0%,#161a18_25%,#0e100f_55%,#080a09_100%)]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-8px_16px_rgba(0,0,0,0.35),0_32px_64px_-16px_rgba(0,0,0,0.6),0_12px_28px_rgba(34,197,94,0.1)]",
      ].join(" ");

  const screenBg = isAttacker
    ? "bg-[linear-gradient(168deg,#1a0c10_0%,#070305_48%,#0c0608_100%)]"
    : "bg-[linear-gradient(168deg,#060a08_0%,#020302_48%,#08100c_100%)]";

  return (
    <div className="relative mx-auto flex w-full max-w-[360px] flex-col items-center overflow-visible px-2 pb-8 pt-4 [perspective:1600px] [perspective-origin:50%_28%]">
      {/* Ground contact shadow (3D depth cue) */}
      <div
        className="pointer-events-none absolute bottom-8 left-1/2 z-0 h-8 w-[min(82%,268px)] -translate-x-1/2 scale-y-[0.35] rounded-[50%] bg-black/60 blur-2xl"
        aria-hidden
      />

      <div
        className="relative z-10 w-[min(100%,318px)] origin-bottom [transform-style:preserve-3d]"
        style={{ transform: chassisTilt === "none" ? undefined : chassisTilt }}
      >
        <motion.div
          className="relative [transform-style:inherit]"
          animate={reduceMotion ? undefined : { y: [0, -3, 0] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Rim / specular highlight (titanium edge catch) */}
          <div
            className="pointer-events-none absolute -inset-[2px] z-[1] rounded-[3.05rem] opacity-70"
            style={{
              transform: "translateZ(18px)",
              background:
                "linear-gradient(125deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 18%, transparent 42%, transparent 58%, rgba(0,0,0,0.25) 100%)",
            }}
            aria-hidden
          />

          {/* Body: real width:height ratio 78 : 163.4 mm */}
          <div
            className={[
              "relative z-[2] overflow-hidden rounded-[2.95rem] border-[3px] p-[2.4%]",
              frameMetal,
            ].join(" ")}
            style={{
              aspectRatio: `${IPHONE_17_PRO_MAX_MM.w} / ${IPHONE_17_PRO_MAX_MM.h}`,
              width: "min(308px, calc(100vw - 2.5rem))",
            }}
          >
          {/* Chamfer catch-light (3D) */}
          <div
            className="pointer-events-none absolute inset-0 z-[3] rounded-[2.65rem] shadow-[inset_3px_0_10px_rgba(255,255,255,0.06),inset_-4px_0_14px_rgba(0,0,0,0.45)]"
            aria-hidden
          />

          {/* Side hardware (scaled to body) */}
          <div
            className={[
              "pointer-events-none absolute left-0 top-[22%] z-[4] h-[9%] w-[3px] -translate-x-[2px] rounded-l-sm",
              isAttacker ? "bg-[linear-gradient(180deg,#4a3035,#1f1214)]" : "bg-[linear-gradient(180deg,#2a3532,#121615)]",
            ].join(" ")}
            aria-hidden
          />
          <div
            className={[
              "pointer-events-none absolute left-0 top-[33%] z-[4] h-[13%] w-[3px] -translate-x-[2px] rounded-l-sm",
              isAttacker ? "bg-[linear-gradient(180deg,#4a3035,#1f1214)]" : "bg-[linear-gradient(180deg,#2a3532,#121615)]",
            ].join(" ")}
            aria-hidden
          />
          <div
            className={[
              "pointer-events-none absolute right-0 top-[27%] z-[4] h-[16%] w-[3px] translate-x-[2px] rounded-r-sm",
              isAttacker ? "bg-[linear-gradient(180deg,#4a3035,#1f1214)]" : "bg-[linear-gradient(180deg,#2a3532,#121615)]",
            ].join(" ")}
            aria-hidden
          />

          <div
            className={[
              "relative z-[5] flex h-full min-h-0 flex-col overflow-hidden rounded-[2.45rem] border border-black/60 ring-1 ring-white/[0.04]",
              screenBg,
            ].join(" ")}
          >
            {/* OLED glass reflection */}
            <div
              className="pointer-events-none absolute inset-0 z-[25] rounded-[2.45rem] bg-[linear-gradient(145deg,rgba(255,255,255,0.09)_0%,transparent_38%,transparent_62%,rgba(255,255,255,0.02)_100%)]"
              aria-hidden
            />

            {/* Dynamic Island — ~proportional to 17 Pro Max display */}
            <motion.div
              className="absolute left-1/2 top-[1.8%] z-30 h-[4.2%] min-h-[26px] w-[38%] min-w-[118px] max-w-[148px] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/[0.1]"
              style={{
                boxShadow:
                  "inset 0 -8px 14px rgba(0,0,0,0.9), inset 0 2px 4px rgba(80,80,90,0.15), 0 4px 12px rgba(0,0,0,0.55)",
              }}
              animate={
                isAttacker
                  ? { opacity: [0.92, 1, 0.92], x: [-0.5, 0.5, -0.5] }
                  : { opacity: [0.96, 1, 0.96] }
              }
              transition={{ duration: isAttacker ? 2.2 : 3.5, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden
            >
              <div className="absolute inset-x-[12%] top-[32%] h-[10%] min-h-[3px] rounded-full bg-[#252528]" />
            </motion.div>

            {/* Status bar */}
            <div className="relative z-20 flex h-[7.5%] min-h-[44px] shrink-0 items-end justify-between px-[4.5%] pb-1 pt-[2%]">
              <span
                className="select-none text-[clamp(13px,3.8vw,16px)] font-semibold leading-none tracking-[-0.03em] text-white"
                style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" }}
              >
                9:41
              </span>
              <div className="pointer-events-none w-[min(32%,120px)] shrink-0" aria-hidden />
              <div className="flex shrink-0 items-center gap-1 text-white">
                <SignalHigh className="h-[clamp(14px,4vw,17px)] w-[clamp(14px,4vw,17px)]" strokeWidth={2.25} aria-hidden />
                <Wifi className="h-[clamp(13px,3.8vw,16px)] w-[clamp(13px,3.8vw,16px)]" strokeWidth={2.25} aria-hidden />
                <Battery className="h-[clamp(12px,3.5vw,15px)] w-[clamp(20px,6vw,24px)]" strokeWidth={2.25} aria-hidden />
              </div>
            </div>

            <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden px-[3.5%] pb-[2%] pt-[1%]">
              {children}
            </div>

            <div className="relative z-20 flex shrink-0 justify-center pb-[1.8%] pt-1" aria-hidden>
              <div className="h-[5px] w-[34%] min-w-[104px] max-w-[134px] rounded-full bg-white/[0.24] shadow-[0_0_12px_rgba(255,255,255,0.08)]" />
            </div>
          </div>
          </div>
        </motion.div>
      </div>

    </div>
  );
}

function FiberChannel({
  variant,
  active,
  vertical,
}: {
  variant: "danger" | "safe" | "void";
  active: boolean;
  vertical?: boolean;
}) {
  const c =
    variant === "danger"
      ? "from-[color-mix(in_oklab,var(--danger)_0%,transparent)] via-[color-mix(in_oklab,var(--danger)_55%,transparent)] to-[color-mix(in_oklab,var(--danger)_0%,transparent)]"
      : variant === "safe"
        ? "from-[color-mix(in_oklab,var(--safe)_0%,transparent)] via-[color-mix(in_oklab,var(--safe)_55%,transparent)] to-[color-mix(in_oklab,var(--safe)_0%,transparent)]"
        : "from-[color-mix(in_oklab,var(--danger)_0%,transparent)] via-[color-mix(in_oklab,var(--danger)_70%,transparent)] to-[color-mix(in_oklab,var(--danger)_0%,transparent)]";

  return (
    <div
      className={[
        "pointer-events-none relative overflow-hidden rounded-full",
        vertical ? "h-full min-h-[120px] w-3" : "h-3 w-full min-w-[80px]",
        "border border-[color-mix(in_oklab,var(--border)_55%,transparent)] bg-[color-mix(in_oklab,var(--bg-elevated)_40%,transparent)]",
      ].join(" ")}
      aria-hidden
    >
      <div
        className={[
          "absolute inset-0 opacity-30",
          vertical
            ? `bg-gradient-to-b ${c}`
            : `bg-gradient-to-r ${c}`,
        ].join(" ")}
      />
      {active ? (
        <motion.div
          className={[
            "absolute rounded-full",
            vertical ? "left-0.5 h-8 w-2" : "top-0.5 h-2 w-14",
            variant === "safe"
              ? "bg-[color-mix(in_oklab,var(--safe)_85%,white)] shadow-[0_0_24px_rgba(34,197,94,0.85)]"
              : "bg-[color-mix(in_oklab,var(--danger)_85%,white)] shadow-[0_0_24px_rgba(239,68,68,0.85)]",
          ].join(" ")}
          initial={vertical ? { y: "-40%", opacity: 0 } : { x: "-30%", opacity: 0 }}
          animate={
            vertical
              ? { y: ["-40%", "140%"], opacity: [0, 1, 1, 0] }
              : { x: ["-30%", "130%"], opacity: [0, 1, 1, 0] }
          }
          transition={{ duration: 1.15, ease: "linear", repeat: Infinity, repeatDelay: 0.2 }}
        />
      ) : null}
      {active ? (
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: vertical
              ? "repeating-linear-gradient(180deg, transparent, transparent 6px, rgba(255,255,255,0.06) 7px)"
              : "repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(255,255,255,0.05) 11px)",
          }}
          animate={{ opacity: [0.25, 0.55] }}
          transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
        />
      ) : null}
    </div>
  );
}

function hash01(n: number, salt: number) {
  const x = Math.sin(n * 12.9898 + salt * 78.233) * 43758.5453123;
  return x - Math.floor(x);
}

function ShatterBurst({ show }: { show: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        rot: (360 / 14) * i + hash01(i, 1) * 18,
        dist: 40 + hash01(i, 2) * 70,
        delay: hash01(i, 3) * 0.08,
      })),
    [],
  );

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="pointer-events-none absolute inset-0 z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color-mix(in_oklab,var(--danger)_35%,transparent)] blur-2xl"
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1.6, opacity: [0, 1, 0] }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          />
          {pieces.map((p) => (
            <motion.span
              key={p.id}
              className="absolute left-1/2 top-1/2 h-2 w-6 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-gradient-to-r from-white/90 to-[var(--danger)]"
              initial={{ rotate: p.rot, x: 0, y: 0, opacity: 1 }}
              animate={{
                x: Math.cos((p.rot * Math.PI) / 180) * p.dist,
                y: Math.sin((p.rot * Math.PI) / 180) * p.dist,
                opacity: 0,
                rotate: p.rot + 40,
              }}
              transition={{ duration: 0.65, delay: p.delay, ease: "easeOut" }}
            />
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function ScanningEngine({
  active,
  reduceMotion,
  floatingPreview,
}: {
  active: boolean;
  reduceMotion: boolean;
  /** أثناء التحليل: تظهر داخل المربعات وتنتقل بينها */
  floatingPreview?: string | null;
}) {
  const steps = useMemo(
    () => [
      { key: "feat", label: "استخراج الخصائص", icon: Sparkles },
      { key: "url", label: "فحص الروابط", icon: Link2 },
      { key: "ml", label: "تشغيل النموذج", icon: Cpu },
      { key: "rules", label: "تطبيق القواعد", icon: Radar },
    ],
    [],
  );

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (active) setIdx(0);
  }, [active]);

  useEffect(() => {
    if (!active || reduceMotion) return undefined;
    const t = window.setInterval(() => {
      setIdx((v) => (v + 1) % steps.length);
    }, 580);
    return () => window.clearInterval(t);
  }, [active, reduceMotion, steps.length]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--brand)_45%,transparent)] bg-[color-mix(in_oklab,#0f0820_92%,transparent)] p-4 xl:rounded-[1.75rem] xl:border-2 xl:p-6 xl:shadow-[0_0_0_1px_color-mix(in_oklab,var(--brand)_20%,transparent),0_24px_80px_-28px_color-mix(in_oklab,var(--brand)_28%,transparent)]">
      <motion.div
        className="pointer-events-none absolute -inset-24 bg-[radial-gradient(circle_at_50%_40%,color-mix(in_oklab,var(--brand)_38%,transparent),transparent_62%)] xl:-inset-36 xl:bg-[radial-gradient(circle_at_50%_38%,color-mix(in_oklab,var(--brand)_48%,transparent),transparent_58%)]"
        animate={
          reduceMotion
            ? undefined
            : { opacity: [0.45, 0.9, 0.45], scale: [1, 1.05, 1] }
        }
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      {active && !reduceMotion ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl xl:rounded-[1.65rem]" aria-hidden>
          <motion.div
            className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--brand-light)] to-transparent shadow-[0_0_22px_rgba(167,139,250,0.9)] xl:h-[3px] xl:shadow-[0_0_32px_rgba(167,139,250,0.95)]"
            animate={{ top: ["0%", "100%"] }}
            transition={{ duration: 1.35, repeat: Infinity, ease: "linear" }}
          />
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute h-1 w-1 rounded-full bg-[var(--brand-light)] xl:h-1.5 xl:w-1.5"
              style={{ left: `${(i * 47) % 100}%`, top: `${(i * 31) % 100}%` }}
              animate={{ opacity: [0.1, 0.9, 0.1], y: [0, -10, 0] }}
              transition={{ duration: 1.2 + (i % 5) * 0.08, repeat: Infinity, delay: i * 0.04 }}
            />
          ))}
        </div>
      ) : null}

      <div className="relative flex items-start gap-3 xl:gap-5">
        <div className="relative">
          <motion.div
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[color-mix(in_oklab,var(--brand)_55%,transparent)] bg-[color-mix(in_oklab,var(--brand)_16%,transparent)] xl:h-[4.75rem] xl:w-[4.75rem] xl:rounded-3xl xl:border-2"
            animate={
              active && !reduceMotion
                ? {
                    boxShadow: [
                      "0 0 0 0 rgba(93,99,235,0)",
                      "0 0 0 16px rgba(93,99,235,0.14)",
                      "0 0 0 0 rgba(93,99,235,0)",
                    ],
                  }
                : undefined
            }
            transition={{ duration: 1.6, repeat: active ? Infinity : 0 }}
          >
            <Shield className="h-7 w-7 text-[var(--brand-light)] xl:h-10 xl:w-10" aria-hidden />
          </motion.div>
          {active ? (
            <motion.span
              className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[var(--brand-light)] xl:-right-1.5 xl:-top-1.5 xl:h-3.5 xl:w-3.5"
              animate={{ scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 0.9, repeat: Infinity }}
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold tracking-wide text-zinc-400 xl:text-base">
            محرك الدفاع الذكي
          </div>
          <div className="mt-1 text-sm font-bold text-zinc-50 xl:text-lg xl:leading-snug" dir="rtl">
            محرك ندّ المركزي
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300 xl:mt-3 xl:text-base xl:leading-relaxed" dir="rtl">
            يستقبل الرسالة قبل الهاتف، ويحلّلها في مسار موحّد: ميزات، روابط، تعلم آلي، ثم قواعد صارمة.
          </p>
        </div>
      </div>

      <LayoutGroup>
        <div
          className="relative mt-4 grid grid-cols-2 gap-2 xl:mt-6 xl:gap-3"
          dir="ltr"
        >
          {steps.map((s, i) => {
            const Icon = s.icon;
            const on = active && (reduceMotion ? i === 0 : i === idx);
            const showChip =
              Boolean(floatingPreview) &&
              active &&
              (reduceMotion ? i === 0 : i === idx);
            return (
              <div
                key={s.key}
                className={[
                  "relative flex min-h-[5.25rem] flex-col justify-between rounded-lg border px-2 py-2 xl:min-h-[5.75rem] xl:gap-2.5 xl:rounded-xl xl:px-3 xl:py-3",
                  on
                    ? "border-[color-mix(in_oklab,var(--brand)_55%,transparent)] bg-[color-mix(in_oklab,var(--brand)_14%,transparent)]"
                    : "border border-white/10 bg-black/30",
                ].join(" ")}
              >
                <div className="flex min-h-0 items-center gap-2">
                  <Icon
                    className={`h-4 w-4 shrink-0 xl:h-5 xl:w-5 ${on ? "text-[var(--brand-light)]" : "text-zinc-500"}`}
                  />
                  <span
                    className="truncate font-mono text-[9px] tracking-[0.08em] text-zinc-300 xl:text-[10px] xl:tracking-[0.1em]"
                    dir="rtl"
                  >
                    {s.label}
                  </span>
                </div>
                <div className="flex min-h-[30px] items-center justify-center xl:min-h-[34px]">
                  {showChip ? (
                    <motion.div
                      layoutId="nidd-preview-chip"
                      className="max-w-[min(100%,11rem)] truncate rounded-full border border-[color-mix(in_oklab,var(--danger)_55%,transparent)] bg-black/75 px-2.5 py-1 font-mono text-[9px] text-[var(--danger)] shadow-[0_0_16px_rgba(239,68,68,0.25)] xl:px-3 xl:py-1.5 xl:text-[10px]"
                      dir="auto"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 28,
                      }}
                    >
                      {floatingPreview}
                    </motion.div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </LayoutGroup>

      <div className="pointer-events-none absolute inset-0 mix-blend-screen" aria-hidden>
        <motion.div
          className="absolute inset-0 opacity-[0.07] xl:opacity-[0.09]"
          style={{
            backgroundImage:
              "linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.9) 50%, transparent 60%)",
            backgroundSize: "200% 200%",
          }}
          animate={active && !reduceMotion ? { backgroundPosition: ["0% 0%", "200% 200%"] } : undefined}
          transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </div>
  );
}

export function LiveSimulationClient() {
  const reduceMotion = useReducedMotion() ?? false;
  const [manualText, setManualText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [inflightPreview, setInflightPreview] = useState<string | null>(null);
  const [lastVerdict, setLastVerdict] = useState<VerdictBanner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inbox, setInbox] = useState<{ id: string; text: string; tag: VerdictBanner }[]>([]);
  const [blocked, setBlocked] = useState(0);
  const [delivered, setDelivered] = useState(0);
  /** يزيد فور بدء الإرسال (يظهر نشاطًا قبل انتهاء التحليل) */
  const [attemptCount, setAttemptCount] = useState(0);

  const runLock = useRef(false);

  const channels = useMemo(() => {
    return {
      attack: phase === "transmit_attack" || phase === "analyze" || phase === "block",
      safe: phase === "deliver",
      void: phase === "block",
    };
  }, [phase]);

  const runFlow = useCallback(
    async (rawMessage: string) => {
      const message = rawMessage.trim();
      if (!message || runLock.current) return;
      runLock.current = true;
      setError(null);
      setLastVerdict(null);
      setInflightPreview(shortPreview(message));
      setPhase("transmit_attack");
      setAttemptCount((n) => n + 1);
      // يُفرغ حقل المهاجم فور الإرسال (كأن الرسالة خرجت من الجهاز الأحمر)
      setManualText("");

      await new Promise((r) => window.setTimeout(r, reduceMotion ? 120 : 900));

      setPhase("analyze");
      const minAnalyze = reduceMotion ? 600 : 2400;
      const started = performance.now();
      const respP = predictMessage(message);

      const [resp] = await Promise.all([
        respP,
        new Promise<unknown>((r) => window.setTimeout(r, minAnalyze)),
      ]);
      const elapsed = performance.now() - started;
      if (elapsed < minAnalyze) {
        await new Promise((r) => window.setTimeout(r, minAnalyze - elapsed));
      }

      if (!resp.ok) {
        setError(resp.error);
        setPhase("idle");
        setInflightPreview(null);
        setManualText(message);
        runLock.current = false;
        return;
      }

      const result = resp.result;
      const banner: VerdictBanner = {
        id: `${Date.now()}`,
        is_phishing: result.is_phishing,
        confidence_label: confidenceToPercent(result.confidence),
        flags: result.flags,
        label_ar: result.label_ar,
      };
      setLastVerdict(banner);

      if (result.is_phishing) {
        setPhase("block");
        setBlocked((n) => n + 1);
        await new Promise((r) => window.setTimeout(r, reduceMotion ? 350 : 1200));
        setPhase("idle");
        setInflightPreview(null);
        runLock.current = false;
        return;
      }

      setPhase("deliver");
      setDelivered((n) => n + 1);
      setInbox((prev) => {
        const next = [{ id: banner.id, text: message, tag: banner }, ...prev];
        return next.slice(0, 6);
      });
      await new Promise((r) => window.setTimeout(r, reduceMotion ? 250 : 950));
      setPhase("idle");
      setInflightPreview(null);
      runLock.current = false;
    },
    [reduceMotion],
  );

  const busy = phase !== "idle";

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="relative overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--border)_55%,transparent)] bg-[var(--bg-base)] px-3 py-5 sm:px-5 sm:py-6 lg:px-6">
        {/* طبقة لون واحدة لشريط الإحصائيات + منطقة المحاكاة (بدون شريط أفقي مختلف) */}
        <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.32]">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 18% 12%, color-mix(in oklab, var(--danger) 14%, transparent), transparent 52%), radial-gradient(circle at 84% 16%, color-mix(in oklab, var(--safe) 12%, transparent), transparent 50%), radial-gradient(circle at 50% 58%, color-mix(in oklab, var(--brand) 15%, transparent), transparent 58%)",
            }}
          />
        </div>

        <div className="relative z-[1]">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[color-mix(in_oklab,var(--border)_70%,transparent)] bg-[color-mix(in_oklab,var(--bg-base)_92%,white)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            dir="rtl"
          >
            <span className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-[var(--text-muted)]">محاولات</span>
              <span className="min-w-[1.25rem] text-center font-mono text-base text-[var(--brand-light)] tabular-nums">
                {attemptCount}
              </span>
            </span>
            <span className="hidden text-[var(--text-dim)] sm:inline" aria-hidden>
              |
            </span>
            <span className="flex items-center gap-1.5">
              <span className="num-glow-red text-[var(--danger)]">{blocked}</span>
              <span className="text-xs text-[var(--text-dim)]">محظورة (تصيد)</span>
            </span>
            <span className="text-[var(--text-dim)]">/</span>
            <span className="flex items-center gap-1.5">
              <span className="num-glow-green text-[var(--safe)]">{delivered}</span>
              <span className="text-xs text-[var(--text-dim)]">مسلّمة (آمن)</span>
            </span>
          </div>
        </div>
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

      <div className="relative">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)_minmax(240px,320px)] lg:items-start lg:gap-4 lg:overflow-visible xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)_minmax(280px,360px)] xl:gap-6">
          {/* Attacker */}
          <div className="relative">
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="min-w-0">
                <span className="block text-sm font-semibold tracking-wide text-[var(--danger)]" dir="rtl">
                  تهديد · آيفون
                </span>
                <span className="mt-0.5 block text-sm text-[var(--text-muted)]" dir="rtl">
                  جهاز مهاجم (تصيّد)
                </span>
              </div>
              <Skull className="h-4 w-4 shrink-0 text-[color-mix(in_oklab,var(--danger)_70%,transparent)]" aria-hidden />
            </div>
            <IPhoneFrame role="attacker">
              <div className="flex min-h-0 flex-1 flex-col space-y-3">
                <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-[13px] font-semibold text-white/90" style={{ fontFamily: "system-ui, sans-serif" }}>
                    رسالة جديدة
                  </span>
                  <span className="rounded-full border border-[color-mix(in_oklab,var(--danger)_45%,transparent)] bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--danger)]">
                    SMS
                  </span>
                </div>
                <motion.div
                  animate={
                    reduceMotion
                      ? undefined
                      : { x: [0, -1, 1, -1, 0], textShadow: ["0 0 0 transparent", "0 0 12px rgba(239,68,68,0.35)", "0 0 0 transparent"] }
                  }
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  className="flex min-h-0 flex-1 flex-col rounded-2xl border border-[color-mix(in_oklab,var(--danger)_35%,transparent)] bg-black/40 px-3 py-2 text-[13px] leading-relaxed text-zinc-100"
                  dir="rtl"
                >
                    <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="…"
                    rows={4}
                    spellCheck={false}
                    disabled={busy}
                      dir="auto"
                    className="focus-ring min-h-[100px] w-full flex-1 resize-none rounded-xl bg-transparent text-[13px] text-zinc-100 placeholder:text-zinc-500 caret-zinc-100"
                    aria-label="رسالة المهاجم"
                  />
                </motion.div>
                <button
                  type="button"
                  disabled={busy || !manualText.trim()}
                  onClick={() => void runFlow(manualText)}
                  className="focus-ring w-full rounded-xl border border-[color-mix(in_oklab,var(--danger)_55%,transparent)] bg-[linear-gradient(90deg,color-mix(in_oklab,var(--danger)_22%,transparent),transparent)] py-2.5 text-sm font-bold text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  إرسال
                </button>
              </div>
            </IPhoneFrame>

            <div className="mx-auto mt-4 hidden w-[min(100%,320px)] lg:block">
              <FiberChannel variant="danger" active={channels.attack} />
            </div>
          </div>

          {/* Center column — pipes + engine between the two phones */}
          <div className="relative lg:flex lg:w-full lg:flex-col lg:items-center">
            <div className="mb-3 hidden w-full text-center text-sm font-semibold tracking-wide text-[var(--text-muted)] lg:mb-4 lg:block lg:text-base">
              مسار البيانات
            </div>

            <div className="relative w-full lg:max-w-[min(52rem,100%)] lg:px-2 xl:px-3">
              <svg
                className="pointer-events-none absolute left-0 right-0 top-[118px] hidden h-[228px] w-full overflow-visible lg:top-[128px] lg:block lg:h-[260px] xl:top-[136px] xl:h-[276px]"
                viewBox="0 0 900 220"
                preserveAspectRatio="none"
                aria-hidden
              >
                <defs>
                  {/* مسار الهجوم: من يمين اللوحة (جهة المهاجم) نحو الوسط — في الإحداثيات x=0 يسار، x=900 يمين */}
                  <linearGradient id="g-attack" x1="100%" y1="0%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="rgba(239,68,68,0.55)" />
                    <stop offset="50%" stopColor="rgba(239,68,68,0.45)" />
                    <stop offset="100%" stopColor="rgba(93,99,235,0.35)" />
                  </linearGradient>
                  <linearGradient id="g-safe" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(93,99,235,0.4)" />
                    <stop offset="50%" stopColor="rgba(34,197,94,0.5)" />
                    <stop offset="100%" stopColor="rgba(34,197,94,0.08)" />
                  </linearGradient>
                  <linearGradient id="g-void" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(239,68,68,0.15)" />
                    <stop offset="70%" stopColor="rgba(239,68,68,0.65)" />
                    <stop offset="100%" stopColor="rgba(239,68,68,0)" />
                  </linearGradient>
                </defs>
                <motion.path
                  d="M 860 128 C 700 48, 580 48, 450 118"
                  fill="none"
                  stroke="url(#g-attack)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  initial={{ pathLength: 0.22, opacity: 0.25 }}
                  animate={{
                    pathLength: channels.attack ? 1 : 0.22,
                    opacity: channels.attack ? 0.9 : 0.25,
                  }}
                  transition={{ duration: 0.6 }}
                />
                <motion.path
                  d="M 450 118 C 300 48, 160 48, 40 128"
                  fill="none"
                  stroke="url(#g-safe)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  initial={{ pathLength: 0.15, opacity: 0.2 }}
                  animate={{
                    pathLength: channels.safe ? 1 : 0.15,
                    opacity: channels.safe ? 0.95 : 0.2,
                  }}
                  transition={{ duration: 0.55 }}
                />
                <motion.path
                  d="M 450 132 C 430 178, 450 210, 450 210"
                  fill="none"
                  stroke="url(#g-void)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{
                    pathLength: channels.void ? 1 : 0,
                    opacity: channels.void ? 1 : 0.15,
                  }}
                  transition={{ duration: 0.45 }}
                />
              </svg>

              {/* إحداثيات الحركة ltr حتى يكون +x = يمين الشاشة و −x = يسار (مهاجم يمين → مستخدم يسار) */}
              <div className="pointer-events-none absolute inset-0 z-20 hidden lg:block" dir="ltr">
                <AnimatePresence>
                  {inflightPreview && phase === "transmit_attack" ? (
                    <motion.div
                      key="payload-a"
                      className="absolute right-[6%] top-[150px] z-30 max-w-[220px] truncate rounded-full border border-[color-mix(in_oklab,var(--danger)_55%,transparent)] bg-black/70 px-3 py-1 font-mono text-[10px] text-[var(--danger)] lg:right-[5%] lg:top-[160px] lg:max-w-[240px] lg:px-3.5 lg:py-1.5 lg:text-[11px] xl:top-[168px]"
                      initial={{ opacity: 0, x: 28 }}
                      animate={{ opacity: 1, x: -280 }}
                      transition={{ duration: reduceMotion ? 0.2 : 0.95, ease: "easeInOut" }}
                      dir="auto"
                    >
                      {inflightPreview}
                    </motion.div>
                  ) : null}
                  {inflightPreview && phase === "deliver" ? (
                    <motion.div
                      key="payload-b"
                      className="absolute left-[46%] top-[150px] z-30 max-w-[220px] truncate rounded-full border border-[color-mix(in_oklab,var(--safe)_55%,transparent)] bg-black/70 px-3 py-1 font-mono text-[10px] text-[var(--safe)] lg:left-[45%] lg:top-[160px] lg:max-w-[240px] lg:px-3.5 lg:py-1.5 lg:text-[11px] xl:top-[168px]"
                      initial={{ opacity: 0, x: 0 }}
                      animate={{ opacity: 1, x: -320 }}
                      transition={{ duration: reduceMotion ? 0.2 : 0.9, ease: "easeInOut" }}
                      dir="auto"
                    >
                      {inflightPreview}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="mx-auto w-full max-w-[520px] space-y-4 lg:max-w-none lg:space-y-5 2xl:space-y-6">
                <ScanningEngine
                  active={phase === "analyze"}
                  reduceMotion={reduceMotion}
                  floatingPreview={inflightPreview}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:gap-4">
                  <div className="relative overflow-hidden rounded-xl border border-[color-mix(in_oklab,var(--danger)_45%,transparent)] bg-[color-mix(in_oklab,#14050a_90%,transparent)] p-3 xl:rounded-2xl xl:p-4">
                    <div className="flex items-center gap-2 xl:gap-2.5">
                      <ShieldAlert className="h-4 w-4 text-[var(--danger)] xl:h-5 xl:w-5" />
                      <span className="text-xs font-semibold tracking-wide text-[var(--danger)] xl:text-sm" dir="rtl">
                        مصرف التهديدات
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-200 xl:mt-2.5 xl:text-base" dir="rtl">
                      مسار الإتلاف: الرسالة لا تُعاد إلى الشبكة العامة للمستخدم.
                    </p>
                    <ShatterBurst show={phase === "block" && !reduceMotion} />
                    <motion.div
                      className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(239,68,68,0.35),transparent_55%)]"
                      animate={phase === "block" ? { opacity: [0.2, 0.85, 0.35] } : { opacity: 0.08 }}
                      transition={{ duration: 0.45 }}
                    />
                  </div>

                  <div className="rounded-xl border border-[color-mix(in_oklab,var(--safe)_38%,transparent)] bg-[color-mix(in_oklab,#06140f_88%,transparent)] p-3 xl:rounded-2xl xl:p-4">
                    <div className="flex items-center gap-2 xl:gap-2.5">
                      <Activity className="h-4 w-4 text-[var(--safe)] xl:h-5 xl:w-5" />
                      <span className="text-xs font-semibold tracking-wide text-[var(--safe)] xl:text-sm" dir="rtl">
                        تسليم آمن
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-200 xl:mt-2.5 xl:text-base" dir="rtl">
                      عند أمان النتيجة، تُعاد الرسالة عبر قناة خضراء إلى صندوق الوارد المحمي.
                    </p>
                  </div>
                </div>

                <AnimatePresence>
                  {lastVerdict && phase !== "transmit_attack" ? (
                    <motion.div
                      key={lastVerdict.id}
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6 }}
                      className={[
                        "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-semibold tracking-wide xl:rounded-xl xl:px-4 xl:py-2.5 xl:text-sm",
                        lastVerdict.is_phishing
                          ? "border-[color-mix(in_oklab,var(--danger)_50%,transparent)] bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] text-[var(--danger)]"
                          : "border-[color-mix(in_oklab,var(--safe)_50%,transparent)] bg-[color-mix(in_oklab,var(--safe)_10%,transparent)] text-[var(--safe)]",
                      ].join(" ")}
                    >
                      <span className="flex items-center gap-2">
                        {lastVerdict.is_phishing ? (
                          <ShieldAlert className="h-4 w-4" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                        الحكم
                      </span>
                      <span dir="rtl" className="text-[11px] text-[var(--text-primary)] xl:text-xs">
                        {lastVerdict.label_ar}
                      </span>
                      <span className="text-[var(--text-muted)]" dir="rtl">
                        الثقة {lastVerdict.confidence_label}
                      </span>
                      <span className="text-[var(--text-dim)]" dir="rtl">
                        علامات {lastVerdict.flags.length}
                      </span>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            <div className="mx-auto mt-3 w-[min(100%,360px)] space-y-2 lg:hidden">
              <FiberChannel variant="danger" active={channels.attack} />
              <FiberChannel variant="safe" active={channels.safe} />
            </div>
          </div>

          {/* User */}
          <div className="relative">
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="min-w-0">
                <span className="block text-sm font-semibold tracking-wide text-[var(--safe)]" dir="rtl">
                  مستخدم · آيفون
                </span>
                <span className="mt-0.5 block text-sm text-[var(--text-muted)]" dir="rtl">
                  مشترك محمي بواسطة ندّ
                </span>
              </div>
              <ShieldCheck className="h-4 w-4 shrink-0 text-[color-mix(in_oklab,var(--safe)_70%,transparent)]" aria-hidden />
            </div>
            <IPhoneFrame role="subscriber">
              <div className="flex min-h-0 flex-1 flex-col space-y-2">
                <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="font-semibold text-[14px] text-white" style={{ fontFamily: "system-ui, sans-serif" }}>
                    الرسائل
                  </span>
                  <span className="rounded-full border border-[color-mix(in_oklab,var(--safe)_35%,transparent)] bg-[color-mix(in_oklab,var(--safe)_12%,transparent)] px-2 py-0.5 text-[10px] font-bold text-[var(--safe)]">
                    ندّ
                  </span>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-0.5">
                  <AnimatePresence initial={false}>
                    {inbox.length === 0 ? (
                      <div
                        className="rounded-[1.15rem] bg-white/[0.06] px-3 py-5 text-center text-[12px] text-zinc-400"
                        dir="rtl"
                      >
                        لا شيء بعد — الرسائل الآمنة تظهر هنا فقط.
                      </div>
                    ) : (
                      inbox.map((m) => (
                        <motion.div
                          key={m.id}
                          layout
                          initial={{ opacity: 0, y: 14, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ type: "spring", stiffness: 420, damping: 28 }}
                          className="rounded-[1.15rem] rounded-tr-sm bg-[#1c1c1e] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-semibold tracking-wide text-[var(--safe)]" dir="rtl">
                              مؤكد
                            </span>
                            <span className="font-mono text-[8px] text-zinc-500">
                              ثقة {m.tag.confidence_label}
                            </span>
                          </div>
                          <p className="mt-1 text-[12px] leading-snug text-[#f2f2f7]" dir="auto">
                            {shortPreview(m.text, 120)}
                          </p>
                          {m.tag.flags.length ? (
                            <p className="mt-1 font-mono text-[8px] text-zinc-500">
                              {m.tag.flags.slice(0, 3).join(" · ")}
                              {m.tag.flags.length > 3 ? "…" : ""}
                            </p>
                          ) : null}
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </IPhoneFrame>

            <div className="mx-auto mt-4 hidden w-[min(100%,320px)] lg:block">
              <FiberChannel variant="safe" active={channels.safe} />
            </div>
          </div>
        </div>
      </div>

        </div>
      </div>

    </div>
  );
}
