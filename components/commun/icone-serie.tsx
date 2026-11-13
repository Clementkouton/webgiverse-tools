// components/commun/icone-serie.tsx
// Lot 87 — icône des séries Webgiverse : transforme le NOM d'icône
// stocké dans content/series.ts en vrai composant lucide-react.
// (Même modèle que icone-categorie.tsx.)
import { Compass, GraduationCap, Scale, Workflow, type LucideIcon } from "lucide-react";

const ICONES: Record<string, LucideIcon> = {
  Compass,
  GraduationCap,
  Scale,
  Workflow,
};

export function IconeSerie({ nom, className }: { nom: string; className?: string }) {
  const Icone = ICONES[nom] ?? Compass;
  return <Icone className={className ?? "size-6"} aria-hidden />;
}