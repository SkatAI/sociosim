import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Explicitly pin project root to avoid multi-lockfile warnings
    root: __dirname,
  },
};

export default nextConfig;
