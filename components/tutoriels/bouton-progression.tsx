// components/tutoriels/bouton-progression.tsx
// Lot 19 (correctif) + Lot 35 — suivi de progression réservé aux abonnés
// PREMIUM : connecté sans abonnement → pastille « Progression Premium »
// vers /tarifs ; l'action serveur re-vérifie (raison « premium »).
// Premium → comportement inchangé. Non connecté → invitation.
"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleDashed, Crown, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { majProgressionTuto, retirerProgressionTuto } from "@/app/actions/apprentissage";

export type StatutProgression = "AUCUN" | "EN_COURS" | "TERMINE";

type Props = {
  tutoId: string;
  statutInitial: StatutProgression;
  connecte: boolean;
  /** Abonnement Premium (Pro / Entreprise) actif ? */
  premium: boolean;
  /** Lien de connexion quand l'utilisateur n'est pas connecté. */
  hrefConnexion: string;
};

export function BoutonProgression({ tutoId, statutInitial, connecte, premium, hrefConnexion }: Props) {
  const [statut, setStatut] = useState<StatutProgression>(statutInitial);
  const [enCours, setEnCours] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);

  // Visiteur non connecté : invitation discrète, sans état
  if (!connecte) {
    return (
      <Link
        href={hrefConnexion}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-[7px]  not-italic border border-bordure bg-white px-3.5 py-1 text-[12px] leading-4 font-medium text-bleu transition hover:border-violet hover:text-sky-500"
      >
        <CircleDashed className="size-3.5" aria-hidden /> Suivre ma progression
      </Link>
    );
  }

  // Connecté sans abonnement : pastille Premium (le verrou réel est
  // côté serveur, dans app/actions/apprentissage.ts).
  if (!premium) {
    return (
      <Link
        href="/tarifs"
        className="inline-flex min-h-9 items-center gap-1.5 rounded-[7px]  not-italic border border-violet/30 bg-violet/10 px-3.5 py-1 text-[12px] leading-4 font-semibold text-sky-500 transition hover:border-violet"
      >
        <Crown className="size-3.5" aria-hidden /> Progression Premium
      </Link>
    );
  }

  async function definir(nouveau: Exclude<StatutProgression, "AUCUN">) {
    if (enCours) return;
    setEnCours(true);
    setEchec(null);
    try {
      if (statut === nouveau) {
        // Clic sur l'état déjà actif → on remet à zéro
        const resultat = await retirerProgressionTuto(tutoId);
        if (resultat.ok) setStatut("AUCUN");
        else afficherEchec(resultat.raison);
      } else {
        const resultat = await majProgressionTuto(tutoId, nouveau);
        if (resultat.ok) setStatut(nouveau);
        else afficherEchec(resultat.raison);
      }
    } catch (erreur) {
      console.error("Progression du tutoriel impossible :", erreur);
      setEchec("Action impossible pour le moment — réessaie dans un instant.");
    } finally {
      setEnCours(false);
    }
  }

  function afficherEchec(raison?: string) {
    if (raison === "premium") {
      setEchec(
        "Le suivi de progression est réservé aux abonnés Premium — passe Premium depuis la page Tarifs.",
      );
    } else if (raison === "base") {
      setEchec(
        "Fonctionnalité pas encore activée sur la base : lance npx prisma db push dans le terminal du projet, puis recharge la page.",
      );
    } else {
      setEchec("Action impossible pour le moment — réessaie dans un instant.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <span className="text-[12px] leading-4 font-semibold text-encre">Ma progression :</span>
      <div
        role="group"
        aria-label="Suivi de progression du tutoriel"
        className="inline-flex items-center gap-1 rounded-[7px]  not-italic border border-bordure bg-white p-1"
      >
        <button
          type="button"
          onClick={() => definir("EN_COURS")}
          disabled={enCours}
          aria-pressed={statut === "EN_COURS"}
          className={cn(
            "inline-flex min-h-8 items-center gap-1.5 rounded-[7px]  not-italic px-3 text-[12px] leading-4 font-semibold transition active:scale-95",
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
            "inline-flex min-h-8 items-center gap-1.5 rounded-[7px]  not-italic px-3 text-[12px] leading-4 font-semibold transition active:scale-95",
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

      {/* Échec affiché DANS le flux, sous le groupe de boutons */}
      {echec && (
        <p
          aria-live="polite"
          className="flex w-full max-w-md items-start gap-1.5 rounded-carte border border-amber-300 bg-amber-50 p-2 text-[12px] leading-4 text-encre"
        >
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />
          <span>{echec}</span>
        </p>
      )}
    </div>
  );
}