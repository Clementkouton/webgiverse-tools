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
      // Lot 79 — les GROS CSV de skills dépassaient l'ancien plafond de
      // 4 Mo : l'import échouait avec « Body exceeded 4mb limit » (413).
      // 100 Mo = large marge pour un import en masse. NB : sur Vercel,
      // la plateforme plafonne de toute façon le corps des requêtes à
      // ~4,5 Mo — cette limite ne concerne que le développement local
      // (next dev) et tout hébergement qui ne rajoute pas de plafond.
      bodySizeLimit: "100mb",
      allowedOrigins: [
        "localhost:3000",
        "webgiverse-tools.vercel.app",
        "m51645tr-3000.euw.devtunnels.ms",
      ],
    },
    // Lot 79 — quand un middleware est présent (ici NextAuth sur
    // /admin/:path*), Next.js plafonne AUSSI le corps de requête à
    // 10 Mo par défaut : « Request body exceeded 10MB for /admin/import.
    // Only the first 10MB will be available unless configured ». On
    // aligne ce second plafond sur celui des Server Actions, sinon un
    // CSV de plus de 10 Mo serait tronqué AVANT d'atteindre l'action.
    middlewareClientMaxBodySize: "100mb",
  },
};

export default nextConfig;