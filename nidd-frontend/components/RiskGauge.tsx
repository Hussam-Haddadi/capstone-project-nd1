"use client";

import { animate } from "framer-motion";
import { useEffect, useId, useMemo, useState } from "react";

function confidenceColor(confidence: number): string {
  if (confidence >= 85) return "var(--safe)";
  if (confidence >= 65) return "var(--brand)";
  if (confidence >= 45) return "var(--warning)";
  return "var(--danger)";
}

function confidenceGlowClass(confidence: number): string {
  if (confidence >= 85) return "num-glow-green";
  if (confidence >= 65) return "num-glow-purple";
  if (confidence >= 45) return "num-glow-amber";
  return "num-glow-red";
}

export function RiskGauge({ confidence }: { confidence: number }) {
  const uid = useId().replace(/\W/g, "_");
  const r = 86;
  const c = 2 * Math.PI * r;
  const arcLen = (270 / 360) * c;

  const clamped = Math.max(0, Math.min(confidence, 100));
  const targetPct = clamped / 100;

  const [pct, setPct] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const ctrl = animate(0, targetPct, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (!cancelled) setPct(v);
      },
    });
    return () => {
      cancelled = true;
      ctrl.stop();
    };
  }, [targetPct]);

  const dash = `${Math.max(0.0001, pct) * arcLen} ${c}`;
  const color = useMemo(() => confidenceColor(clamped), [clamped]);
  const glow = useMemo(() => confidenceGlowClass(clamped), [clamped]);

  return (
    <div className="mt-6 flex flex-col items-center">
      <div className="relative h-[210px] w-[210px]">
        <svg
          viewBox="0 0 220 220"
          className="h-full w-full"
          aria-label={`Confidence ${confidence.toFixed(1)} percent`}
          role="img"
        >
          <defs>
            <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g transform="translate(110 110) rotate(135)">
            <circle
              r={r}
              fill="none"
              stroke="color-mix(in oklab, var(--border) 70%, transparent)"
              strokeWidth="14"
              strokeLinecap="butt"
              strokeDasharray={`${arcLen} ${c}`}
            />
            <circle
              r={r}
              fill="none"
              stroke={color}
              strokeWidth="14"
              strokeLinecap="butt"
              strokeDasharray={dash}
              filter={`url(#glow-${uid})`}
              style={{ transition: "stroke 0.35s ease" }}
            />
          </g>
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
          <div
            className={[
              "font-mono text-[44px] font-bold leading-none tracking-tight",
              glow,
            ].join(" ")}
          >
            {confidence.toFixed(1)}
          </div>
          <div className="mt-2 font-mono text-[10px] tracking-[0.45em] text-[var(--text-dim)]">
            درجة الثقة
          </div>
        </div>
      </div>
    </div>
  );
}
