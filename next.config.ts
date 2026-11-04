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
        // Report-only: violations show in the browser console, nothing is blocked. Tighten after reviewing them.
        { key: "Content-Security-Policy-Report-Only", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.r2.dev https://*.googleusercontent.com; font-src 'self' data:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.r2.dev https://*.r2.cloudflarestorage.com; frame-src 'self' https://*.firebaseapp.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        { key: "Strict-Transport-Security", value: "max-age=31536000" },
        { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
      ],
    }];
  },
};

export default nextConfig;
