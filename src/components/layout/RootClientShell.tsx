"use client";

import { Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import { Gift } from "lucide-react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { AppProvider, useAppContext } from "@/contexts/AppContext";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { LiquidGlassFilter } from "@/components/ui/liquid-glass-filter";
import { StickyBanner } from "@/components/ui/sticky-banner";
import { Button } from "@/components/ui/button";
import { CookieConsentDialog } from "@/components/CookieConsentDialog";
import { NavigationLoader } from "@/components/ui/navigation-loader";
import { Toaster } from "@/components/ui/toaster";

function SiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSpecialPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/legal");
  const { setNavigating } = useAppContext();

  return (
    <div className="min-h-screen text-foreground overflow-x-hidden flex flex-col">
      {!isSpecialPage && (
        <>
          <div className="fixed inset-0 -z-20 bg-light-bg-primary dark:bg-dark-bg-primary" />
          <div className="fixed inset-0 -z-10">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-purple-600/10 dark:bg-purple-900/40 rounded-full opacity-50 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 dark:bg-blue-900/40 rounded-full opacity-50 blur-3xl" />
          </div>
        </>
      )}

      {!isSpecialPage && <Header />}

      <main className="flex-grow relative z-10">
        {!isSpecialPage && <CookieConsentDialog />}
        {pathname.startsWith("/dashboard") && (
          <StickyBanner storageKey="referral-banner">
            <span className="text-center sm:text-left">
              Пригласите друга и получите 100 кредитов!
            </span>
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="bg-white/10 text-white hover:bg-white/20"
            >
              <Link href="/dashboard/bonus" onClick={() => setNavigating(true)}>
                <Gift className="h-4 w-4 mr-1" /> Получить бонус
              </Link>
            </Button>
          </StickyBanner>
        )}
        {children}
      </main>

      {!isSpecialPage && <Footer />}
    </div>
  );
}

export function RootClientShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      if (!("serviceWorker" in navigator)) return;

      if (process.env.NODE_ENV !== "production") {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => registration.unregister());
        });
        return;
      }

      navigator.serviceWorker.register("/sw.js").catch(() => {});
    } catch {
      // Do not block page rendering if SW registration fails.
    }
  }, []);

  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <Suspense fallback={null}>
          <AppProvider>
            <LiquidGlassFilter />
            <SiteLayout>{children}</SiteLayout>
            <NavigationLoader />
            <Toaster />
          </AppProvider>
        </Suspense>
      </ThemeProvider>

      <Script id="telegram-game-proxy-fix" strategy="afterInteractive">
        {`
          if (typeof window !== 'undefined' && !window.TelegramGameProxy) {
            window.TelegramGameProxy = { receiveEvent: function() {} };
          }
        `}
      </Script>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="lazyOnload"
      />
    </SessionProvider>
  );
}
