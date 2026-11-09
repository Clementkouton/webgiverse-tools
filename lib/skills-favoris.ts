// lib/skills-favoris.ts
// ─────────────────────────────────────────────────────────────────
// Lot 43 — Lectures Prisma pour les favoris de skills épinglés et les
// retours d'usage. TOUTES les fonctions sont défensives : si la base
// n'est pas encore à jour (migration pas encore passée) ou si le
// client Prisma n'est pas régénéré, elles renvoient une valeur vide
// et JAMAIS d'exception : les pages restent affichables.
// ─────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";

const prismaAny = prisma as any;

function modelPrismaDisponible(modelName: string): boolean {
  return !!prismaAny?.[modelName] && typeof prismaAny[modelName]?.findMany === "function";
}

export type FavoriSkill = {
  id: string;
  creeLe: Date;
  skill: {
    id: string;
    slug: string;
    titre: string;
    description: string;
    categorie: string;
    image: string;
    imageAlt: string;
    vues: number;
  };
};

export type RetourAvecAuteur = {
  id: string;
  usage: string;
  resultat: string;
  note: number | null;
  creeLe: Date;
  user: { name: string | null; image: string | null };
};

export type MonRetour = {
  id: string;
  usage: string;
  resultat: string;
  note: number | null;
  creeLe: Date;
};

/** La skill est-elle épinglée par ce membre ? (défensif → false) */
export async function estEpingleSkill(
  userId: string | null | undefined,
  skillId: string,
): Promise<boolean> {
  if (!userId) return false;
  if (!modelPrismaDisponible("skillFavori") || typeof prismaAny.skillFavori.findUnique !== "function") return false;
  try {
    const favori = await prismaAny.skillFavori.findUnique({
      where: { userId_skillId: { userId, skillId } },
      select: { id: true },
    });
    return Boolean(favori);
  } catch {
    return false;
  }
}

/** « Mes skills favoris » : skills épinglées, du plus récent au plus ancien. */
export async function listerFavorisSkills(userId: string): Promise<FavoriSkill[]> {
  if (!modelPrismaDisponible("skillFavori")) return [];
  try {
    return (await prismaAny.skillFavori.findMany({
      where: { userId },
      orderBy: { creeLe: "desc" },
      select: {
        id: true,
        creeLe: true,
        skill: {
          select: {
            id: true,
            slug: true,
            titre: true,
            description: true,
            categorie: true,
            image: true,
            imageAlt: true,
            vues: true,
          },
        },
      },
    })) as FavoriSkill[];
  } catch {
    return [];
  }
}

/** Retours d'usage publiés sur une fiche skill (le plus récent d'abord). */
export async function listerRetoursSkill(
  skillId: string,
  limite = 8,
): Promise<RetourAvecAuteur[]> {
  if (!modelPrismaDisponible("skillRetour")) return [];
  try {
    return (await prismaAny.skillRetour.findMany({
      where: { skillId },
      orderBy: { creeLe: "desc" },
      take: limite,
      select: {
        id: true,
        usage: true,
        resultat: true,
        note: true,
        creeLe: true,
        user: { select: { name: true, image: true } },
      },
    })) as RetourAvecAuteur[];
  } catch {
    return [];
  }
}

/** Le retour d'usage que CE membre a déjà publié sur cette skill (ou null). */
export async function monRetourSkill(
  userId: string | null | undefined,
  skillId: string,
): Promise<MonRetour | null> {
  if (!userId) return null;
  if (!modelPrismaDisponible("skillRetour")) return null;
  try {
    return (await prismaAny.skillRetour.findUnique({
      where: { userId_skillId: { userId, skillId } },
      select: { id: true, usage: true, resultat: true, note: true, creeLe: true },
    })) as MonRetour | null;
  } catch {
    return null;
  }
}

/** « Mes retours d'usage » : retours publiés par le membre, avec la skill. */
export async function listerMesRetoursSkills(
  userId: string,
): Promise<
  {
    id: string;
    usage: string;
    resultat: string;
    note: number | null;
    creeLe: Date;
    skill: { slug: string; titre: string; categorie: string };
  }[]
> {
  if (!modelPrismaDisponible("skillRetour")) return [];
  try {
    return (await prismaAny.skillRetour.findMany({
      where: { userId },
      orderBy: { creeLe: "desc" },
      select: {
        id: true,
        usage: true,
        resultat: true,
        note: true,
        creeLe: true,
        skill: { select: { slug: true, titre: true, categorie: true } },
      },
    })) as {
      id: string;
      usage: string;
      resultat: string;
      note: number | null;
      creeLe: Date;
      skill: { slug: string; titre: string; categorie: string };
    }[];
  } catch {
    return [];
  }
}