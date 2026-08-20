import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  transpilePackages: ["recharts", "@react-pdf/renderer"],
  outputFileTracingRoot: path.join(dir),
  async rewrites() {
    const apiUrl = process.env.API_PROXY_URL ?? "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  // 🌟 Disable all caching for development
  headers: async () => [
    {
      source: "/api/:path*",
      headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
    },
  ],
};

export default nextConfig;
