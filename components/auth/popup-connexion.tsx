//components/auth/popup-connexion.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import FormulaireConnexion from "@/components/auth/formulaire-connexion";

type Props = {
  ouvert: boolean;
  onFermer: () => void;
  suite?: string;
  message?: string;
};

export default function PopupConnexion({
  ouvert,
  onFermer,
  suite,
  message,
}: Props) {
  // createPortal a besoin de document.body → uniquement côté navigateur
  const [prete, setPrete] = useState(false);

  useEffect(() => {
    setPrete(true);
  }, []);

  // Fermeture avec la touche Échap
  useEffect(() => {
    if (!ouvert) return;

    function surTouche(e: KeyboardEvent) {
      if (e.key === "Escape") onFermer();
    }

    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [ouvert, onFermer]);

  // Bloque le défilement de la page tant que la popup est ouverte
  useEffect(() => {
    if (!ouvert) return;
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = precedent;
    };
  }, [ouvert]);

  if (!ouvert || !prete) return null;

  // ⚡ PORTAIL : la popup est rendue directement dans <body>.
  // Aucun parent (carte avec hover:-translate-y-0.5, etc.) ne peut
  // casser son positionnement fixed ni son z-index.
  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Connexion requise"
    >
      <div
        className="absolute inset-0 bg-encre/60 backdrop-blur-sm"
        onClick={onFermer}
      />

      <div className="relative w-full max-w-md rounded-carte border border-bordure bg-white p-6 shadow-carte sm:p-8">
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-encre/50 transition hover:bg-gris hover:text-encre"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-6">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-violet/10 text-violet">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="font-titre text-h3 text-encre">
            Connectez-vous pour continuer
          </h2>
          <p className="mt-1 text-sm text-encre/70">
            {message ??
              "Cet espace est réservé aux membres. Connectez-vous ou créez un compte gratuit pour continuer."}
          </p>
        </div>

        <FormulaireConnexion suite={suite} apresConnexion={onFermer} />
      </div>
    </div>,
    document.body
  );
}