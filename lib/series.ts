// lib/series.ts
// ─────────────────────────────────────────────────────────────────
// Lot 87 — MOTEUR DE CLASSEMENT DES 4 SÉRIES WEBGIVERSE
// Lot 90 — SÉRIE CHOISIE À LA MAIN, PRIORITAIRE ET EXCLUSIVE
//
// Lot 87 : chaque article publié du blog est attribué AUTOMATIQUEMENT
// à ses séries grâce aux mots-clés définis dans content/series.ts
// (titre ×3, extrait ×1). Problème constaté : ce classement à l'aveugle
// envoyait le même article dans PLUSIEURS séries (un titre comme
// « gratuits ou freemium » matche à la fois Découverte, Comparatif…).
//
// Lot 90 : le formulaire d'articles permet désormais de CHOISIR la
// série (Article.serieSlug). Cette série choisie :
//   • est PRIORITAIRE (badge des cartes, classement en tête de page) ;
//   • est EXCLUSIVE : l'article n'apparaît PLUS dans les autres séries,
//     même si les mots-clés matchent encore.
// Le classement automatique ne sert que de repli pour les articles
// sans série choisie (null = « Automatique » dans le formulaire).
// ─────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";
import { SERIES_WEBGIVERSE, serieParSlug, type SerieWebgiverse } from "@/content/series";

/** Article tel qu'il circule entre les pages (champs du blog). */
export type ArticleSerie = {
  id: string;
  slug: string;
  titre: string;
  extrait: string | null;
  image: string | null;
  publieLe: Date | null;
  /** Lot 90 — série choisie à la main (null = classement automatique). */
  serieSlug: string | null;
};

/**
 * « ChatGPT vs Claude » → "chatgpt vs claude" : minuscules, accents
 * retirés, ponctuation remplacée par des espaces. Les mots-clés des
 * séries sont stockés sous cette même forme normalisée.
 */
export function normaliserTexte(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents → lettre nue
    .replace(/[^a-z0-9]+/g, " ")     // ponctuation → espace
    .trim();
}

/** Nombre d'occurrences du mot-clé dans le texte normalisé. */
function compterOccurrences(texte: string, motCle: string): number {
  const motif = new RegExp(`(?:^| )${motCle.replace(/[^a-z0-9 ]/g, "")}(?= |$)`, "g");
  return (texte.match(motif) ?? []).length;
}

/**
 * Score d'un article pour une série : titre ×3 + extrait ×1.
 * 0 = l'article n'appartient pas à cette série.
 */
export function scorerArticle(article: ArticleSerie, serie: SerieWebgiverse): number {
  const titre = normaliserTexte(article.titre);
  const extrait = normaliserTexte(article.extrait ?? "");
  let score = 0;
  for (const brut of serie.motsCles) {
    const motCle = normaliserTexte(brut);
    if (!motCle) continue;
    score += compterOccurrences(titre, motCle) * 3;
    score += compterOccurrences(extrait, motCle);
  }
  return score;
}

/** Retourne la série correspondant à un slug enregistré (ou null si vide / inconnu). */
function serieManuelle(article: ArticleSerie): SerieWebgiverse | null {
  if (!article.serieSlug) return null;
  return serieParSlug(article.serieSlug) ?? null;
}

/**
 * Meilleure série d'un article (pour le badge des cartes du blog).
 * Lot 90 — la série choisie à la main GAGNE toujours : aucun score
 * automatique ne peut la contourner ni l'ajouter à une autre série.
 */
export function meilleureSerie(article: ArticleSerie): SerieWebgiverse | null {
  const manuelle = serieManuelle(article);
  if (manuelle) return manuelle;

  let gagnante: SerieWebgiverse | null = null;
  let meilleurScore = 0;
  for (const serie of SERIES_WEBGIVERSE) {
    const score = scorerArticle(article, serie);
    if (score > meilleurScore) {
      meilleurScore = score;
      gagnante = serie;
    }
  }
  return gagnante;
}

export type SerieAvecCompteur = {
  serie: SerieWebgiverse;
  nbArticles: number;
  dernierArticleLe: Date | null;
};

/**
 * Les 4 séries avec leur compteur d'articles publiés.
 * (ordre du tableau content/series.ts conservé)
 * Lot 90 — un article avec série choisie compte UNIQUEMENT dans cette
 * série ; les articles sans série choisie sont classés par mots-clés.
 */
export async function listerSeriesAvecCompteur(): Promise<SerieAvecCompteur[]> {
  const articles: ArticleSerie[] = await prisma.article.findMany({
    where: { type: "BLOG", statut: "PUBLIE" },
    select: {
      id: true, slug: true, titre: true, extrait: true,
      image: true, publieLe: true, serieSlug: true,
    },
  });

  return SERIES_WEBGIVERSE.map((serie) => {
    const membres = articles.filter((a) =>
      a.serieSlug ? a.serieSlug === serie.slug : scorerArticle(a, serie) > 0,
    );
    const dernierArticleLe =
      membres
        .map((m) => m.publieLe)
        .filter((d): d is Date => d instanceof Date)
        .sort((x, y) => y.getTime() - x.getTime())[0] ?? null;
    return { serie, nbArticles: membres.length, dernierArticleLe };
  });
}

/**
 * Les articles d'une série. Lot 90 :
 *   1. les articles DONT LA SÉRIE A ÉTÉ CHOISIE À LA MAIN passent en
 *      tête (du plus récent au plus ancien) ;
 *   2. suivent les articles classés automatiquement (score, puis date) ;
 *   3. un article attaché à une AUTRE série par son formulaire est
 *      EXCLU de celle-ci, même si les mots-clés matchent.
 * Retourne null si le slug est inconnu.
 */
export async function listerArticlesDeSerie(slug: string): Promise<{
  serie: SerieWebgiverse;
  articles: Array<ArticleSerie & { score: number }>;
} | null> {
  const serie = serieParSlug(slug);
  if (!serie) return null;

  const articles: ArticleSerie[] = await prisma.article.findMany({
    where: { type: "BLOG", statut: "PUBLIE" },
    select: {
      id: true, slug: true, titre: true, extrait: true,
      image: true, publieLe: true, serieSlug: true,
    },
  });

  const membres = articles
    .map((a) => ({
      ...a,
      score: scorerArticle(a, serie),
      manuel: a.serieSlug === serie.slug,
    }))
    .filter((a) => a.manuel || (!a.serieSlug && a.score > 0))
    .sort((x, y) => {
      if (x.manuel !== y.manuel) return x.manuel ? -1 : 1; // choisis à la main d'abord
      if (y.score !== x.score) return y.score - x.score;
      return (y.publieLe?.getTime() ?? 0) - (x.publieLe?.getTime() ?? 0);
    });

  return { serie, articles: membres };
}

/**
 * Lot 90 — les derniers articles publiés (pour la section
 * « Derniers articles du blog » de la page d'accueil). Remplace les
 * 3 articles de démonstration écrits en dur dans content/accueil.ts.
 */
export async function listerDerniersArticles(limite = 3): Promise<ArticleSerie[]> {
  return prisma.article.findMany({
    where: { type: "BLOG", statut: "PUBLIE" },
    orderBy: { publieLe: "desc" },
    take: limite,
    select: {
      id: true, slug: true, titre: true, extrait: true,
      image: true, publieLe: true, serieSlug: true,
    },
  });
}