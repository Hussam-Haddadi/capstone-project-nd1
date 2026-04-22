"use client";

import Image from "next/image";
import { useState } from "react";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0]!.slice(0, 2);
  const a = parts[0]![0] ?? "";
  const b = parts[1]![0] ?? "";
  return `${a}${b}`;
}

export function MemberAvatar({
  name,
  imageSrc,
  size = 96,
}: {
  name: string;
  imageSrc: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const showFallback = !imageSrc || failed;
  const initials = initialsFromName(name);

  if (showFallback) {
    return (
      <div
        className="flex shrink-0 aspect-square items-center justify-center rounded-full bg-gradient-to-br from-[color-mix(in_oklab,var(--brand)_55%,#1e1b4b)] to-[color-mix(in_oklab,var(--brand-dark)_70%,#0f172a)] text-lg font-bold text-white shadow-[0_0_24px_color-mix(in_oklab,var(--brand)_25%,transparent)]"
        style={{ width: size, height: size }}
        aria-hidden
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full shadow-[0_0_20px_rgba(0,0,0,0.35)]"
      style={{ width: size, height: size }}
    >
      <Image
        src={imageSrc}
        alt={`صورة ${name}`}
        fill
        sizes={`${size}px`}
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
