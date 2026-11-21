import type { NextConfig } from "next";

// Static export — the site has no server-side work, and Cloudflare Pages just
// serves `out/` as files. Keeps the deploy step a plain upload.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // `next dev` would otherwise write AGENTS.md and CLAUDE.md into this folder.
  agentRules: false,
};

export default nextConfig;
