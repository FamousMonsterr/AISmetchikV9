import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { RootClientShell } from "@/components/layout/RootClientShell";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
  display: "swap",
  fallback: ["monospace"],
});

// Legacy fonts support — only Regular + Bold (others unused)
const montserrat = localFont({
  src: [
    {
      path: "../../public/fonts/Montserrat-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Montserrat-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-montserrat",
  display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

const bebasNeue = localFont({
  src: "../../public/fonts/Bebas/Bebas Neue.ttf",
  variable: "--font-bebas-neue",
  weight: "400",
  style: "normal",
  display: "swap",
  fallback: ["Impact", "Arial Narrow", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Montage HUB",
  description: "AI-помощник для профессиональных сметчиков и монтажников.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Montage HUB",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0F1419",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${montserrat.variable} ${bebasNeue.variable}`}
        suppressHydrationWarning
      >
        <RootClientShell>{children}</RootClientShell>
      </body>
    </html>
  );
}
