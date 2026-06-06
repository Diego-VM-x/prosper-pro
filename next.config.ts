import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  serverExternalPackages: ["tesseract.js"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
    unoptimized: true,
  },
  compress: true,
  poweredByHeader: false,
  output: "export",
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ["recharts", "firebase"],
  },
};

export default nextConfig;
