export type FlagTone = "danger" | "warn" | "ok" | "info";

export function flagTone(flag: string, isPhishing: boolean): FlagTone {
  if (!isPhishing) return "ok";
  const f = flag.toLowerCase();
  if (
    /مشبوه|انتحال|تقليد|مختصر|leetspeak|شرطات|تصيد|نطاق|رابط\s*ب/.test(f)
  ) {
    return "danger";
  }
  if (/جوال|شخصي|سبام|خدمات|رقم|هاتف|إعلان/.test(f)) return "warn";
  return "info";
}

export function toneColor(tone: FlagTone): string {
  switch (tone) {
    case "danger":
      return "text-[var(--danger)]";
    case "warn":
      return "text-[var(--warning)]";
    case "ok":
      return "text-[var(--safe)]";
    default:
      return "text-[var(--brand-light)]";
  }
}
