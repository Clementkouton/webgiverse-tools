// app/open-source/page.tsx
// Lot 37 — même traitement que /gratuits et /agents : lecture de
// « ?page=N », pagination serveur de la grille (12 outils par page),
// liens sous la grille. « revalidate = 3600 » retiré car la page utilise
// searchParams (rendu dynamique, comme /outils).
// (Le filtre openSource est pris en charge par listerOutils depuis
// longtemps : `if (f.openSource) ou.push({ openSource: true })`.)
import type { Metadata } from "next";
import { VueAnnuaire } from "@/components/annuaire/vue-annuaire";

export const metadata: Metadata = {
  title: "Outils IA open source",
  description: "Les outils IA open source : transparents, auto-hébergeables et souvent gratuits.",
};

/** Convertit ?page=N en entier ≥ 1 ; toute valeur douteuse → page 1. */
function numeroPage(valeur: string | string[] | undefined): number {
  const brut = typeof valeur === "string" ? Math.trunc(Number(valeur)) : NaN;
  return Number.isFinite(brut) && brut >= 1 ? brut : 1;
}

export default async function PageOpenSource({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <VueAnnuaire
      titre="Outils IA open source"
      sousTitre="outils transparents, souvent auto-hébergeables."
      filtres={{ openSource: true, tri: "populaire", page: numeroPage(params.page) }}
      base="/open-source"
    />
  );
}