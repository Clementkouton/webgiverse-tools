// components/tutoriels/barre-outils.tsx
// Lot 12 correctif — barre des pastilles d'outils de /tutoriels.
// AVANT : toutes les pastilles étaient affichées d'un coup (60+ outils,
// illisible). DÉSORMAIS : les 14 outils les plus fréquents d'abord,
// avec leur nombre de tutoriels, puis un bouton « +N autres outils »
// qui déplie le reste (mémorisé côté client pendant la navigation).
// Composant CLIENT car il garde l'état déplié/replié entre les clics ;
// les liens sont reconstruits ici en conservant les autres filtres
// (recherche, niveau, tri) — charte violette inchangée.
"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

/** Nombre de pastilles visibles avant le bouton « +N autres outils ». */
const VISIBLES = 14;

type Outil = { nom: string; total: number };

export function BarreOutils({
  outils,
  actif,
  q,
  niveau,
  tri,
}: {
  outils: Outil[];
  actif: string; // outil actuellement filtré ("" = tous)
  q: string; // recherche en cours (conservée dans les liens)
  niveau: string; // niveau en cours (conservé)
  tri: string; // tri en cours (conservé)
}) {
  const [deplie, setDeplie] = useState(false);

  // Reconstruit un lien /tutoriels en conservant les autres filtres.
  const href = (outil: string) => {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    if (niveau) usp.set("niveau", niveau);
    if (outil) usp.set("outil", outil);
    if (tri) usp.set("tri", tri);
    const s = usp.toString();
    return `/tutoriels${s ? `?${s}` : ""}`;
  };

  const classe = (actif_: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-[13px] leading-4 font-medium transition ${
      actif_
        ? "border-violet bg-violet text-white"
        : "border-bordure bg-white text-bleu hover:border-violet hover:text-violet"
    }`;

  const visibles = deplie ? outils : outils.slice(0, VISIBLES);
  const restants = outils.length - VISIBLES;

  return (
    <div className="mb-8 flex flex-wrap items-center gap-2">
      <Link href={href("")} className={classe(!actif)}>
        Tous
      </Link>
      {visibles.map((o) => (
        <Link
          key={o.nom}
          href={href(actif === o.nom ? "" : o.nom)}
          className={classe(actif === o.nom)}
          title={`${o.total} tutoriel${o.total > 1 ? "s" : ""} sur ${o.nom}`}
        >
          {o.nom}
          <span className={`ml-1.5 text-[11px] leading-3 ${actif === o.nom ? "opacity-80" : "opacity-50"}`}>
            {o.total}
          </span>
        </Link>
      ))}
      {restants > 0 && (
        <button
          type="button"
          onClick={() => setDeplie((v) => !v)}
          aria-expanded={deplie}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-violet/50 bg-violet/5 px-3.5 py-1.5 text-[13px] leading-4 font-medium text-violet transition hover:bg-violet/10"
        >
          {deplie ? (
            <>
              <ChevronUp className="size-3.5" aria-hidden /> Réduire
            </>
          ) : (
            <>
              <ChevronDown className="size-3.5" aria-hidden /> +{restants} autres outils
            </>
          )}
        </button>
      )}
    </div>
  );
}