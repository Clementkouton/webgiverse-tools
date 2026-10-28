import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.google.com", pathname: "/s2/favicons*" },
    ],
  },
  // ── Server Actions : origines autorisées ────────────────────────
  // Corrige l'erreur « Invalid Server Actions request » quand on navigue
  // tantôt sur le tunnel VS Code, tantôt sur localhost.
  // ⚠️ On écrit les origines SANS https:// (format host[:port]).
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "webgiverse-tools.vercel.app",
        "m51645tr-3000.euw.devtunnels.ms",
      ],
    },
  },
};

export default nextConfig;