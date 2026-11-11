import type { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────
// app/api/logo/route.ts — Lot 63 · NOUVEAU
// Proxy d'images pour l'export PDF.
//
// POURQUOI CE FICHIER EST NÉCESSAIRE :
//   Pour dessiner un logo dans le PDF (jsPDF), le navigateur doit lire
//   les PIXELS de l'image via un <canvas>. Pour une image hébergée sur
//   un autre domaine (ex. le site de l'outil), le navigateur REFUSE
//   sauf si ce site envoie l'en-tête CORS « Access-Control-Allow-Origin »
//   — ce que 95 % des sites ne font pas. Résultat du lot 62 : les
//   logos retombaient sur les initiales.
//
//   La solution propre : ce proxy re-télécharge l'image CÔTÉ SERVEUR
//   (un serveur n'est jamais bloqué par CORS) puis la re-sert depuis
//   NOTRE domaine. Vue par le navigateur, l'image devient « même
//   origine » → le canvas peut la lire → le PDF affiche le VRAI logo.
//
// Utilisation : GET /api/logo?u=https%3A%2F%2Fexemple.com%2Flogo.png
//
// Sécurité (SSRF) : seules les URLs http(s) publiques sont acceptées ;
// localhost, les IP privées et les liens non-image sont refusés ;
// taille limitée à 3 Mo ; délai limité à 6 s.
// Aucune variable d'environnement, aucune migration.
// ─────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

const TAILLE_MAX = 3 * 1024 * 1024; // 3 Mo
const DELAI_MS = 6000; // 6 s

// Refuse les cibles internes (protection SSRF basique mais suffisante)
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

export async function GET(requete: NextRequest) {
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

  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), DELAI_MS);

  try {
    const rep = await fetch(cible.toString(), {
      signal: controleur.signal,
      redirect: "follow",
      headers: {
        // Un User-Agent de navigateur évite les blocages « bot » de
        // certains hébergeurs d'images.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/svg+xml,image/*;q=0.8",
      },
      cache: "no-store",
    });

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
  } catch {
    return new Response("Délai dépassé ou image inaccessible.", { status: 504 });
  } finally {
    clearTimeout(minuteur);
  }
}