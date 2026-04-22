"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Menu, Moon, Sun, X } from "lucide-react";

const NAV = [
  { href: "/scan", label: "محرك ندّ", sym: "◎" },
  { href: "/simulate", label: "المحاكاة", sym: "✦" },
  { href: "/dashboard", label: "مركز الرصد الأمني", sym: "◫" },
  { href: "/twilio-relay", label: "بث Twilio", sym: "◇" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  /** يجب أن يطابق الخادم عند أول رسم لتفادي اختلاف الـ hydration؛ المزامنة من التخزين في useLayoutEffect */
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const active = useMemo(() => pathname, [pathname]);

  useLayoutEffect(() => {
    const stored = window.localStorage.getItem("nidd-theme");
    const resolved = stored === "light" ? "light" : "dark";
    setTheme(resolved);
    document.documentElement.dataset.theme = resolved;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("nidd-theme", nextTheme);
  }

  return (
    <header className="sticky top-0 z-50 min-h-16 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-base)_88%,transparent)] backdrop-blur-[16px]">
      <div className="relative mx-auto flex min-h-16 max-w-6xl items-center px-4 py-2">
        {/* شقّا يمين/يسار بنفس العرض يوازنان الشعار والأدوات؛ التنقل في المنتصف */}
        <div className="flex min-w-0 flex-1 items-center justify-start">
          <Link
            href="/"
            className="focus-ring flex min-w-0 max-w-[min(100%,20rem)] items-center gap-3 rounded-xl"
            aria-label="الصفحة الرئيسية — ندّ"
          >
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden sm:h-14 sm:w-14">
              <Image
                src="/logo-v2.png"
                alt=""
                width={56}
                height={56}
                priority
                className="max-h-full max-w-full object-contain"
              />
            </span>
            <span className="flex min-w-0 flex-col justify-center gap-0.5 leading-tight">
              <span className="block truncate text-base font-bold text-[var(--text-primary)]" dir="rtl">
                ندّ
              </span>
              <span className="block truncate text-[11px] font-medium tracking-wide text-[var(--text-muted)] sm:text-xs" dir="rtl">
                حماية من تصيد الرسائل النصية
              </span>
            </span>
          </Link>
        </div>

        <nav
          className="absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 md:flex lg:gap-1"
          aria-label="التنقل الرئيسي"
        >
          {NAV.map((item) => {
            const isActive = active === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "focus-ring flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-[11px] font-semibold tracking-wide lg:gap-2 lg:px-3 lg:text-xs",
                  isActive
                    ? "bg-[color-mix(in_oklab,var(--brand)_20%,transparent)] text-[var(--brand-light)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                ].join(" ")}
              >
                <span className="text-[var(--text-dim)]">{item.sym}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 md:flex" aria-label="حالة الاتصال بالخادم">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[var(--safe)] shadow-[0_0_12px_rgba(34,197,94,0.75)]"
              aria-hidden
            />
            <span className="text-xs font-medium tracking-wide text-[var(--text-muted)]">مباشر</span>
          </div>

          <button
            type="button"
            className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 text-[var(--text-secondary)]"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
            title={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="hidden text-xs font-semibold md:inline" dir="rtl">
              {theme === "dark" ? "فاتح" : "داكن"}
            </span>
          </button>

          <button
            type="button"
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] md:hidden"
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-[var(--border)] bg-[var(--bg-card)] md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col px-2 py-2">
            {NAV.map((item) => {
              const isActive = active === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={[
                    "focus-ring rounded-xl px-3 py-3 text-sm font-semibold tracking-wide",
                    isActive
                      ? "bg-[color-mix(in_oklab,var(--brand)_20%,transparent)] text-[var(--brand-light)]"
                      : "text-[var(--text-muted)]",
                  ].join(" ")}
                >
                  <span className="ml-2 text-[var(--text-dim)]">{item.sym}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </header>
  );
}
