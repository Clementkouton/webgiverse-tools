// components/tutoriels/bouton-progression.tsx
// Lot 19 — suivi de progression d'un tutoriel vidéo. Deux états
// personnels : « En cours » et « Terminé » ; cliquer sur l'état actif
// remet le tutoriel à zéro. Client component qui appelle les actions
// serveur majProgressionTuto / retirerProgressionTuto.
// Non connecté → lien d'invitation vers la connexion.
"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleDashed, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { majProgressionTuto, retirerProgressionTuto } from "@/app/actions/apprentissage";

export type StatutProgression = "AUCUN" | "EN_COURS" | "TERMINE";

type Props = {
  tutoId: string;
  statutInitial: StatutProgression;
  connecte: boolean;
  /** Lien de connexion quand l'utilisateur n'est pas connecté. */
  hrefConnexion: string;
};

export function BoutonProgression({ tutoId, statutInitial, connecte, hrefConnexion }: Props) {
  const [statut, setStatut] = useState<StatutProgression>(statutInitial);
  const [enCours, setEnCours] = useState(false);

  // Visiteur non connecté : invitation discrète, sans état
  if (!connecte) {
    return (
      <Link
        href={hrefConnexion}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-bordure bg-white px-3.5 py-1 text-[12px] leading-4 font-medium text-bleu transition hover:border-violet hover:text-violet"
      >
        <CircleDashed className="size-3.5" aria-hidden /> Suivre ma progression
      </Link>
    );
  }

  async function definir(nouveau: Exclude<StatutProgression, "AUCUN">) {
    if (enCours) return;
    setEnCours(true);
    if (statut === nouveau) {
      // Clic sur l'état déjà actif → on remet à zéro
      const resultat = await retirerProgressionTuto(tutoId);
      if (resultat.ok) setStatut("AUCUN");
    } else {
      const resultat = await majProgressionTuto(tutoId, nouveau);
      if (resultat.ok) setStatut(nouveau);
    }
    setEnCours(false);
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <span className="text-[12px] leading-4 font-semibold text-encre">Ma progression :</span>
      <div
        role="group"
        aria-label="Suivi de progression du tutoriel"
        className="inline-flex items-center gap-1 rounded-full border border-bordure bg-white p-1"
      >
        <button
          type="button"
          onClick={() => definir("EN_COURS")}
          disabled={enCours}
          aria-pressed={statut === "EN_COURS"}
          className={cn(
            "inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[12px] leading-4 font-semibold transition active:scale-95",
            statut === "EN_COURS"
              ? "bg-[linear-gradient(100deg,#6a3bff,#8f6bff)] text-white shadow-[0_2px_10px_rgba(106,59,255,0.35)]"
              : "text-bleu hover:bg-gris",
            enCours && "opacity-60",
          )}
        >
          {enCours && statut !== "TERMINE" ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <CircleDashed className="size-3.5" aria-hidden />
          )}
          En cours
        </button>
        <button
          type="button"
          onClick={() => definir("TERMINE")}
          disabled={enCours}
          aria-pressed={statut === "TERMINE"}
          className={cn(
            "inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[12px] leading-4 font-semibold transition active:scale-95",
            statut === "TERMINE"
              ? "bg-[linear-gradient(100deg,#6a3bff,#8f6bff)] text-white shadow-[0_2px_10px_rgba(106,59,255,0.35)]"
              : "text-bleu hover:bg-gris",
            enCours && "opacity-60",
          )}
        >
          {enCours && statut === "TERMINE" ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <CheckCircle2 className="size-3.5" aria-hidden />
          )}
          Terminé
        </button>
      </div>
      {statut !== "AUCUN" && (
        <span className="text-[12px] leading-4 text-encre">
          Clique à nouveau pour retirer.
        </span>
      )}
    </div>
  );
}