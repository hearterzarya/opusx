import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {
    root: process.cwd(),
  },
  /**
   * Anthropic SDKs use `{baseUrl}/v1/messages`. Official docs use base `https://api.anthropic.com`
   * (no `/api`). Many users set `ANTHROPIC_BASE_URL=https://opusx.vercel.app` without `/api`, which
   * would hit `/v1/...` on the host root and miss `app/api/v1/...`. Rewrite so both layouts work.
   */
  async rewrites() {
    return [{ source: "/v1/:path*", destination: "/api/v1/:path*" }];
  },
};

export default nextConfig;
