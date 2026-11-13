// middleware.ts
import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";

const authentification = NextAuth(authConfig).auth;

/**
 * Lot 85 — CSP STRICTE AVEC NONCE sur les pages privées (/admin, /dashboard).
 *
 * Avant : ces pages partageaient la CSP statique des pages publiques
 * (next.config.ts), qui autorise 'unsafe-inline' pour les scripts —
 * un compromis imposé par l'hydratation de Next.js.
 *
 * Désormais : le middleware génère un NONCE (nombre aléatoire à usage
 * unique) pour chaque requête et l'annonce au navigateur. Seuls les
 * scripts portant exactement CE nonce s'exécutent : Next.js l'ajoute
 * automatiquement à ses propres balises <script> quand il trouve la
 * CSP dans les en-têtes de la requête. Un script injecté par un
 * attaquant (sans le nonce) est REFUSÉ par le navigateur, même si une
 * faille XSS inconnue venait à apparaître. La directive 'strict-dynamic'
 * laisse les scripts autorisés charger les chunks de code, sans
 * ré-autoriser quoi que ce soit d'autre.
 *
 * Ces pages étant déjà dynamiques (elles lisent la session), le nonce
 * ne leur coûte rien : aucun changement de rendu, aucun cache perdu.
 * Les pages publiques conservent la CSP statique de next.config.ts :
 * deux CSP se cumuleraient sinon (le navigateur appliquerait
 * l'INTERSECTION des deux politiques — le 'self' de l'une ne
 * compenserait jamais l'exigence de nonce de l'autre).
 *
 * L'ordre d'exécution est inchangé : `authentification(fn)` appelle
 * notre fonction SEULEMENT quand la session est validée (callback
 * `authorized` de auth.config.ts) ; sinon la redirection vers
 * /connexion part comme avant, sans passer par nous.
 */
export default authentification(async function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = politiqueCspPrivee(nonce);

  // Next.js lit la CSP de la REQUÊTE : il ajoute lui-même le nonce à
  // toutes les balises <script> qu'il rend (hydratation, chunks).
  const entetes = new Headers(request.headers);
  entetes.set("x-nonce", nonce);
  entetes.set("Content-Security-Policy", csp);

  const reponse = NextResponse.next({ request: { headers: entetes } });
  reponse.headers.set("Content-Security-Policy", csp);
  return reponse;
});

/** CSP stricte des pages privées — mêmes autorisations que la CSP
 *  publique (images, polices, YouTube, Chariow…), sauf les scripts :
 *  nonce + strict-dynamic au lieu de 'unsafe-inline'. */
function politiqueCspPrivee(nonce: string): string {
  const enDeveloppement = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    // 'strict-dynamic' : seuls les scripts portant le nonce s'exécutent,
    // et peuvent charger les chunks. 'self' et 'unsafe-inline' restent
    // listés UNIQUEMENT pour les vieux navigateurs (CSP2) qui ignorent
    // strict-dynamic : les navigateurs modernes les écartent dès qu'un
    // nonce est présent. 'unsafe-eval' en développement (rechargement
    // à chaud de React), retiré en production.
    `script-src 'self' 'unsafe-inline' 'nonce-${nonce}' 'strict-dynamic'${
      enDeveloppement ? " 'unsafe-eval'" : ""
    }`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    // Développement : rechargement à chaud via ws://localhost.
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
}

export const config = { matcher: ["/dashboard/:path*", "/admin/:path*"] };