import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.BUILD_TARGET === 'android' ? 'export' : undefined,
  reactStrictMode: true,
  serverExternalPackages: ['tesseract.js'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  compress: true,
  poweredByHeader: false,
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
      ],
    },
  ],
};

export default nextConfig;
