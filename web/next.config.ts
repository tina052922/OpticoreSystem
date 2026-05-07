import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  transpilePackages: ["recharts"],
  /** Use this app's directory as tracing root when a parent workspace has another lockfile. */
  outputFileTracingRoot: path.join(dir),
};

export default nextConfig;

