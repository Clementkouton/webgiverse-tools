// components/auth/modale-connexion.tsx
"use client";
import FormulaireConnexion from "./formulaire-connexion";
import { Carte } from "@/components/ui/carte";

export function ModaleConnexion({
  ouvert,
  onFermer,
  suite = "/dashboard",
}: {
  ouvert: boolean;
  onFermer: () => void;
  suite?: string;
}) {
  if (!ouvert) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bleu/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Connexion requise"
      onClick={onFermer}
    >
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <Carte className="relative p-6">
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-encre hover:bg-gris"
          >
            ×
          </button>
          <h2 className="text-h3 font-semibold">Connecte-toi pour continuer 🔒</h2>
          <p className="mb-5 mt-2 text-legende text-encre">
            Cette partie de Webgiverse est réservée aux membres. Crée un compte gratuit ou connecte-toi.
          </p>
          <FormulaireConnexion suite={suite} />
        </Carte>
      </div>
    </div>
  );
}