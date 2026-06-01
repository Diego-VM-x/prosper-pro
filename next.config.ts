import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(__dirname) },
  reactStrictMode: true,
  serverExternalPackages: ["tesseract.js"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
    unoptimized: true, // required for static export — no server-side image optimization
  },
  compress: true,
  poweredByHeader: false,
  output: "export",
  // Note: headers() is not supported with output: 'export'.
  // Security headers should be configured in the hosting platform (Vercel / Capacitor).
};

export default nextConfig;
