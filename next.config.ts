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
  // Lot 82 — EN-TÊTES DE SÉCURITÉ sur toutes les pages.
  //   • Referrer-Policy : exigé par YouTube (erreur 153 des lecteurs
  //     intégrés sinon) — conservé du lot précédent.
  //   • X-Content-Type-Options: nosniff — empêche le navigateur de
  //     réinterpréter un fichier texte en HTML/JS.
  //   • X-Frame-Options: DENY — bloque le clickjacking (le site ne
  //     peut plus être encadré dans une iframe tierce invisible).
  //   • Permissions-Policy — ferme caméra/micro/géolocalisation,
  //     que le site n'utilise pas.
  //   • Strict-Transport-Security — le navigateur n'utilisera plus
  //     jamais HTTP pour ce site (ignoré sur localhost en http,
  //     sans effet en développement local).
  //
  // ⚠️ DEUX EXCEPTIONS VOLONTAIRES (la source exclut ces chemins) :
  //   • /api/embed/… → widget public DESTINÉ à être encadré par les
  //     sites clients (plan Entreprise) : il reçoit une CSP
  //     « frame-ancestors * » (X-Frame-Options n'a pas de valeur
  //     « autoriser tout le monde »).
  //   • /tarifs/retour et /paiement/retour → page de retour de
  //     paiement, conçue pour s'afficher DANS l'iframe Chariow quand
  //     le mode iframe du bouton sera réactivé (IFRAME_ACTIVEE).
  // ───────────────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/((?!api/embed/|tarifs/retour|paiement/retour).*)",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
      {
        // Widget d'intégration public : encadrable par n'importe quel site.
        source: "/api/embed/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
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