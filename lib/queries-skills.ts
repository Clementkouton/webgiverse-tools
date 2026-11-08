// lib/queries-skills.ts
// ─────────────────────────────────────────────────────────────────
// Lot 38 — requêtes Prisma de la bibliothèque de Skills.
// · listerSkills : grille paginée (12 par page) + recherche + catégorie
//   — renvoie { skills, total, page, pages } comme listerTutos.
// · obtenirSkill : une fiche par slug (null si inexistante).
// · categoriesSkills : catégories FR réellement utilisées + compteurs.
// · compterSkillsStats : total pour le héros de la page.
// Défensif : table absente → listes vides (jamais de crash).
// ─────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";
import type { Skill } from "@prisma/client";

const PAR_PAGE = 12;

export type FiltresSkills = {
  q?: string;
  categorie?: string;
  page?: number;
};

function propre(valeur: string | undefined | null): string {
  return (valeur ?? "").trim();
}

/** Liste paginée des skills — la page est bornée au nombre réel de pages. */
export async function listerSkills(
  filtres: FiltresSkills = {},
): Promise<{ skills: Skill[]; total: number; page: number; pages: number }> {
  const q = propre(filtres.q).slice(0, 80);
  const categorie = propre(filtres.categorie);
  const where = {
    ...(q
      ? {
          OR: [
            { titre: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
            { tags: { has: q } },
          ],
        }
      : {}),
    ...(categorie ? { categorie } : {}),
  };
  try {
    const total = await prisma.skill.count({ where });
    const pages = Math.max(1, Math.ceil(total / PAR_PAGE));
    const page = Math.min(Math.max(1, Math.trunc(Number(filtres.page) || 1)), pages);
    const skills = await prisma.skill.findMany({
      where,
      orderBy: [{ featured: "desc" }, { popularite: "desc" }, { ordre: "asc" }],
      skip: (page - 1) * PAR_PAGE,
      take: PAR_PAGE,
    });
    return { skills, total, page, pages };
  } catch {
    // Table Skill absente (migration pas encore lancée) → liste vide
    return { skills: [], total: 0, page: 1, pages: 1 };
  }
}

/** Une skill par slug — null si absente. */
export async function obtenirSkill(slug: string): Promise<Skill | null> {
  try {
    return await prisma.skill.findUnique({ where: { slug } });
  } catch {
    return null;
  }
}

/** Quelques autres skills pour la section « À découvrir aussi ». */
export async function autresSkills(slug: string, limite = 4): Promise<Skill[]> {
  try {
    return await prisma.skill.findMany({
      where: { slug: { not: slug } },
      orderBy: [{ featured: "desc" }, { popularite: "desc" }],
      take: limite,
    });
  } catch {
    return [];
  }
}

/** Catégories FR réellement utilisées, triées par nombre de fiches. */
export async function categoriesSkills(): Promise<{ nom: string; total: number }[]> {
  try {
    const groupes = await prisma.skill.groupBy({
      by: ["categorie"],
      _count: { _all: true },
      orderBy: { _count: { categorie: "desc" } },
    });
    return groupes.map((g) => ({ nom: g.categorie, total: g._count._all }));
  } catch {
    return [];
  }
}

/** Total + catégories distinctes pour le héros de la page /skills. */
export async function compterSkillsStats(): Promise<{ total: number; categories: number }> {
  try {
    const total = await prisma.skill.count();
    const groupes = await prisma.skill.groupBy({ by: ["categorie"] });
    return { total, categories: groupes.length };
  } catch {
    return { total: 0, categories: 0 };
  }
}