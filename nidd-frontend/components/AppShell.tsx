import { BackendBanner } from "./BackendBanner";
import { BackendProvider } from "./BackendContext";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <BackendProvider>
      <div className="flex min-h-dvh flex-col">
        <BackendBanner />
        <SiteHeader />
        <main className="mx-auto w-full flex-1 px-4 py-8">{children}</main>
        <SiteFooter />
      </div>
    </BackendProvider>
  );
}
