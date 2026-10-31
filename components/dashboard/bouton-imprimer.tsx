// components/dashboard/bouton-imprimer.tsx
// Lot 19 — déclenche la fenêtre d'impression du navigateur depuis la
// page d'export. L'utilisateur choisit « Enregistrer au format PDF » :
// aucune librairie externe, le PDF est généré par le navigateur.
"use client";

import { Printer } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";

export function BoutonImprimer({ libelle = "Imprimer / Enregistrer en PDF" }: { libelle?: string }) {
  return (
    <Bouton type="button" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden /> {libelle}
    </Bouton>
  );
}