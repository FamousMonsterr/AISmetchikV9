// @ts-nocheck
// src/app/layout.tsx
"use client";

import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, Montserrat } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/contexts/AppContext';
import { Toaster } from '@/components/ui/toaster';
import { Suspense, useEffect } from 'react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { LiquidGlassFilter } from '@/components/ui/liquid-glass-filter';
import { ThemeProvider } from "next-themes";
import { usePathname } from 'next/navigation';
import { StickyBanner } from '@/components/ui/sticky-banner';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Gift } from 'lucide-react';
import { CookieConsentDialog } from '@/components/CookieConsentDialog';
import Script from 'next/script';
import { SessionProvider } from 'next-auth/react';


const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-montserrat',
});

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  variable: '--font-bebas-neue',
  weight: "400"
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  shrinkToFit: 'no',
  viewportFit: 'cover',
  themeColor: '#0F1419'
};

const SiteLayout = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const isSpecialPage = pathname.startsWith('/dashboard') || pathname.startsWith('/auth') || pathname.startsWith('/legal');

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
                 {pathname.startsWith('/dashboard') && (
                    <StickyBanner storageKey="referral-banner">
                        <span>✨ Пригласите друга и получите 100 кредитов!</span>
                        <Button asChild variant="secondary" size="sm" className="ml-4 bg-white/10 text-white hover:bg-white/20">
                            <Link href="/dashboard/bonus"><Gift className="h-4 w-4 mr-1"/> Получить бонус</Link>
                        </Button>
                    </StickyBanner>
                )}
                {children}
            </main>

            {!isSpecialPage && <Footer />}
        </div>
    );
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  useEffect(() => {
    try {
        if ('serviceWorker' in navigator) {
          if (process.env.NODE_ENV !== 'production') {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
              registrations.forEach((registration) => registration.unregister());
            });
            return;
          }

          navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => console.log('Service Worker registered with scope:', registration.scope))
            .catch((error) => console.error('Service Worker registration failed:', error));
        }
    } catch (error) {
        console.error("Service worker registration failed in useEffect:", error)
    }
  }, []);

  return (
    <html lang="ru" suppressHydrationWarning>
       <head>
        <title>AI Сметчик</title>
        <meta name="description" content="AI-помощник для профессиональных сметчиков и монтажников." />
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AI Сметчик" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <Script id="telegram-game-proxy-fix" strategy="beforeInteractive">
          {`
            if (typeof window !== 'undefined' && !window.TelegramGameProxy) {
              window.TelegramGameProxy = {
                receiveEvent: function() {} // Mock function to prevent error
              };
            }
          `}
        </Script>
      </head>
      <body className={`${montserrat.variable} ${bebasNeue.variable}`} suppressHydrationWarning>
        <SessionProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem
            >
                <Suspense fallback={null}>
                    <AppProvider>
                        <LiquidGlassFilter />
                        <SiteLayout>
                            {children}
                        </SiteLayout>
                        <Toaster />
                    </AppProvider>
                </Suspense>
            </ThemeProvider>
        </SessionProvider>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
