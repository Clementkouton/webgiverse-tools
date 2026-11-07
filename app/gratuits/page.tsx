// app/gratuits/page.tsx
// Lot 37 — la page lit « ?page=N » et la transmet à listerOutils (via
// VueAnnuaire) : la grille est paginée côté serveur, 12 outils par page,
// liens « Précédent / 1 2 3 … / Suivant » sous la grille.
// · « revalidate = 3600 » est retiré : l'utilisation de searchParams rend
//   la page dynamique (comme /outils, qui fait la même requête Prisma).
// · Le numéro de page est assaini : tout paramètre invalide, nul ou
//   négatif retombe sur la page 1 (listerOutils borne aussi vers le haut).
import type { Metadata } from "next";
import { VueAnnuaire } from "@/components/annuaire/vue-annuaire";

export const metadata: Metadata = {
  title: "Outils IA gratuits",
  description: "Les outils IA avec une version gratuite pleinement utilisable, sélectionnés par Webgiverse.",
};

/** Convertit ?page=N en entier ≥ 1 ; toute valeur douteuse → page 1. */
function numeroPage(valeur: string | string[] | undefined): number {
  const brut = typeof valeur === "string" ? Math.trunc(Number(valeur)) : NaN;
  return Number.isFinite(brut) && brut >= 1 ? brut : 1;
}

export default async function PageGratuits({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <VueAnnuaire
      titre="Outils IA gratuits"
      sousTitre="outils avec une version gratuite utilisable au quotidien."
      filtres={{ tarif: "gratuit", tri: "populaire", page: numeroPage(params.page) }}
      base="/gratuits"
    />
  );
}