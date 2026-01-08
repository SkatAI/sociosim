import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Explicitly pin project root to avoid multi-lockfile warnings
    root: __dirname,
  },
  // Generate the standalone output for production containers
  output: "standalone",
  experimental: {
    outputFileTracingIncludes: {
      "/": ["docs/prompts/template_agent_system_prompt.md"],
    },
  },
};

export default nextConfig;
