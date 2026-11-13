import type { NextConfig } from "next";

// ─────────────────────────────────────────────────────────────────
// Origines autorisées pour les Server Actions (formulaires, etc.).
// ⚠️ FORMAT OBLIGATOIRE : SANS https:// (host[:port] uniquement).
// L'ancien fichier contenait « https://webgiverse-tools.vercel.app »
// AVEC le préfixe → cette origine n'était JAMAIS reconnue.
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// Lot 84 — CONTENT-SECURITY-POLICY (CSP), en-tête de défense en
// profondeur : même si une injection HTML passait un jour à travers
// une faille inconnue, le navigateur REFUSERAIT d'exécuter un script
// qui ne vient pas du site, d'incorporer un <object>/<embed> tiers,
// de soumettre un formulaire vers un domaine pirate ou de détourner
// la balise <base>.
//
// Lot 85 — CETTE CSP STATIQUE ne couvre plus que les pages PUBLIQUES.
// Les pages privées (/admin, /dashboard) reçoivent du middleware.ts
// une CSP PLUS STRICTE avec nonce par requête (script-src nonce +
// strict-dynamic au lieu de 'unsafe-inline'). Les deux ne se cumulent
// PAS : le navigateur appliquerait l'intersection de deux politiques,
// et le bloc source ci-dessous exclut donc ces chemins. Exception
// volontaire : le path « admin » ne doit pas masquer /api/admin/…
// (le motif ne s'applique qu'en début de chemin).
//
// Choix de politique (conservateur, sans rien casser) :
//   • script-src 'self' 'unsafe-inline'  → Next.js a BESOIN de scripts
//     en ligne pour hydrater les pages ; la CSP bloque malgré tout les
//     scripts venant d'UN AUTRE DOMAINE (pirate.example/evil.js) et
//     les balises <object>/<embed>. (+ 'unsafe-eval' en développement :
//     exigé par le rechargement à chaud de React, retiré en prod.)
//   • style-src 'self' 'unsafe-inline'   → Tailwind et les styles
//     en ligne du site.
//   • img-src 'self' data: blob: https:  → favicons Google, logos des
//     outils hébergés chez eux, QR codes en data:…
//   • font-src 'self' data:              → polices auto-hébergées
//     (aucun Google Fonts externe).
//   • connect-src 'self'                 → le navigateur ne peut plus
//     envoyer de données (fetch/XHR) vers un domaine tiers.
//   • frame-src YouTube                  → seuls les lecteurs YouTube
//     (www.youtube.com / www.youtube-nocookie.com) peuvent être
//     incorporés — plus aucune autre iframe externe. Chariow est
//     pré-autorisé pour le futur mode iframe du bouton de paiement.
//   • object-src 'none' ; base-uri 'self' ; form-action 'self'.
//   • frame-ancestors 'self'             → équivalent moderne du
//     X-Frame-Options: DENY déjà présent (double barrière).
//   • upgrade-insecure-requests (prod)   → toute sous-ressource http://
//     est automatiquement réessayée en https://.
//
// Les EXCLUSIONS existantes restent inchangées : /api/embed/… (widget
// destiné à être encadré par les sites clients, avec sa CSP propre
// « frame-ancestors * ») ainsi que /tarifs/retour et /paiement/retour
// (page de retour conçue pour l'iframe Chariow).
// ─────────────────────────────────────────────────────────────────

const enDeveloppement = process.env.NODE_ENV === "development";

const POLITIQUE_CSP = [
  "default-src 'self'",
  enDeveloppement
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Développement : le rechargement à chaud de Next.js passe par
  // ws://localhost — autorisé uniquement hors production.
  enDeveloppement
    ? "connect-src 'self' ws: http://localhost:* http://127.0.0.1:*"
    : "connect-src 'self'",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://*.chariow.com",
  "media-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(enDeveloppement ? [] : ["upgrade-insecure-requests"]),
].join("; ");

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
  //   • Content-Security-Policy — deux blocs distincts (voir le
  //     Lot 85 ci-dessus) : statique pour les pages publiques,
  //     avec nonce par requête pour /admin et /dashboard (middleware).
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
        // En-têtes de base sur TOUTES les pages (CSP exclue : elle est
        // posée par les deux blocs suivants, contextes distincts).
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
        // Lot 85 — CSP statique des PAGES PUBLIQUES. /admin et
        // /dashboard reçoivent du middleware une CSP plus stricte
        // (nonce + strict-dynamic) : ne pas les couvrir ici, deux CSP
        // se cumuleraient et l'intersection bloquerait Next.js.
        // Le motif « admin|dashboard » ne s'applique qu'au DÉBUT du
        // chemin : /api/admin/… continue de recevoir cette CSP.
        source: "/((?!api/embed/|tarifs/retour|paiement/retour|admin|dashboard).*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: POLITIQUE_CSP,
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