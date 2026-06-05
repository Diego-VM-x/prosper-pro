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
    unoptimized: true, // required for static export
  },
  compress: true,
  poweredByHeader: false,
  output: "export",
  // Experimental optimizations
  experimental: {
    optimizePackageImports: ["recharts", "firebase"],
  },
};

export default nextConfig;
