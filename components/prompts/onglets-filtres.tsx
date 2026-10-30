// components/prompts/onglets-filtres.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 17 correctif — onglets « Catégories / Métiers » inspirés de
// godofprompt.ai/prompt-library : au lieu de deux rangées de pastilles
// collées sans repère, deux onglets bien visibles qui basculent le
// panneau affiché. Composant client minimal : il ne fait que changer
// le panneau visible ; les pastilles restent de vrais liens (SEO et
// navigation au clavier conservés, aucun filtre perdu).
// Charte : onglet actif = dégradé de marque, comme les pastilles.
// ─────────────────────────────────────────────────────────────────
"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import { Briefcase, LayoutGrid } from "lucide-react";

type Onglet = "categories" | "metiers";

/** Style de base d'un onglet (flex-1 sur mobile pour prendre la largeur). */
const BASE_ONGLET =
  "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-4 text-[13px] leading-4 font-semibold whitespace-nowrap transition sm:flex-none";

/** Badge du nombre, teinté selon l'état de l'onglet. */
const badge = (actif: boolean) =>
  `rounded-full px-2 py-0.5 text-[12px] leading-4 ${
    actif ? "bg-white/20 text-white" : "bg-gris text-encre/60"
  }`;

export function OngletsFiltres({
  ongletInitial = "categories",
  totalCategories,
  totalMetiers,
  panneauCategories,
  panneauMetiers,
}: {
  /** Onglet ouvert au chargement : déduit des filtres de l'URL côté serveur. */
  ongletInitial?: Onglet;
  totalCategories: number;
  totalMetiers: number;
  panneauCategories: ReactNode;
  panneauMetiers: ReactNode;
}) {
  const [actif, setActif] = useState<Onglet>(ongletInitial);

  return (
    <div className="mb-8">
      <div
        role="tablist"
        aria-label="Choisir entre le filtrage par catégorie ou par métier"
        className="mb-4 inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-bordure bg-white p-1 shadow-carte"
      >
        <button
          type="button"
          role="tab"
          aria-selected={actif === "categories"}
          onClick={() => setActif("categories")}
          className={
            actif === "categories"
              ? `${BASE_ONGLET} bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)]`
              : `${BASE_ONGLET} text-bleu hover:bg-gris hover:text-violet`
          }
        >
          <LayoutGrid className="size-4" aria-hidden /> Catégories
          <span className={badge(actif === "categories")}>{totalCategories}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={actif === "metiers"}
          onClick={() => setActif("metiers")}
          className={
            actif === "metiers"
              ? `${BASE_ONGLET} bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)]`
              : `${BASE_ONGLET} text-bleu hover:bg-gris hover:text-violet`
          }
        >
          <Briefcase className="size-4" aria-hidden /> Métiers
          <span className={badge(actif === "metiers")}>{totalMetiers}</span>
        </button>
      </div>

      {actif === "categories" ? panneauCategories : panneauMetiers}
    </div>
  );
}