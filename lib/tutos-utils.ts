// lib/tutos-utils.ts
// Helpers partagés des tutoriels vidéo IA — utilisés par la page /tutoriels,
// la page de détail, le seed initial et le script de migration.
// Placés ici pour garantir que le slug d'un tuto est TOUJOURS calculé
// de la même façon (base, seed et affichage restent cohérents).

import type { NiveauTuto } from "@prisma/client";

/** Transforme un titre en slug d'URL (minuscules, tirets, sans accents). */
export function slugifierTuto(titre: string): string {
  return (
    titre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // retire les accents
      .replace(/[^a-z0-9]+/g, "-") // tout le reste → tirets
      .replace(/^-+|-+$/g, "") // tirets de bord
      .slice(0, 80) || "tuto"
  );
}

/** Formate une durée en minutes : 32 → « 32 min », 94 → « 1h34 ». */
export function formaterDuree(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return reste ? `${heures}h${String(reste).padStart(2, "0")}` : `${heures}h`;
}

/** Miniature à afficher : personnalisée d'abord, sinon la vignette YouTube officielle. */
export function urlMiniature(t: { miniature: string | null; youtubeId: string | null }): string | null {
  if (t.miniature) return t.miniature;
  if (t.youtubeId) return `https://i.ytimg.com/vi/${t.youtubeId}/hqdefault.jpg`;
  return null;
}

/** Libellés et variantes Badge des niveaux (couleurs de la charte). */
export const NIVEAUX: Record<NiveauTuto, { libelle: string; variante: "gratuit" | "source" | "magenta" }> = {
  DEBUTANT: { libelle: "Débutant", variante: "gratuit" },
  INTERMEDIAIRE: { libelle: "Intermédiaire", variante: "source" },
  AVANCE: { libelle: "Avancé", variante: "magenta" },
};

/** Libellé français d'un niveau enum, pour les filtres. */
export function niveauVersParam(n: NiveauTuto): string {
  return n.toLowerCase(); // DEBUTANT → "debutant"
}