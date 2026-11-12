// components/dashboard/selecteur-statut.tsx
"use client";
import { useState } from "react";
import { majStatutFavori } from "@/app/actions/favoris";

const OPTIONS = [
  { valeur: "A_TESTER", libelle: "À tester" },
  { valeur: "EN_COURS", libelle: "En cours" },
  { valeur: "ADOPTE", libelle: "Adopté" },
] as const;

export function SelecteurStatut({ favoriId, statut }: { favoriId: string; statut: string }) {
  const [valeur, setValeur] = useState(statut);
  return (
    <div role="group" aria-label="Statut de l'outil" className="flex flex-wrap gap-1.5">
      {OPTIONS.map((o) => (
        <button key={o.valeur} type="button" aria-pressed={valeur === o.valeur}
          onClick={() => { setValeur(o.valeur); majStatutFavori(favoriId, o.valeur); }}
          className={`min-h-9 rounded-[7px] -skew-x-[18deg] border px-3.5 text-[13px] leading-4 font-medium transition ${
            valeur === o.valeur ? "border-sky-500 bg-sky-500/10 text-sky-500" : "border-bordure bg-white text-encre hover:border-sky-500"}`}>
          {o.libelle}
        </button>
      ))}
    </div>
  );
}