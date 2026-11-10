// app/api/v1/listes/route.ts
// ─────────────────────────────────────────────────────────────────
// Lot 57 — idée 21 : la route API de lecture, protégée par clé
// d'API (voir /dashboard/cles-api). Elle ne demande PAS de session
// NextAuth : c'est tout l'intérêt d'une clé d'API (script, n8n,
// tableur…). Le middleware du projet ne protège que /dashboard et
// /admin : cette route est donc accessible, mais rien n'est lisible
// sans une clé valide.
//
//   GET /api/v1/listes
//   En-tête : Authorization: Bearer wg_…
//   Réponse 200 : { proprietaire, nbListes, listes: [...] }
//   Réponse 401 : clé absente, inconnue ou révoquée
//   Réponse 405 : autre méthode
//
// Lecture seule par conception : seule la méthode GET est exportée.
// Chaque appel met à jour « derniereUtilisation » de la clé (jamais
// bloquant).
// ─────────────────────────────────────────────────────────────────
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(requete: Request) {
  const entete = requete.headers.get("authorization") ?? "";
  const cle = entete.startsWith("Bearer ") ? entete.slice(7).trim() : null;

  if (!cle || !cle.startsWith("wg_")) {
    return Response.json(
      { erreur: "Clé d'API absente ou invalide. En-tête attendu : Authorization: Bearer wg_…" },
      { status: 401 }
    );
  }

  // La clé présentée est hachée puis comparée au hash stocké : une
  // fuite de la base ne révèle jamais aucune clé utilisable.
  const cleHash = createHash("sha256").update(cle).digest("hex");

  try {
    const cleApiModel = (prisma as any).apiKey ?? (prisma as any).cleApi;
    const cleApi = await cleApiModel.findUnique({
      where: { cleHash },
      select: { id: true, userId: true, nom: true, prefixe: true, revoqueeLe: true },
    });
    if (!cleApi || cleApi.revoqueeLe) {
      return Response.json({ erreur: "Clé inconnue ou révoquée." }, { status: 401 });
    }

    const listes = await prisma.list.findMany({
      where: { userId: cleApi.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nom: true,
        slug: true,
        estPublique: true,
        createdAt: true,
        items: {
          select: {
            tool: { select: { nom: true, slug: true, url: true, tarif: true, logo: true } },
          },
        },
      },
    });

    // Statistique d'usage de la clé (jamais bloquant).
    cleApiModel
      .update({
        where: { id: cleApi.id },
        data: { derniereUtilisation: new Date() },
      })
      .catch(() => { });

    return Response.json({
      proprietaire: cleApi.prefixe,
      nbListes: listes.length,
      listes: listes.map((liste) => ({
        id: liste.id,
        nom: liste.nom,
        slug: liste.slug,
        publique: liste.estPublique,
        creeLe: liste.createdAt,
        nbOutils: liste.items.length,
        outils: liste.items.map((item) => ({
          nom: item.tool.nom,
          slug: item.tool.slug,
          url: item.tool.url,
          tarif: item.tool.tarif,
          logo: item.tool.logo,
        })),
      })),
    });
  } catch (erreur) {
    console.error("API v1 (listes) :", erreur);
    return Response.json(
      { erreur: "Base indisponible — réessaie dans un instant." },
      { status: 500 }
    );
  }
}