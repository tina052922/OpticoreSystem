import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {},
  transpilePackages: ["recharts"],
};

export default nextConfig;

