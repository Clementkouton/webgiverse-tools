// app/open-source/page.tsx — même modèle, filtres { tri: "populaire" } + where openSource
// (listerOutils accepte un filtre openSource : ajoutez `openSource?: boolean` au type et
//  `if (f.openSource) ou.push({ openSource: true });` dans listerOutils)
import type { Metadata } from "next";
import { VueAnnuaire } from "@/components/annuaire/vue-annuaire";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Outils IA open source",
  description: "Les outils IA open source : transparents, auto-hébergeables et souvent gratuits.",
};

export default function PageOpenSource() {
  return <VueAnnuaire titre="Outils IA open source" sousTitre="outils transparents, souvent auto-hébergeables." filtres={{ openSource: true, tri: "populaire" }} />;
}