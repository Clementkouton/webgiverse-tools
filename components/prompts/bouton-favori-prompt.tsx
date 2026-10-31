// components/prompts/bouton-favori-prompt.tsx
// Lot 19 (correctif) — bouton « cœur » pour sauvegarder un prompt IA
// dans « Mes prompts » (dashboard). Client component : il appelle l'action
// serveur basculerFavoriPrompt et affiche le résultat immédiatement.
//
// CORRECTIFS apportés par cette version :
//   1. try/finally : même si l'action plante, le bouton redevient
//      cliquable (avant, il restait figé en opacité réduite, « caché »
//      derrière l'overlay d'erreur de Next.js).
//   2. Le message d'état s'affiche DANS le flux du bouton (plus de
//      panneau flottant positionné en absolu qui pouvait recouvrir la
//      rangée de badges ou disparaître sous un autre élément).
//   3. Base de données non à jour (tables absentes) → instruction claire
//      « npx prisma db push » au lieu du message générique.
// Non connecté → lien vers la connexion (suite = page courante).
// Limite du plan Découverte atteinte → message + lien vers /tarifs.
"use client";

import { useState } from "react";
import Link from "next/link";
import { Crown, Heart, TriangleAlert } from "lucide-react";
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
  const [message, setMessage] = useState<{ type: "limite" | "erreur" | "base"; texte: string } | null>(null);

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
    setMessage(null);
    try {
      const resultat = await basculerFavoriPrompt(promptId);
      if (resultat.ok) {
        setFavori(Boolean(resultat.favori));
      } else if (resultat.raison === "limite") {
        setMessage({ type: "limite", texte: "Limite du plan Découverte atteinte." });
      } else if (resultat.raison === "base") {
        setMessage({
          type: "base",
          texte:
            "Fonctionnalité pas encore activée sur la base : lance npx prisma db push dans le terminal du projet, puis recharge la page.",
        });
      } else if (resultat.raison !== "non-connecte") {
        setMessage({ type: "erreur", texte: "Action impossible pour le moment — réessaie dans un instant." });
      }
    } catch (erreur) {
      // L'action ne doit normalement jamais planter, mais si le réseau
      // coupe : le bouton reste utilisable et l'erreur est affichée.
      console.error("Sauvegarde du prompt impossible :", erreur);
      setMessage({ type: "erreur", texte: "Action impossible pour le moment — réessaie dans un instant." });
    } finally {
      setEnCours(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1.5">
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
        {enCours ? "Enregistrement…" : favori ? "Sauvegardé" : "Sauvegarder"}
      </button>

      {/* Messages contextuels DANS le flux : aucun recouvrement possible */}
      {message && (
        <span
          aria-live="polite"
          className={cn(
            "flex max-w-72 items-start gap-1.5 rounded-carte border p-2 text-[11px] leading-4 text-encre shadow-carte",
            message.type === "limite" && "border-violet/30 bg-white",
            message.type === "base" && "border-amber-300 bg-amber-50",
            message.type === "erreur" && "border-bordure bg-white",
          )}
        >
          {message.type === "limite" && <Crown className="mt-0.5 size-3.5 shrink-0 text-violet" aria-hidden />}
          {message.type === "base" && <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />}
          <span>
            {message.texte}{" "}
            {message.type === "limite" && (
              <Link href="/tarifs" className="font-semibold text-violet underline">
                Passe Premium
              </Link>
            )}
          </span>
        </span>
      )}
    </span>
  );
}