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

/* ════════════════════════════════════════════════════════════════
   Lot 40 — SKILLS ÉPINGLÉES + RETOURS D'USAGE
   Mêmes garde-fous que le reste du fichier : si les tables
   SkillFavori / SkillRetour n'existent pas encore (db push non
   lancé), chaque fonction renvoie un résultat vide — jamais de
   crash, les pages restent affichables.
   ════════════════════════════════════════════════════════════════ */

/** Ids des skills épinglées par un membre (pour marquer les cartes). */
export async function idsSkillsFavoris(userId: string | null | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  try {
    const lignes = await prisma.skillFavori.findMany({
      where: { userId },
      select: { skillId: true },
    });
    return new Set(lignes.map((l) => l.skillId));
  } catch {
    return new Set();
  }
}

/** Une skill est-elle épinglée par ce membre ? */
export async function skillFavorie(
  userId: string | null | undefined,
  skillId: string,
): Promise<boolean> {
  if (!userId) return false;
  try {
    const ligne = await prisma.skillFavori.findUnique({
      where: { userId_skillId: { userId, skillId } },
      select: { id: true },
    });
    return Boolean(ligne);
  } catch {
    return false;
  }
}

/** Skills épinglées d'un membre, pour la page « Mes skills ». */
export async function favorisSkills(userId: string) {
  try {
    return await prisma.skillFavori.findMany({
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
    });
  } catch {
    return [];
  }
}

export type RetourSkill = {
  id: string;
  usage: string;
  resultat: string;
  note: number;
  recommande: boolean;
  creeLe: Date;
  majLe: Date;
  pseudo: string;
  initiale: string;
};

/** Pseudo affichable : nom si renseigné, sinon début de l'e-mail. */
function pseudoDepuis(name: string | null, email: string): { pseudo: string; initiale: string } {
  const base = (name ?? "").trim() || email.split("@")[0] || "Membre";
  return { pseudo: base, initiale: base.slice(0, 1).toUpperCase() };
}

/** Retours d'usage des MEMBRES sur une skill (fiche /skills/…). */
export async function retoursSkill(skillId: string, exclureUserId?: string | null): Promise<RetourSkill[]> {
  try {
    const lignes = await prisma.skillRetour.findMany({
      where: { skillId, ...(exclureUserId ? { userId: { not: exclureUserId } } : {}) },
      orderBy: { majLe: "desc" },
      take: 24,
      select: {
        id: true,
        usage: true,
        resultat: true,
        note: true,
        recommande: true,
        creeLe: true,
        majLe: true,
        user: { select: { name: true, email: true } },
      },
    });
    return lignes.map((l) => ({
      id: l.id,
      usage: l.usage,
      resultat: l.resultat,
      note: l.note,
      recommande: l.recommande,
      creeLe: l.creeLe,
      majLe: l.majLe,
      ...pseudoDepuis(l.user.name, l.user.email),
    }));
  } catch {
    return [];
  }
}

/** Le retour d'usage déjà rédigé par ce membre sur cette skill. */
export async function monRetourSkill(
  userId: string | null | undefined,
  skillId: string,
): Promise<{ id: string; usage: string; resultat: string; note: number; recommande: boolean } | null> {
  if (!userId) return null;
  try {
    const ligne = await prisma.skillRetour.findUnique({
      where: { userId_skillId: { userId, skillId } },
      select: { id: true, usage: true, resultat: true, note: true, recommande: true },
    });
    return ligne;
  } catch {
    return null;
  }
}

/** Retours du membre sur TOUTES ses skills épinglées (« Mes skills »). */
export async function retoursMembrePourSkills(userId: string, skillIds: string[]) {
  const vide = new Map<string, { usage: string; resultat: string; note: number; recommande: boolean }>();
  if (skillIds.length === 0) return vide;
  try {
    const lignes = await prisma.skillRetour.findMany({
      where: { userId, skillId: { in: skillIds } },
      select: { skillId: true, usage: true, resultat: true, note: true, recommande: true },
    });
    return new Map(lignes.map((l) => [l.skillId, { usage: l.usage, resultat: l.resultat, note: l.note, recommande: l.recommande }]));
  } catch {
    return vide;
  }
}

/** Note moyenne des retours d'une skill (affichée sur la fiche). */
export async function noteMoyenneSkill(skillId: string): Promise<{ moyenne: number; total: number }> {
  try {
    const agg = await prisma.skillRetour.aggregate({
      where: { skillId },
      _avg: { note: true },
      _count: { _all: true },
    });
    return {
      moyenne: agg._avg.note ? Math.round(agg._avg.note * 10) / 10 : 0,
      total: agg._count._all,
    };
  } catch {
    return { moyenne: 0, total: 0 };
  }
}