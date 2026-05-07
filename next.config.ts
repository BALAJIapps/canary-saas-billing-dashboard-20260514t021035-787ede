import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions are stable in 15; leave reasonable body size
    serverActions: { bodySizeLimit: "2mb" },
  },
  // Strict by default; agent edits that break this will fail typecheck
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
};

export default nextConfig;
