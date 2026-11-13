// components/skills/bouton-epingle.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 43 — Bouton « Épingler / Déépingler » une skill dans « Mes skills
// favoris » (dashboard). Composant CLIENT : appelle l'action serveur
// basculerFavoriSkill (verrou Premium côté serveur) via useTransition.
// ─────────────────────────────────────────────────────────────────
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Pin, Sparkles } from "lucide-react";
import { basculerFavoriSkill } from "@/app/actions/skills-favoris";

type Props = {
  skillId: string;
  /** État initial lu côté serveur (estEpingleSkill). */
  epingleInitial: boolean;
};

export function BoutonEpingle({ skillId, epingleInitial }: Props) {
  const [epingle, setEpingle] = useState(epingleInitial);
  const [note, setNote] = useState<{ type: "premium" | "connexion" | "indisponible" } | null>(null);
  const [enCours, demarrer] = useTransition();

  function basculer() {
    setNote(null);
    demarrer(async () => {
      const resultat = await basculerFavoriSkill(skillId);
      if (resultat.raison === "premium") setNote({ type: "premium" });
      else if (resultat.raison === "non-connecte") setNote({ type: "connexion" });
      else if (resultat.raison === "indisponible" || resultat.raison === "base" || resultat.raison === "client")
        setNote({ type: "indisponible" });
      else setEpingle(resultat.epingle);
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={basculer}
        disabled={enCours}
        aria-pressed={epingle}
        className={
          epingle
            ? "inline-flex min-h-10 items-center gap-1.5 rounded-[7px]  not-italic bg-violet px-4 text-[13px] leading-4 font-semibold text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)] transition hover:bg-violet/90 active:scale-95 disabled:opacity-60"
            : "inline-flex min-h-10 items-center gap-1.5 rounded-[7px]  not-italic border border-violet/30 bg-white px-4 text-[13px] leading-4 font-semibold text-sky-500 transition hover:bg-violet hover:text-white active:scale-95 disabled:opacity-60"
        }
      >
        <Pin className={epingle ? "size-4 fill-current" : "size-4"} aria-hidden />
        {enCours ? "…" : epingle ? "Épinglé" : "Épingler"}
      </button>

      {note?.type === "premium" && (
        <span className="inline-flex items-center gap-1.5 text-[12px] leading-4 text-encre">
          <Sparkles className="size-3.5 text-sky-500" aria-hidden /> Réservé aux abonnés
          <Link href="/tarifs" className="font-semibold text-sky-500 hover:underline">
            Passer Premium
          </Link>
        </span>
      )}
      {note?.type === "connexion" && (
        <span className="inline-flex items-center gap-1.5 text-[12px] leading-4 text-encre">
          <Link href="/connexion" className="font-semibold text-sky-500 hover:underline">
            Se connecter
          </Link>
          pour épingler cette skill.
        </span>
      )}
      {note?.type === "indisponible" && (
        <span className="text-[12px] leading-4 text-encre">
          Action momentanément indisponible — réessaie dans un instant.
        </span>
      )}
    </span>
  );
}