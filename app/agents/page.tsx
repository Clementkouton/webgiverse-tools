// app/agents/page.tsx
import type { Metadata } from "next";
import { VueAnnuaire } from "@/components/annuaire/vue-annuaire";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Agents IA",
  description: "Les agents IA qui travaillent pour toi : e-mails, rendez-vous, automatisations et équipes d'agents.",
};

export default function PageAgents() {
  return <VueAnnuaire titre="Agents IA" sousTitre="agents prêts à travailler pour toi." filtres={{ type: "AGENT" }} />;
}