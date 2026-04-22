import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ندّ — كشف رسائل التصيد عبر الرسائل النصية",
  description: "منصة عربية لتحليل رسائل SMS والكشف عن التصيد باستخدام تعلم آلي وقواعد صارمة.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${arabic.variable} ${mono.variable} h-full`}
    >
      <body className={`${arabic.className} min-h-dvh text-[1.0625rem] leading-relaxed antialiased`}>
        <Script id="nidd-theme-init" strategy="beforeInteractive">
          {
            "(function(){try{var t=localStorage.getItem('nidd-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();"
          }
        </Script>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
