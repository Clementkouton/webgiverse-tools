import type { NextConfig } from "next";

// ─────────────────────────────────────────────────────────────────
// Origines autorisées pour les Server Actions (formulaires, etc.).
// ⚠️ FORMAT OBLIGATOIRE : SANS https:// (host[:port] uniquement).
// L'ancien fichier contenait « https://webgiverse-tools.vercel.app »
// AVEC le préfixe → cette origine n'était JAMAIS reconnue.
// ─────────────────────────────────────────────────────────────────

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.google.com", pathname: "/s2/favicons*" },
    ],
  },
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