// lib/series.ts
// ─────────────────────────────────────────────────────────────────
// Lot 87 — MOTEUR DE CLASSEMENT DES 4 SÉRIES WEBGIVERSE
//
// Chaque article publié du blog est attribué AUTOMATIQUEMENT à ses
// séries grâce aux mots-clés définis dans content/series.ts :
//   - le titre compte ×3 (c'est lui qui décrit le mieux l'article)
//   - l'extrait compte ×1
// Un article peut appartenir à plusieurs séries (un comparatif
// « ChatGPT vs Claude » peut aussi être une pépite Découverte).
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

/** Meilleure série d'un article (pour le badge des cartes du blog). */
export function meilleureSerie(article: ArticleSerie): SerieWebgiverse | null {
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
 */
export async function listerSeriesAvecCompteur(): Promise<SerieAvecCompteur[]> {
  const articles: ArticleSerie[] = await prisma.article.findMany({
    where: { type: "BLOG", statut: "PUBLIE" },
    select: { id: true, slug: true, titre: true, extrait: true, image: true, publieLe: true },
  });

  return SERIES_WEBGIVERSE.map((serie) => {
    const membres = articles
      .map((a) => ({ a, score: scorerArticle(a, serie) }))
      .filter((m) => m.score > 0);
    const dernierArticleLe =
      membres
        .map((m) => m.a.publieLe)
        .filter((d): d is Date => d instanceof Date)
        .sort((x, y) => y.getTime() - x.getTime())[0] ?? null;
    return { serie, nbArticles: membres.length, dernierArticleLe };
  });
}

/**
 * Les articles d'une série, du mieux classé au moins bien, puis du
 * plus récent au plus ancien. Retourne null si le slug est inconnu.
 */
export async function listerArticlesDeSerie(slug: string): Promise<{
  serie: SerieWebgiverse;
  articles: Array<ArticleSerie & { score: number }>;
} | null> {
  const serie = serieParSlug(slug);
  if (!serie) return null;

  const articles: ArticleSerie[] = await prisma.article.findMany({
    where: { type: "BLOG", statut: "PUBLIE" },
    select: { id: true, slug: true, titre: true, extrait: true, image: true, publieLe: true },
  });

  const membres = articles
    .map((a) => ({ ...a, score: scorerArticle(a, serie) }))
    .filter((a) => a.score > 0)
    .sort((x, y) => {
      if (y.score !== x.score) return y.score - x.score;
      return (y.publieLe?.getTime() ?? 0) - (x.publieLe?.getTime() ?? 0);
    });

  return { serie, articles: membres };
}