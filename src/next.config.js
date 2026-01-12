require('dotenv').config();

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
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
    // This makes the variable available to both client and server environments
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    
    // These are now fallbacks if the values are not in Firestore
    NEXT_PUBLIC_SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL,
    NEXT_PUBLIC_TELEGRAM_BOT_URL: process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    DADATA_API_KEY: process.env.DADATA_API_KEY,
    DADATA_API_SECRET: process.env.DADATA_API_SECRET,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,

    // Vercel Proxy Flag
    NEXT_PUBLIC_VERCEL_PROXY_URL: process.env.NEXT_PUBLIC_VERCEL_PROXY_URL,
    NEXT_PUBLIC_USE_PROXY: process.env.NEXT_PUBLIC_USE_PROXY,
  },
  poweredByHeader: false,
};

module.exports = nextConfig;
