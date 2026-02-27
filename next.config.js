require('dotenv').config();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    instrumentationHook: true,
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_TELEGRAM_BOT_URL: process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL,
    NEXT_PUBLIC_VERCEL_PROXY_URL: process.env.NEXT_PUBLIC_VERCEL_PROXY_URL,
    NEXT_PUBLIC_USE_PROXY: process.env.NEXT_PUBLIC_USE_PROXY,
    NEXT_PUBLIC_REALTIME_MODE: process.env.NEXT_PUBLIC_REALTIME_MODE,
  },
  poweredByHeader: false,
};

module.exports = nextConfig;
