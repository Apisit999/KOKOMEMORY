import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.STUDIO_ISOLATED_BUILD === "true" ? ".next-studio-local" : ".next",
  // Only the Docker image build asks for a self-contained server; local builds are unchanged.
  output: process.env.STUDIO_DOCKER_BUILD === "true" ? "standalone" : undefined,
  // Phone testing over the home Wi-Fi (scripts/studio-start-lan.mjs) only; empty for every normal run.
  allowedDevOrigins: process.env.STUDIO_LAN_HOST ? [process.env.STUDIO_LAN_HOST] : [],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-3017eb5d70cd44ddb3ce5b8a99508547.r2.dev",
      },
    ],
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        { key: "Strict-Transport-Security", value: "max-age=31536000" },
        { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
      ],
    }];
  },
};

export default nextConfig;
