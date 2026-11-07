// app/agents/page.tsx
// Lot 37 — même traitement que /gratuits : lecture de « ?page=N »,
// pagination serveur de la grille (12 agents par page), liens sous la
// grille. « revalidate = 3600 » retiré car la page utilise searchParams
// (rendu dynamique, comme /outils).
import type { Metadata } from "next";
import { VueAnnuaire } from "@/components/annuaire/vue-annuaire";

export const metadata: Metadata = {
  title: "Agents IA",
  description: "Les agents IA qui travaillent pour toi : e-mails, rendez-vous, automatisations et équipes d'agents.",
};

/** Convertit ?page=N en entier ≥ 1 ; toute valeur douteuse → page 1. */
function numeroPage(valeur: string | string[] | undefined): number {
  const brut = typeof valeur === "string" ? Math.trunc(Number(valeur)) : NaN;
  return Number.isFinite(brut) && brut >= 1 ? brut : 1;
}

export default async function PageAgents({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <VueAnnuaire
      titre="Agents IA"
      sousTitre="agents prêts à travailler pour toi."
      filtres={{ type: "AGENT", page: numeroPage(params.page) }}
      base="/agents"
    />
  );
}