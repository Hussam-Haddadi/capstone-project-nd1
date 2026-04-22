import type { Metadata } from "next";
import { TwilioRelayClient } from "@/components/TwilioRelayClient";

export const metadata: Metadata = {
  title: "بث Twilio — ندّ",
  description: "اختبار مسار SMS → ندّ → واتساب (Twilio)",
};

export default function TwilioRelayPage() {
  return <TwilioRelayClient />;
}
