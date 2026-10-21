//components/outil/carte-outil.tsx

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import CoeurFavori from "@/components/outil/coeur-favori";
import BoutonVote from "@/components/vote/bouton-vote";
import BadgeNote from "@/components/avis/badge-note";

/* ===================================================================== */
/*  TYPE — tolérant : accepte les données de lib/queries ET de /outils   */
/* ===================================================================== */

export type OutilCarte = {
  id?: string;
  nom: string;
  slug: string;
  logo: string | null;
  description: string;
  tarif: string | null;
  gratuit: boolean;
  openSource: boolean;
  type: string;
  nouveau?: boolean;
};

/* ===================================================================== */
/*  CARTE OUTIL                                                          */
/* ===================================================================== */

function CarteOutilView({ outil }: { outil: OutilCarte }) {
  return (
    <div className="group relative flex h-full flex-col rounded-carte border border-bordure bg-white p-5 shadow-carte transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
        <BoutonVote slug={outil.slug} compact />
        <CoeurFavori slug={outil.slug} />
      </div>

      <Link href={`/outil/${outil.slug}`} className="flex h-full flex-col">
        <div className="mb-3 flex items-center gap-3 pr-16">
          {outil.logo ? (
            <img
              src={outil.logo}
              alt=""
              className="h-11 w-11 shrink-0 rounded-lg border border-bordure object-contain p-1"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gris font-titre text-lg font-bold text-encre">
              {outil.nom.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              {outil.type === "AGENT" && (
                <span className="rounded-full bg-bleu/10 px-2 py-0.5 text-xs font-medium text-bleu">
                  Agent
                </span>
              )}
              {outil.gratuit && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  Gratuit
                </span>
              )}
              {outil.openSource && (
                <span className="rounded-full bg-gris px-2 py-0.5 text-xs font-medium text-encre">
                  Open source
                </span>
              )}
              {outil.nouveau && (
                <span className="rounded-full bg-violet px-2 py-0.5 text-xs font-semibold text-white">
                  Nouveau
                </span>
              )}
            </div>
            <h3 className="font-titre font-semibold text-encre">
              {outil.nom}
            </h3>
          </div>
        </div>

        <p className="mb-4 line-clamp-3 text-sm text-encre/70">
          {outil.description}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-encre">
              {outil.tarif || "Voir le site"}
            </span>
            <BadgeNote slug={outil.slug} />
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-bleu transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </Link>
    </div>
  );
}

/* ===================================================================== */
/*  EXPORTS — les 4 styles possibles, plus aucune erreur d'import        */
/* ===================================================================== */

export { CarteOutilView, CarteOutilView as CarteOutil };
export default CarteOutilView;