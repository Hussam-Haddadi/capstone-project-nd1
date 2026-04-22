"use client";

import { motion, useInView, useMotionValueEvent, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function AnimatedCounter({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const spring = useSpring(0, { stiffness: 90, damping: 22, mass: 0.9 });
  const [text, setText] = useState("0");

  useEffect(() => {
    if (!inView) return;
    spring.set(0);
    spring.set(value);
  }, [inView, spring, value]);

  useMotionValueEvent(spring, "change", (v) => {
    setText(
      `${prefix}${v.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`,
    );
  });

  return (
    <span ref={ref} className={className}>
      <motion.span>{text}</motion.span>
    </span>
  );
}

export function AnimatedTextCounter({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  return (
    <span ref={ref} className={className}>
      <motion.span
        initial={{ opacity: 0, y: 6 }}
        animate={inView ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        {inView ? text : "0"}
      </motion.span>
    </span>
  );
}
