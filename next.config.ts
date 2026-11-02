import type { NextConfig } from "next";

// ─────────────────────────────────────────────────────────────────
// Origines autorisées pour les Server Actions (formulaires, etc.).
// ⚠️ FORMAT OBLIGATOIRE : SANS https:// (host[:port] uniquement).
// L'ancien fichier contenait « https://webgiverse-tools.vercel.app »
// AVEC le préfixe → cette origine n'était JAMAIS reconnue.
// ─────────────────────────────────────────────────────────────────

const nextConfig: NextConfig = {
  // ───────────────────────────────────────────────────────────────
  // Redirection des anciennes URL de métiers au singulier
  // (/prompts/role/consultants) vers la route réelle au pluriel
  // (/prompts/roles/consultants). 302 temporaire : si un ancien
  // lien, un signet ou une page indexée utilise le singulier, le
  // visiteur arrive quand même sur la bonne page au lieu d'un 404.
  // ───────────────────────────────────────────────────────────────
  async redirects() {
    return [
      {
        source: "/prompts/role/:slug",
        destination: "/prompts/roles/:slug",
        permanent: false,
      },
    ];
  },
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
      // Par défaut Next.js plafonne les Server Actions à 1 Mo : un CSV
      // de 1 à 2 Mo échouait avec « Body exceeded 1 MB limit ».
      bodySizeLimit: "4mb",
      allowedOrigins: [
        "localhost:3000",
        "webgiverse-tools.vercel.app",
        "m51645tr-3000.euw.devtunnels.ms",
      ],
    },
  },
};

export default nextConfig;
