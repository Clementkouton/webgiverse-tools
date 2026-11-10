// app/api/v1/listes/route.ts
// ─────────────────────────────────────────────────────────────────
// Lot 57 — Niveau 3 Entreprise : idée 21 (API de lecture).
// GET /api/v1/listes
//   En-tête : Authorization: Bearer wg_xxxxxxxx…
//   Réponse : les listes PUBLIQUES du propriétaire de la clé
//   (nom, lien, nombre d'outils, date de partage).
// La clé est vérifiée par son hash SHA-256 ; rate limit simple en
// mémoire (30 appels par minute et par clé) ; CORS ouvert en
// lecture seule (c'est une API publique de consultation).
// ─────────────────────────────────────────────────────────────────

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const APPELS_MAX = 30;
const FENETRE_MS = 60_000;

/** Rate limit en mémoire : suffisant sur un seul serveur, sans
 *  dépendance. Les horodatages hors fenêtre sont purgés à l'appel. */
const appels = new Map<string, number[]>();
function rateLimitOk(cleId: string): boolean {
  const maintenant = Date.now();
  const horodatages = (appels.get(cleId) ?? []).filter(
    (t) => maintenant - t < FENETRE_MS
  );
  if (horodatages.length >= APPELS_MAX) {
    appels.set(cleId, horodatages);
    return false;
  }
  horodatages.push(maintenant);
  appels.set(cleId, horodatages);
  return true;
}

function reponseJson(corps: unknown, statut: number, entetesSupplementaires?: Record<string, string>) {
  return Response.json(corps, {
    status: statut,
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      ...entetesSupplementaires,
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization",
    },
  });
}

export async function GET(requete: Request) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // 1) Extraction de la clé du header Authorization.
  const entete = requete.headers.get("authorization") ?? "";
  const cle = entete.startsWith("Bearer ") ? entete.slice(7).trim() : "";
  if (!cle.startsWith("wg_") || cle.length < 10) {
    return reponseJson(
      { erreur: "Clé manquante ou invalide. Format attendu : Authorization: Bearer wg_…" },
      401
    );
  }

  // 2) Vérification par le hash (la clé en clair n'est pas stockée).
  const cleHash = createHash("sha256").update(cle).digest("hex");
  let cleApi: { id: string; userId: string; revoqueeLe: Date | null } | null = null;
  try {
    cleApi = await prisma.cleApi.findUnique({
      where: { cleHash },
      select: { id: true, userId: true, revoqueeLe: true },
    });
  } catch (erreur) {
    console.error("API v1 (base) :", erreur);
    return reponseJson({ erreur: "Service momentanément indisponible." }, 503);
  }
  if (!cleApi || cleApi.revoqueeLe) {
    return reponseJson({ erreur: "Clé inconnue ou révoquée." }, 401);
  }

  // 3) Rate limit (30 appels / minute / clé).
  if (!rateLimitOk(cleApi.id)) {
    return reponseJson(
      { erreur: "Trop d'appels : 30 requêtes par minute maximum." },
      429,
      { "Retry-After": "60" }
    );
  }

  // 4) Horodatage de la dernière utilisation (jamais bloquant).
  try {
    await prisma.cleApi.update({
      where: { id: cleApi.id },
      data: { derniereUtilisation: new Date() },
    });
  } catch {
    // statistique non essentielle
  }

  // 5) Listes publiques du propriétaire de la clé.
  try {
    const listes = await prisma.list.findMany({
      where: { userId: cleApi.userId, estPublique: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nom: true,
        slug: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    });
    return reponseJson(
      {
        listes: listes.map((liste) => ({
          nom: liste.nom,
          slug: liste.slug,
          url: `${base}/listes/${liste.slug ?? liste.id}`,
          nbOutils: liste._count.items,
          partageeLe: liste.createdAt.toISOString(),
        })),
      },
      200
    );
  } catch (erreur) {
    console.error("API v1 (listes) :", erreur);
    return reponseJson({ erreur: "Service momentanément indisponible." }, 503);
  }
}
