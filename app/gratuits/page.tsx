// app/gratuits/page.tsx
import type { Metadata } from "next";
import { VueAnnuaire } from "@/components/annuaire/vue-annuaire";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Outils IA gratuits",
  description: "Les outils IA avec une version gratuite pleinement utilisable, sélectionnés par Webgiverse.",
};

export default function PageGratuits() {
  return <VueAnnuaire titre="Outils IA gratuits" sousTitre="outils avec une version gratuite utilisable au quotidien." filtres={{ tarif: "gratuit", tri: "populaire" }} />;
}