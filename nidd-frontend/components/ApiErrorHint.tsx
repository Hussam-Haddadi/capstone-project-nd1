/** Extra hint when API is down or returns errors (local dev). */
export function ApiErrorHint({ message }: { message: string }) {
  const show =
    message.includes("500") ||
    message.includes("Network") ||
    message.toLowerCase().includes("fetch");
  if (!show) return null;
  return (
    <p className="mt-2 text-sm text-[var(--text-muted)]" dir="rtl">
      محليًا: من مجلد <span dir="ltr" className="font-mono">nidd-frontend</span> شغّل{" "}
      <span dir="ltr" className="font-mono">
        npm run dev:api
      </span>{" "}
      في طرفية منفصلة عن{" "}
      <span dir="ltr" className="font-mono">
        npm run dev
      </span>
      .
    </p>
  );
}
