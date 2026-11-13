import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { autoriserRequete } from "@/lib/limitation-debit"; // Lot 82

// ─────────────────────────────────────────────────────────────────
// app/api/logo/route.ts — Lot 63 · Proxy d'images pour l'export PDF.
//
// POURQUOI CE FICHIER EST NÉCESSAIRE :
//   Pour dessiner un logo dans le PDF (jsPDF), le navigateur doit lire
//   les PIXELS de l'image via un <canvas>. Pour une image hébergée sur
//   un autre domaine, le navigateur REFUSE sauf si ce site envoie
//   l'en-tête CORS — ce que 95 % des sites ne font pas. Ce proxy
//   re-télécharge l'image CÔTÉ SERVEUR puis la re-sert depuis NOTRE
//   domaine → l'image devient « même origine » → le PDF affiche le
//   VRAI logo.
//
// Utilisation : GET /api/logo?u=https%3A%2F%2Fexemple.com%2Flogo.png
//
// Lot 82 — SÉCURITÉ SSRF RENFORCÉE :
//   • session OBLIGATOIRE (l'export PDF est une page /dashboard) :
//     le site ne sert plus de proxy ouvert à tout Internet ;
//   • quota de 120 images par utilisateur et par heure (anti abus de
//     bande passante) ;
//   • LES REDIRECTIONS SONT MAINTENANT VÉRIFIÉES : l'ancien
//     `redirect: "follow"` faisait suivre les sauts SANS recontrôler
//     la cible — une URL externe pouvait rediriger vers
//     http://169.254.169.254/ (métadonnées cloud) ou une IP privée et
//     contourner toute la liste noire. Désormais chaque saut est
//     re-validé (3 redirections maximum) ;
//   • localhost, IP privées, IPv6 locales, identifiants dans l'URL :
//     refusés (inchangé) ; taille 3 Mo ; délai 6 s par saut.
// Limite résiduelle documentée : le DNS rebinding (domaine qui change
// d'IP entre la vérification et la connexion) n'est pas bloqué — il
// faudrait épingler l'IP résolue, ce qu'aucun runtime JS standard
// n'expose ; le risque reste très faible sur Vercel.
// ─────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TAILLE_MAX = 3 * 1024 * 1024; // 3 Mo
const DELAI_MS = 6000; // 6 s par saut
const MAX_REDIRECTIONS = 3;

// Refuse les cibles internes (protection SSRF)
function cibleInterdite(url: URL): boolean {
  if (url.protocol !== "http:" && url.protocol !== "https:") return true;
  if (url.username || url.password) return true;

  const h = url.hostname.toLowerCase().replace(/^\[|\]$/g, ""); // retire les crochets IPv6
  if (h === "localhost" || h === "0.0.0.0" || h === "::" || h === "::1") return true;
  if (h.endsWith(".local") || h.endsWith(".internal")) return true;
  // IPv4 privées / de lien local
  if (/^127\.\d+\.\d+\.\d+$/.test(h)) return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(h)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(h)) return true;
  if (/^169\.254\.\d+\.\d+$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(h)) return true;
  // IPv6 locales
  if (/^(fc|fd)[0-9a-f]{2}:/.test(h)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(h)) return true;
  return false;
}

const STATUTS_REDIRECTION = new Set([301, 302, 303, 307, 308]);

/** Télécharge l'image en suivant les redirections MANUELLEMENT :
 *  chaque saut est re-validé par cibleInterdite() avant la requête. */
async function telecharger(urlInitiale: URL): Promise<Response> {
  let url = urlInitiale;

  for (let saut = 0; saut <= MAX_REDIRECTIONS; saut++) {
    if (cibleInterdite(url)) {
      throw new Error("URL non autorisée.");
    }

    const reponse = await fetch(url.toString(), {
      // Lot 82 — redirections MANUELLES : on décide de chaque saut.
      redirect: "manual",
      signal: AbortSignal.timeout(DELAI_MS),
      headers: {
        // Un User-Agent de navigateur évite les blocages « bot » de
        // certains hébergeurs d'images.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/svg+xml,image/*;q=0.8",
      },
      cache: "no-store",
    });

    if (STATUTS_REDIRECTION.has(reponse.status)) {
      const location = reponse.headers.get("location");
      reponse.body?.cancel().catch(() => {});
      if (!location) {
        // 3xx sans destination : autant répondre tel quel.
        return reponse;
      }
      if (saut === MAX_REDIRECTIONS) {
        throw new Error("Trop de redirections.");
      }
      url = new URL(location, url); // relative → absolue, revalidée au tour suivant
      continue;
    }

    return reponse;
  }

  throw new Error("Trop de redirections.");
}

export async function GET(requete: NextRequest) {
  // ── Lot 82 — réservé aux membres connectés ──────────────────────
  const session = await auth();
  const utilisateurId = session?.user?.id;
  if (!utilisateurId) {
    return new Response("Connexion requise.", { status: 401 });
  }
  // Anti abus : 120 logos par utilisateur et par heure.
  if (!autoriserRequete(`logo:${utilisateurId}`, 120, 60 * 60_000)) {
    return new Response("Trop de demandes. Réessaie dans une heure.", { status: 429 });
  }

  const brut = requete.nextUrl.searchParams.get("u") ?? "";
  if (!brut || brut.length > 2048) {
    return new Response("Paramètre 'u' manquant ou trop long.", { status: 400 });
  }

  let cible: URL;
  try {
    cible = new URL(brut);
  } catch {
    return new Response("URL invalide.", { status: 400 });
  }
  if (cibleInterdite(cible)) {
    return new Response("URL non autorisée.", { status: 403 });
  }

  try {
    const rep = await telecharger(cible);

    if (!rep.ok) {
      return new Response("Image introuvable côté source.", { status: 502 });
    }

    const type = (rep.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!type.startsWith("image/")) {
      return new Response("La cible n'est pas une image.", { status: 415 });
    }

    const tampon = await rep.arrayBuffer();
    if (tampon.byteLength === 0) {
      return new Response("Image vide.", { status: 502 });
    }
    if (tampon.byteLength > TAILLE_MAX) {
      return new Response("Image trop lourde (max 3 Mo).", { status: 413 });
    }

    return new Response(tampon, {
      status: 200,
      headers: {
        "Content-Type": type,
        // Le navigateur (et le proxy Vercel) peut garder l'image une heure.
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : "";
    if (message === "URL non autorisée.") {
      return new Response("URL non autorisée.", { status: 403 });
    }
    if (message === "Trop de redirections.") {
      return new Response("Trop de redirections.", { status: 508 });
    }
    return new Response("Délai dépassé ou image inaccessible.", { status: 504 });
  }
}