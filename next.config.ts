import type { NextConfig } from "next";

// ─────────────────────────────────────────────────────────────────
// Origines autorisées pour les Server Actions (formulaires, etc.).
// ⚠️ FORMAT OBLIGATOIRE : SANS https:// (host[:port] uniquement).
// L'ancien fichier contenait « https://webgiverse-tools.vercel.app »
// AVEC le préfixe → cette origine n'était JAMAIS reconnue.
// ─────────────────────────────────────────────────────────────────

const nextConfig: NextConfig = {
  // ───────────────────────────────────────────────────────────────
  // Header Referrer-Policy (article officiel YouTube — support.google.com/
  // youtube/answer/171780) : la lecture des vidéos intégrées exige que le
  // navigateur envoie un Referer au lecteur YouTube, sinon erreur 153.
  // « strict-origin-when-cross-origin » = politique par défaut des navigateurs,
  // rendue explicite ici pour garantir que l'origine est toujours transmise.
  // ───────────────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
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