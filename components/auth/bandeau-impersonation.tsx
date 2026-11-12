// components/auth/bandeau-impersonation.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Bandeau ROUGE permanent affiché tant qu'un admin navigue
// « en tant que » un membre (session de support). Visible sur TOUT le
// site (accueil, dashboard, tutoriels…), jamais pour le membre lui-
// même. Le bouton restaure la session admin d'origine en un clic.
// Client + route /api/impersonation/etat : aucune page n'est rendue
// dynamique par le bandeau.
// ─────────────────────────────────────────────────────────────────
"use client";

import { useEffect, useState } from "react";
import { Eye, LogOut } from "lucide-react";
import { terminerImpersonationFormulaire } from "@/app/actions/gestion-utilisateurs";

type EtatImpersonation = { actif: boolean; nom: string; email: string };

export function BandeauImpersonation() {
  const [etat, setEtat] = useState<EtatImpersonation | null>(null);

  useEffect(() => {
    let annule = false;
    fetch("/api/impersonation/etat")
      .then((r) => r.json())
      .then((d: EtatImpersonation) => {
        if (!annule) setEtat(d);
      })
      .catch(() => {});
    return () => {
      annule = true;
    };
  }, []);

  if (!etat?.actif) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-[80] border-b border-red-800 bg-red-600 text-white"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2 px-4 py-2 sm:justify-between">
        <p className="flex min-w-0 items-center gap-2 text-[13px] leading-4 font-semibold">
          <Eye className="size-4 shrink-0" aria-hidden />
          <span className="truncate">
            Session support : tu navigues en tant que{" "}
            <strong className="font-bold">{etat.nom}</strong> ({etat.email})
          </span>
        </p>
        <form action={terminerImpersonationFormulaire}>
          <button
            type="submit"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-[7px] -skew-x-[18deg] bg-white px-4 text-[13px] leading-4 font-bold text-red-700 transition hover:bg-red-50 active:scale-95"
          >
            <LogOut className="size-4" aria-hidden />
            Revenir à mon compte admin
          </button>
        </form>
      </div>
    </div>
  );
}
