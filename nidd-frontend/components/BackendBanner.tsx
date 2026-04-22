"use client";

import { useBackendStatus } from "./BackendContext";

export function BackendBanner() {
  const { online } = useBackendStatus();

  if (online !== false) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-center text-sm text-[var(--warning)]"
      dir="rtl"
    >
      الخادم غير متصل — شغّل الـ API من مجلد الواجهة:{" "}
      <span className="font-mono text-[var(--text-secondary)]" dir="ltr">
        npm run dev:api
      </span>{" "}
      (يستمع على{" "}
      <span className="font-mono" dir="ltr">
        http://127.0.0.1:8000
      </span>
      )
    </div>
  );
}
