import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Explicitly pin project root to avoid multi-lockfile warnings
    root: __dirname,
  },
  // Generate the standalone output for production containers
  output: "standalone",
  outputFileTracingIncludes: {
    "/": ["docs/prompts/template_agent_system_prompt.md"],
  },
  // Prevent indexing by search engines and AI crawlers
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        {
          key: "X-Robots-Tag",
          value: "noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate",
        },
      ],
    },
  ],
};

export default nextConfig;
