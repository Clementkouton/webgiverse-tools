// components/entreprise/bouton-copier-texte.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 57 — petit bouton « copier » autonome (aucune dépendance).
// Utilisé pour le code d'intégration du widget, l'exemple curl et
// toute valeur à copier depuis l'Espace Entreprise.
// ─────────────────────────────────────────────────────────────────
"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type Props = {
  texte: string;
  label?: string;
  className?: string;
};

export function BoutonCopierTexte({ texte, label = "Copier", className }: Props) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 1500);
    } catch {
      // presse-papiers indisponible (navigateur ancien / http) :
      // on ne plante pas la page, l'utilisateur copiera à la main
    }
  }

  return (
    <button
      type="button"
      onClick={copier}
      className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-bordure bg-white px-3 text-[12px] font-semibold text-encre transition hover:bg-gris ${className ?? ""}`}
    >
      {copie ? (
        <>
          <Check className="size-3.5 text-emerald-600" aria-hidden /> Copié ✓
        </>
      ) : (
        <>
          <Copy className="size-3.5" aria-hidden /> {label}
        </>
      )}
    </button>
  );
}
