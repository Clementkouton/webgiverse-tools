// components/skills/bouton-epingle-skill.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 40 — bouton « Épingler » d'une skill dans « Mes skills ».
// Composant CLIENT : appelle l'action serveur basculerSkillFavori et
// met à jour son état immédiatement (try/finally : jamais figé).
//
// Deux rendus :
//   · variante "fiche"  → bouton avec libellé (page /skills/[slug])
//   · variante "carte"  → pastille ronde en haut à droite des cartes
//                         de la grille /skills (l'overlay de la carte
//                         reste cliquable : la pastille est au-dessus)
//
// États :
//   · non connecté           → lien « Se connecter » (hrefConnexion)
//   · connecté non Premium   → lien « Réservé aux abonnés » → /tarifs
//   · Premium                → bascule Épingler / Épinglée
//   · base non à jour        → instruction « npx prisma db push »
// ─────────────────────────────────────────────────────────────────
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Crown, Pin, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { basculerSkillFavori, type RaisonSkills } from "@/app/actions/skills-favoris";

type Props = {
  skillId: string;
  epingleInitial: boolean;
  connecte: boolean;
  premium: boolean;
  /** Lien de connexion quand le visiteur n'est pas connecté. */
  hrefConnexion: string;
  variante?: "fiche" | "carte";
};

export function BoutonEpingleSkill({
  skillId,
  epingleInitial,
  connecte,
  premium,
  hrefConnexion,
  variante = "fiche",
}: Props) {
  const [epingle, setEpingle] = useState(epingleInitial);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ type: "premium" | "base" | "erreur"; texte: string } | null>(null);
  const [enAttente, demarrerTransition] = useTransition();

  // ── Visiteur non connecté : simple lien d'invitation ─────────────
  if (!connecte) {
    const classes =
      variante === "carte"
        ? "absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-[7px] -skew-x-[18deg] border border-bordure bg-white/95 text-bleu shadow-sm transition hover:border-violet hover:text-violet"
        : "inline-flex min-h-10 items-center gap-2 rounded-[7px] -skew-x-[18deg] border border-bordure bg-white px-4 text-[13px] leading-5 font-semibold text-bleu transition hover:border-violet hover:text-violet";
    return (
      <Link href={hrefConnexion} aria-label="Se connecter pour épingler cette skill" className={classes}>
        <Pin className="size-4" aria-hidden />
        {variante === "fiche" && "Épingler"}
      </Link>
    );
  }

  // ── Connecté sans abonnement : invitation Premium ────────────────
  if (!premium) {
    const classes =
      variante === "carte"
        ? "absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-[7px] -skew-x-[18deg] border border-violet/30 bg-white/95 text-violet shadow-sm transition hover:border-violet"
        : "inline-flex min-h-10 items-center gap-2 rounded-[7px] -skew-x-[18deg] border border-violet/30 bg-violet/5 px-4 text-[13px] leading-5 font-semibold text-violet transition hover:border-violet";
    return (
      <Link href="/tarifs" aria-label="Épingler les skills est réservé aux abonnés" className={classes}>
        <Crown className="size-4" aria-hidden />
        {variante === "fiche" && "Réservé aux abonnés"}
      </Link>
    );
  }

  // ── Abonné Premium : bascule ─────────────────────────────────────
  async function basculer() {
    if (enCours) return;
    setEnCours(true);
    setMessage(null);
    try {
      const resultat = await basculerSkillFavori(skillId);
      if (resultat.ok) {
        setEpingle(Boolean(resultat.favori));
      } else {
        setMessage(messageDepuisRaison(resultat.raison));
      }
    } catch (erreur) {
      console.error("Épinglage de la skill impossible :", erreur);
      setMessage({ type: "erreur", texte: "Action impossible pour le moment — réessaie dans un instant." });
    } finally {
      setEnCours(false);
    }
  }

  if (variante === "carte") {
    return (
      <button
        type="button"
        onClick={basculer}
        disabled={enCours}
        aria-pressed={epingle}
        aria-label={epingle ? "Retirer de mes skills" : "Épingler dans mes skills"}
        title={epingle ? "Retirer de mes skills" : "Épingler dans mes skills"}
        className={cn(
          "absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-[7px] -skew-x-[18deg] border shadow-sm transition active:scale-90",
          epingle
            ? "border-violet bg-violet text-white"
            : "border-bordure bg-white/95 text-bleu hover:border-violet hover:text-violet",
          (enCours || enAttente) && "opacity-60",
        )}
      >
        <Pin className={cn("size-4", epingle && "fill-current")} aria-hidden />
      </button>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={basculer}
        disabled={enCours}
        aria-pressed={epingle}
        className={cn(
          "inline-flex min-h-10 items-center gap-2 rounded-[7px] -skew-x-[18deg] border px-4 text-[13px] leading-5 font-semibold transition active:scale-95",
          epingle
            ? "border-violet bg-violet/10 text-violet"
            : "border-bordure bg-white text-bleu hover:border-violet hover:text-violet",
          enCours && "opacity-60",
        )}
      >
        <Pin className={cn("size-4", epingle && "fill-current")} aria-hidden />
        {enCours ? "Enregistrement…" : epingle ? "Épinglée dans mon espace" : "Épingler dans mon espace"}
      </button>

      {message && (
        <span
          aria-live="polite"
          className={cn(
            "flex max-w-80 items-start gap-1.5 rounded-carte border p-2 text-[11.5px] leading-4 text-encre shadow-carte",
            message.type === "premium" && "border-violet/30 bg-white",
            message.type === "base" && "border-amber-300 bg-amber-50",
            message.type === "erreur" && "border-bordure bg-white",
          )}
        >
          {message.type === "premium" && <Crown className="mt-0.5 size-3.5 shrink-0 text-violet" aria-hidden />}
          {message.type === "base" && <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />}
          <span>
            {message.texte}{" "}
            {message.type === "premium" && (
              <Link href="/tarifs" className="font-semibold text-violet underline">
                Voir les plans
              </Link>
            )}
          </span>
        </span>
      )}
    </span>
  );
}

/** Traduit une raison serveur en message affichable dans le bouton. */
function messageDepuisRaison(
  raison: RaisonSkills | undefined,
): { type: "premium" | "base" | "erreur"; texte: string } {
  if (raison === "premium") {
    return {
      type: "premium",
      texte: "Épingler des skills est réservé aux abonnés Premium.",
    };
  }
  if (raison === "base") {
    return {
      type: "base",
      texte:
        "Fonctionnalité pas encore activée sur la base : lance npx prisma db push dans le terminal du projet, puis recharge la page.",
    };
  }
  return { type: "erreur", texte: "Action impossible pour le moment — réessaie dans un instant." };
}