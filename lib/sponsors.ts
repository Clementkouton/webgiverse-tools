// lib/sponsors.ts
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Slots sponsorisés : sélection du bandeau « À la une »
// courant (accueil ou catégorie), comptage des impressions.
// ─────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";

// Valeurs de l'enum Prisma utilisées ici, même si le client généré ne l'exporte pas.
type EmplacementSponsor = "ACCUEIL" | "CATEGORIE";

// Le client Prisma utilisé ici peut ne pas exposer encore le délégué Sponsor
// dans ses types générés.
const prismaAvecSponsors = prisma as unknown as {
  sponsor: {
    findFirst(args: {
      where: Record<string, unknown>;
      orderBy: { creeLe: "asc" };
      select: { id: true; titre: true; description: true; url: true; imageUrl: true };
    }): Promise<{
      id: string;
      titre: string;
      description: string;
      url: string;
      imageUrl: string | null;
    } | null>;
    update(args: {
      where: { id: string };
      data: { impressions?: { increment: number }; clics?: { increment: number } };
      select?: { url: true };
    }): Promise<{ url?: string }>;
  };
};

export type SponsorPublic = {
  id: string;
  titre: string;
  description: string;
  /** URL de clic trackée (route /api/sponsors/[id]/clic). */
  urlTracking: string;
  imageUrl: string | null;
};

/** Sponsor actuellement diffusé pour un emplacement, ou null. */
export async function sponsorActif(parametres: {
  emplacement: EmplacementSponsor;
  categorieId?: string | null;
}): Promise<SponsorPublic | null> {
  const maintenant = new Date();
  const sponsor = await prismaAvecSponsors.sponsor.findFirst({
    where: {
      actif: true,
      emplacement: parametres.emplacement,
      ...(parametres.emplacement === "CATEGORIE"
        ? { categorieId: parametres.categorieId ?? "___aucune___" }
        : {}),
      debutLe: { lte: maintenant },
      finLe: { gte: maintenant },
    },
    orderBy: { creeLe: "asc" },
    select: { id: true, titre: true, description: true, url: true, imageUrl: true },
  });
  if (!sponsor) return null;
  return {
    id: sponsor.id,
    titre: sponsor.titre,
    description: sponsor.description,
    urlTracking: `/api/sponsors/${sponsor.id}/clic`,
    imageUrl: sponsor.imageUrl,
  };
}

/** Compte une impression (appelé par la route /api/sponsors/actif). */
export async function compterImpression(sponsorId: string) {
  await prismaAvecSponsors.sponsor
    .update({ where: { id: sponsorId }, data: { impressions: { increment: 1 } } })
    .catch(() => null);
}

/** Compte un clic puis renvoie l'URL de destination (route clic). */
export async function enregistrerClic(sponsorId: string): Promise<string | null> {
  const sponsor = await prismaAvecSponsors.sponsor.update({
    where: { id: sponsorId },
    data: { clics: { increment: 1 } },
    select: { url: true },
  });
  return sponsor?.url ?? null;
}
