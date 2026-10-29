import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CarteOutil = {
  id: string; nom: string; slug: string; logo: string | null; description: string;
  type: "OUTIL" | "AGENT"; tarif: string; gratuit: boolean; openSource: boolean;
  verifieLe: Date | null; nouveau: boolean; categories: { nom: string; slug: string }[];
};

const INCLUSION = {
  categories: { select: { categorie: { select: { nom: true, slug: true } } } },
} satisfies Prisma.ToolInclude;

type OutilSql = Prisma.ToolGetPayload<{ include: typeof INCLUSION }>;

export function versCarte(o: OutilSql): CarteOutil {
  return {
    id: o.id, nom: o.nom, slug: o.slug, logo: o.logo, description: o.description,
    type: o.type, tarif: o.tarif, gratuit: o.gratuit, openSource: o.openSource,
    verifieLe: o.verifieLe,
    nouveau: Date.now() - o.createdAt.getTime() < 30 * 86_400_000,
    categories: o.categories.map((c) => c.categorie),
  };
}

export type FiltresAnnuaire = {
  q?: string; categorie?: string; type?: "OUTIL" | "AGENT";
  tarif?: "gratuit" | "payant"; niveau?: string;
  openSource?: boolean;
  tri?: "recente" | "populaire" | "az"; page?: number;
};

const PAR_PAGE = 12;

export async function listerOutils(f: FiltresAnnuaire) {
  const ou: Prisma.ToolWhereInput[] = [{ statut: "PUBLIE" }];
  if (f.q) {
    ou.push({
      OR: [
        { nom: { mode: "insensitive", contains: f.q } },
        { description: { mode: "insensitive", contains: f.q } },
      ],
    });
  }
  if (f.categorie) ou.push({ categories: { some: { categorie: { slug: f.categorie } } } });
  if (f.type) ou.push({ type: f.type });
  if (f.tarif === "gratuit") ou.push({ gratuit: true });
  if (f.niveau) ou.push({ niveau: f.niveau });
  if (f.openSource) ou.push({ openSource: true });

  const where: Prisma.ToolWhereInput = { AND: ou };
  const total = await prisma.tool.count({ where });
  const page = Math.max(1, f.page ?? 1);

  const ordre: Prisma.ToolOrderByWithRelationInput[] =
    f.tri === "az" ? [{ nom: "asc" }]
    : f.tri === "populaire" ? [{ misEnAvant: "desc" }, { createdAt: "desc" }]
    : [{ createdAt: "desc" }];

  const outils = await prisma.tool.findMany({
    where, orderBy: ordre,
    skip: (page - 1) * PAR_PAGE, take: PAR_PAGE, include: INCLUSION,
  });

  return {
    outils: outils.map(versCarte), total, page,
    pages: Math.max(1, Math.ceil(total / PAR_PAGE)),
  };
}

export async function compterStats() {
  const [outils, agents, categories] = await Promise.all([
    prisma.tool.count({ where: { statut: "PUBLIE", type: "OUTIL" } }),
    prisma.tool.count({ where: { statut: "PUBLIE", type: "AGENT" } }),
    prisma.category.count(),
  ]);
  return { outils, agents, categories };
}

export async function outilsMisEnAvant() {
  const outils = await prisma.tool.findMany({
    where: { statut: "PUBLIE", misEnAvant: true },
    orderBy: { nom: "asc" }, take: 4, include: INCLUSION,
  });
  return outils.map(versCarte);
}

export async function listerCategories() {
  return prisma.category.findMany({
    orderBy: { ordre: "asc" },
    // ✅ Dans le filtre du _count, la relation vers Tool s'appelle `tool`
    include: { _count: { select: { outils: { where: { tool: { statut: "PUBLIE" } } } } } },
  });
}

export async function obtenirOutil(slug: string) {
  return prisma.tool.findFirst({
    where: { slug, statut: "PUBLIE" },
    include: { categories: { select: { categorie: true } } },
  });
}

export async function outilsAlternatifs(outilId: string, categorieSlugs: string[]) {
  const proches = await prisma.tool.findMany({
    where: {
      id: { not: outilId }, statut: "PUBLIE",
      categories: { some: { categorie: { slug: { in: categorieSlugs } } } },
    },
    take: 4, orderBy: { misEnAvant: "desc" }, include: INCLUSION,
  });
  return proches.map(versCarte);
}

/* ============================================================
   TUTORIELS VIDÉO IA (/tutoriels)
   ============================================================ */

export type FiltresTutos = {
  q?: string; // recherche plein texte dans le titre et les tags
  niveau?: string; // "debutant" | "intermediaire" | "avance"
  outil?: string; // nom d'outil exact du tableau outils[] (ex: "ChatGPT")
  tri?: string; // "pertinence" (défaut) | "nouveautes" | "vues" | "az" | "za"
};

/** Renvoie le filtre Prisma correspondant au tri demandé. */
function triTutos(tri?: string) {
  switch (tri) {
    case "nouveautes":
      // Les ajouts récents d'abord, puis par pertinence décroissante.
      return [{ nouveau: "desc" }, { ordre: "desc" }] as const;
    case "vues":
      return [{ vues: "desc" }] as const;
    case "az":
      return [{ titre: "asc" }] as const;
    case "za":
      return [{ titre: "desc" }] as const;
    default:
      // Pertinence : l'ordre Aixploria conservé lors de l'import (1 = meilleur).
      return [{ ordre: "asc" }] as const;
  }
}

export async function listerTutos(f: FiltresTutos = {}) {
  const conditions: Prisma.TutoWhereInput[] = [];

  const q = f.q?.trim();
  if (q) {
    conditions.push({
      OR: [{ titre: { contains: q, mode: "insensitive" } }, { outils: { has: q } }],
    });
  }
  if (f.niveau === "debutant" || f.niveau === "intermediaire" || f.niveau === "avance") {
    conditions.push({ niveau: f.niveau.toUpperCase() as "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE" });
  }
  const outil = f.outil?.trim();
  if (outil) conditions.push({ outils: { has: outil } });

  return prisma.tuto.findMany({
    where: conditions.length ? { AND: conditions } : undefined,
    orderBy: triTutos(f.tri),
  });
}

export async function compterTutoStats() {
  const [total, duree] = await Promise.all([
    prisma.tuto.count(),
    prisma.tuto.aggregate({ _sum: { dureeMin: true } }),
  ]);
  return { total, minutes: duree._sum.dureeMin ?? 0 };
}

export async function outilsDesTutos() {
  // Liste distincte et triée de tous les outils présents dans la collection,
  // pour les pastilles de filtrage (comme les tags d'Aixploria).
  const lignes = await prisma.tuto.findMany({ select: { outils: true } });
  const ensemble = new Set<string>();
  for (const l of lignes) for (const o of l.outils) ensemble.add(o);
  return [...ensemble].sort((a, b) => a.localeCompare(b, "fr"));
}

export async function obtenirTuto(slug: string) {
  return prisma.tuto.findUnique({ where: { slug } });
}

/** Autres tutoriels autour du même outil, pour la colonne « À suivre ensuite ». */
export async function tutosSuivants(tutoId: string, outils: string[]) {
  return prisma.tuto.findMany({
    where: { id: { not: tutoId }, ...(outils.length ? { outils: { hasSome: outils } } : {}) },
    orderBy: [{ vues: "desc" }],
    take: 3,
  });
}