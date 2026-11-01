// components/dashboard/carte-rappels-a-tester.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 20 — ⏰ Rappels « À tester » : carte qui ressort les outils
// restés en statut A_TESTER depuis 30 jours ou plus, pour relancer
// la découverte. Carte ambre douce, lien direct vers la fiche outil
// et vers la liste complète des favoris filtrée sur « À tester ».
// Composant serveur (aucun JS client). Ne s'affiche que s'il y a
// au moins un outil en attente.
// ─────────────────────────────────────────────────────────────────
import Link from "next/link";
import { AlarmClock, ChevronRight, ExternalLink } from "lucide-react";
import { Carte } from "@/components/ui/carte";

type OutilEnAttente = {
  nom: string;
  slug: string;
  jours: number;
};

export function CarteRappelsATester({ outils }: { outils: OutilEnAttente[] }) {
  if (outils.length === 0) return null;

  return (
    <Carte className="animate-apparition-haut border-amber-300/60 bg-amber-50/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-carte bg-amber-100 text-amber-700">
            <AlarmClock className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">
              Outils en attente depuis 30 jours et plus
            </h2>
            <p className="text-[13px] leading-4 text-encre">
              {outils.length === 1
                ? "1 outil attend d'être testé depuis plus d'un mois."
                : `${outils.length} outils attendent d'être testés depuis plus d'un mois.`}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard?onglet=favoris&statut=A_TESTER"
          className="inline-flex min-h-9 items-center rounded-full border border-amber-400 bg-white px-3.5 text-[12px] leading-4 font-bold text-amber-700 transition hover:bg-amber-100"
        >
          Voir mes « À tester »
        </Link>
      </div>

      <ul className="mt-4 grid gap-2">
        {outils.map((o) => (
          <li key={o.slug}>
            <Link
              href={`/outil/${o.slug}`}
              className="flex items-center gap-2.5 rounded-champ border border-amber-200 bg-white px-3 py-2.5 transition hover:border-amber-400"
            >
              <span className="min-w-0 flex-1 truncate text-[13px] leading-4 font-semibold text-bleu">
                {o.nom}
              </span>
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] leading-4 font-semibold text-amber-700">
                Ajouté il y a {o.jours} jour{o.jours > 1 ? "s" : ""}
              </span>
              <ExternalLink className="size-3.5 shrink-0 text-encre/50" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-3 flex items-center gap-1 text-[12px] leading-4 text-encre/70">
        Astuce : passe un outil en « En cours » ou « Adopté » depuis tes favoris
        pour qu'il quitte cette liste <ChevronRight className="size-3.5" aria-hidden />
      </p>
    </Carte>
  );
}
