// components/prompts/bouton-favori-prompt.tsx
// Lot 19 — bouton « cœur » pour sauvegarder un prompt IA dans
// « Mes prompts » (dashboard). Client component : il appelle l'action
// serveur basculerFavoriPrompt et affiche le résultat immédiatement.
// Non connecté → lien vers la connexion (suite = page courante).
// Limite du plan Découverte atteinte → message + lien vers /tarifs.
"use client";

import { useState } from "react";
import Link from "next/link";
import { Crown, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { basculerFavoriPrompt } from "@/app/actions/apprentissage";

type Props = {
  promptId: string;
  favoriInitial: boolean;
  connecte: boolean;
  /** Lien de connexion quand l'utilisateur n'est pas connecté. */
  hrefConnexion: string;
};

export function BoutonFavoriPrompt({ promptId, favoriInitial, connecte, hrefConnexion }: Props) {
  const [favori, setFavori] = useState(favoriInitial);
  const [enCours, setEnCours] = useState(false);
  const [limite, setLimite] = useState(false);
  const [erreur, setErreur] = useState(false);

  // Visiteur non connecté : simple lien d'invitation, sans état
  if (!connecte) {
    return (
      <Link
        href={hrefConnexion}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-bordure bg-white px-3.5 py-1 text-[12px] leading-4 font-medium text-bleu transition hover:border-violet hover:text-violet"
      >
        <Heart className="size-3.5" aria-hidden /> Sauvegarder
      </Link>
    );
  }

  async function basculer() {
    if (enCours) return;
    setEnCours(true);
    setLimite(false);
    setErreur(false);
    const resultat = await basculerFavoriPrompt(promptId);
    if (resultat.ok) {
      setFavori(Boolean(resultat.favori));
    } else if (resultat.raison === "limite") {
      setLimite(true);
    } else if (resultat.raison !== "non-connecte") {
      setErreur(true);
    }
    setEnCours(false);
  }

  return (
    <span className="relative inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={basculer}
        disabled={enCours}
        aria-pressed={favori}
        className={cn(
          "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1 text-[12px] leading-4 font-semibold transition active:scale-95",
          favori
            ? "border-violet bg-violet/10 text-violet"
            : "border-bordure bg-white text-bleu hover:border-violet hover:text-violet",
          enCours && "opacity-60",
        )}
      >
        <Heart className={cn("size-3.5", favori && "fill-current")} aria-hidden />
        {favori ? "Sauvegardé" : "Sauvegarder"}
      </button>

      {/* Messages contextuels (limite de plan ou erreur passagère) */}
      {limite && (
        <span className="absolute top-full left-0 z-10 mt-1 flex w-64 items-start gap-1.5 rounded-carte border border-violet/30 bg-white p-2 text-[11px] leading-4 text-encre shadow-carte">
          <Crown className="mt-0.5 size-3.5 shrink-0 text-violet" aria-hidden />
          <span>
            Limite du plan Découverte atteinte.{" "}
            <Link href="/tarifs" className="font-semibold text-violet underline">
              Passe Premium
            </Link>{" "}
            pour sauvegarder sans limite.
          </span>
        </span>
      )}
      {erreur && (
        <span className="absolute top-full left-0 z-10 mt-1 rounded-carte border border-bordure bg-white p-2 text-[11px] leading-4 text-encre shadow-carte">
          Action impossible pour le moment — réessaie dans un instant.
        </span>
      )}
    </span>
  );
}