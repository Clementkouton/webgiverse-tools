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

// Le client généré déclare désormais le modèle Tuto (prisma/schema.prisma) :
// on utilise le délégué TYPÉ — `niveau` est un vrai NiveauTuto, plus aucun
// `any` qui faisait échouer le build strict de Vercel (TS7053/TS7006).
const tutoDb = prisma.tuto;

export type FiltresTutos = {
  q?: string; // recherche plein texte dans le titre et les tags
  niveau?: string; // "debutant" | "intermediaire" | "avance"
  outil?: string; // nom d'outil exact du tableau outils[] (ex: "ChatGPT")
  tri?: string; // "pertinence" (défaut) | "nouveautes" | "vues" | "az" | "za"
  page?: number; // Lot 13 — pagination : numéro de page (1 par défaut)
  parPage?: number; // Lot 13 — pagination : taille de page (16 par défaut)
};

/** Taille de page par défaut de la grille /tutoriels (4 lignes de 4 au bureau). */
export const TUTOS_PAR_PAGE = 16;

/** Renvoie le tri Prisma correspondant au tri demandé (typé strictement). */
function triTutos(tri?: string): Prisma.TutoOrderByWithRelationInput[] {
  switch (tri) {
    case "nouveautes":
      // Les ajouts récents d'abord, puis par pertinence décroissante.
      return [{ nouveau: "desc" }, { ordre: "desc" }];
    case "vues":
      return [{ vues: "desc" }];
    case "az":
      return [{ titre: "asc" }];
    case "za":
      return [{ titre: "desc" }];
    default:
      // Pertinence : l'ordre Aixploria conservé lors de l'import (1 = meilleur).
      return [{ ordre: "asc" }];
  }
}

// Lot 13 — listerTutos renvoie désormais { tutos, total, page, pages } :
// la page /tutoriels est paginée (16 tutos par page) au lieu de charger
// les 84 tutoriels d'un coup. Le numéro de page demandé est borné au
// nombre réel de pages : une URL « ?page=999 » retombe sur la dernière.
export async function listerTutos(f: FiltresTutos = {}) {
  const conditions: Prisma.TutoWhereInput[] = [];

  const q = f.q?.trim();
  if (q) {
    conditions.push({
      OR: [{ titre: { contains: q, mode: "insensitive" } }, { outils: { has: q } }],
    });
  }
  if (f.niveau === "debutant") conditions.push({ niveau: "DEBUTANT" });
  else if (f.niveau === "intermediaire") conditions.push({ niveau: "INTERMEDIAIRE" });
  else if (f.niveau === "avance") conditions.push({ niveau: "AVANCE" });
  const outil = f.outil?.trim();
  if (outil) conditions.push({ outils: { has: outil } });

  const where = conditions.length ? { AND: conditions } : undefined;
  const parPage = Math.min(48, Math.max(4, f.parPage ?? TUTOS_PAR_PAGE));
  const total = await tutoDb.count({ where });
  const pages = Math.max(1, Math.ceil(total / parPage));
  const page = Math.min(pages, Math.max(1, Math.trunc(f.page ?? 1) || 1));

  const tutos = await tutoDb.findMany({
    where,
    orderBy: triTutos(f.tri),
    skip: (page - 1) * parPage,
    take: parPage,
  });

  return { tutos, total, page, pages };
}

export async function compterTutoStats() {
  const [total, duree] = await Promise.all([
    tutoDb.count(),
    tutoDb.aggregate({ _sum: { dureeMin: true } }),
  ]);
  return { total, minutes: duree._sum.dureeMin ?? 0 };
}

export type OutilTutos = { nom: string; total: number };

export async function outilsDesTutos(): Promise<OutilTutos[]> {
  // Liste des outils présents dans la collection avec leur nombre de tutos,
  // triés par fréquence décroissante : la page /tutoriels n'affiche que les
  // plus utilisés en premier (la barre déplie le reste sur demande),
  // sinon des dizaines de pastilles noient les filtres utiles.
  const lignes = await tutoDb.findMany({ select: { outils: true } });
  const compteurs = new Map<string, number>();
  for (const l of lignes) for (const o of l.outils) compteurs.set(o, (compteurs.get(o) ?? 0) + 1);
  return [...compteurs.entries()]
    .map(([nom, total]) => ({ nom, total }))
    .sort((a, b) => b.total - a.total || a.nom.localeCompare(b.nom, "fr"));
}

export async function obtenirTuto(slug: string) {
  return tutoDb.findUnique({ where: { slug } });
}

/** Autres tutoriels autour du même outil, pour la colonne « À suivre ensuite ». */
export async function tutosSuivants(tutoId: string, outils: string[]) {
  return tutoDb.findMany({
    where: { id: { not: tutoId }, ...(outils.length ? { outils: { hasSome: outils } } : {}) },
    orderBy: [{ vues: "desc" }],
    take: 3,
  });
}
/* ============================================================
   BIBLIOTHÈQUE DE PROMPTS IA (/prompts)
   Lot 17 — même approche typée que les tutoriels : délégué
   Prisma typé (promptDb), filtres composés, pagination serveur.
   ============================================================ */

const promptDb = prisma.prompt;
const promptCategorieDb = prisma.promptCategorie;

/** Taille de page de la grille /prompts (4 lignes de 4 au bureau). */
export const PROMPTS_PAR_PAGE = 16;

export type FiltresPrompts = {
  q?: string; // recherche dans le titre, la description et la sous-catégorie
  categorie?: string; // slug de PromptCategorie
  role?: string; // slug de rôle (tableau Prompt.roles[])
  type?: string; // "texte" | "image" | "code"
  tri?: string; // "pertinence" (défaut) | "nouveautes" | "vues" | "az" | "za"
  page?: number;
};

/** Renvoie le tri Prisma correspondant au tri demandé (typé strictement). */
function triPrompts(tri?: string): Prisma.PromptOrderByWithRelationInput[] {
  switch (tri) {
    case "nouveautes":
      return [{ nouveau: "desc" }, { ordre: "asc" }];
    case "vues":
      return [{ vues: "desc" }];
    case "az":
      return [{ titre: "asc" }];
    case "za":
      return [{ titre: "desc" }];
    default:
      // Pertinence : l'ordre de l'import initial (1 = le plus demandé).
      return [{ ordre: "asc" }];
  }
}

/** Convertit le paramètre GET « type » en valeur d'enum Prisma. */
function typePromptDepuisFiltre(type?: string): "TEXTE" | "IMAGE" | "CODE" | undefined {
  if (type === "texte") return "TEXTE";
  if (type === "image") return "IMAGE";
  if (type === "code") return "CODE";
  return undefined;
}

/** Liste paginée des prompts (bibliothèque, catégorie ou rôle). */
export async function listerPrompts(f: FiltresPrompts = {}) {
  const conditions: Prisma.PromptWhereInput[] = [];

  const q = f.q?.trim();
  if (q) {
    conditions.push({
      OR: [
        { titre: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { sousCategorie: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (f.categorie) conditions.push({ categorie: { slug: f.categorie } });
  if (f.role) conditions.push({ roles: { has: f.role } });
  const type = typePromptDepuisFiltre(f.type);
  if (type) conditions.push({ type });

  const where = conditions.length ? { AND: conditions } : undefined;
  const total = await promptDb.count({ where });
  const pages = Math.max(1, Math.ceil(total / PROMPTS_PAR_PAGE));
  const page = Math.min(pages, Math.max(1, Math.trunc(f.page ?? 1) || 1));

  const prompts = await promptDb.findMany({
    where,
    orderBy: triPrompts(f.tri),
    skip: (page - 1) * PROMPTS_PAR_PAGE,
    take: PROMPTS_PAR_PAGE,
    include: { categorie: { select: { nom: true, slug: true } } },
  });

  return { prompts, total, page, pages };
}

/** Catégories de la bibliothèque avec leur nombre de prompts (barre de filtres). */
export async function listerPromptCategories() {
  return promptCategorieDb.findMany({
    orderBy: { ordre: "asc" },
    include: { _count: { select: { prompts: true } } },
  });
}

export async function obtenirPromptCategorie(slug: string) {
  return promptCategorieDb.findUnique({ where: { slug } });
}

export async function compterPromptStats() {
  const [total, categories] = await Promise.all([
    promptDb.count(),
    promptCategorieDb.count(),
  ]);
  return { total, categories };
}

export async function obtenirPrompt(slug: string) {
  return promptDb.findUnique({
    where: { slug },
    include: { categorie: { select: { nom: true, slug: true } } },
  });
}

/** Autres prompts de la même catégorie, pour la section « À essayer aussi ». */
export async function promptsSimilaires(promptId: string, categorieId: string) {
  return promptDb.findMany({
    where: { id: { not: promptId }, categorieId },
    orderBy: [{ vues: "desc" }],
    take: 3,
    include: { categorie: { select: { nom: true, slug: true } } },
  });
}

/** Prompts les plus consultés (vitrine d'accueil). */
export async function promptsPopulaires(n = 4) {
  return promptDb.findMany({
    orderBy: [{ vues: "desc" }],
    take: n,
    include: { categorie: { select: { nom: true, slug: true } } },
  });
}

export type CompteurRoles = { slug: string; total: number };

/** Nombre de prompts par rôle, trié par fréquence (barre des rôles). */
export async function compterPromptsParRole(): Promise<CompteurRoles[]> {
  const lignes = await promptDb.findMany({ select: { roles: true } });
  const compteurs = new Map<string, number>();
  for (const l of lignes) for (const r of l.roles) compteurs.set(r, (compteurs.get(r) ?? 0) + 1);
  return [...compteurs.entries()]
    .map(([slug, total]) => ({ slug, total }))
    .sort((a, b) => b.total - a.total || a.slug.localeCompare(b.slug, "fr"));
}