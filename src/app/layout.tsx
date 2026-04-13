import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { RootClientShell } from "@/components/layout/RootClientShell";

// New Design System Fonts (Google Fonts)
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
  weight: "400",
  display: "swap",
  fallback: ["monospace"],
});

// Legacy fonts support (keep for backward compatibility)
const montserrat = localFont({
  src: [
    {
      path: "../../public/fonts/Montserrat-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Montserrat-Italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/Montserrat-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/Montserrat-MediumItalic.woff2",
      weight: "500",
      style: "italic",
    },
    {
      path: "../../public/fonts/Montserrat-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/Montserrat-SemiBoldItalic.woff2",
      weight: "600",
      style: "italic",
    },
    {
      path: "../../public/fonts/Montserrat-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/Montserrat-BoldItalic.woff2",
      weight: "700",
      style: "italic",
    },
    {
      path: "../../public/fonts/Montserrat-Black.woff2",
      weight: "900",
      style: "normal",
    },
    {
      path: "../../public/fonts/Montserrat-BlackItalic.woff2",
      weight: "900",
      style: "italic",
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
  title: "AI Сметчик",
  description: "AI-помощник для профессиональных сметчиков и монтажников.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AI Сметчик",
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
    <html lang="ru" suppressHydrationWarning>
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
