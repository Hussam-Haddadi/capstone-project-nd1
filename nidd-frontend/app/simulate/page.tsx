import type { Metadata } from "next";
import { LiveSimulationClient } from "@/components/LiveSimulationClient";

export const metadata: Metadata = {
  title: "محاكاة مباشرة — ندّ",
  description: "تصور حي لمسار الدفاع: مصدر التهديد، محرك ندّ، صندوق المستخدم المحمي.",
};

export default function SimulatePage() {
  return <LiveSimulationClient />;
}
