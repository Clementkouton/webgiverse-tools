// components/dashboard/carte-statistique.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 18 — Carte statistique du tableau de bord (style Metis) :
// icône dans une tuile colorée douce, valeur en gros, libellé et
// ligne de contexte (limite du plan, niveau, etc.). Composant serveur
// pur : un simple lien présentationnel, aucune logique, aucun état.
// Teintes limitées aux jetons de la charte (violet, ciel, turquoise,
// magenta) — la police du site est conservée (font-titre).
// ─────────────────────────────────────────────────────────────────
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TeinteStat = "violet" | "ciel" | "turquoise" | "magenta";

const TEINTES: Record<TeinteStat, string> = {
  violet: "bg-sky-500/10 text-sky-500",
  ciel: "bg-ciel/15 text-[#00648a]",
  turquoise: "bg-turquoise/30 text-bleu",
  magenta: "bg-magenta/10 text-magenta",
};

export function CarteStatistique({
  href,
  libelle,
  valeur,
  contexte,
  icone: Icone,
  teinte = "violet",
  delay = 0,
}: {
  href: string;
  libelle: string;
  valeur: number | string;
  /** Ligne de contexte sous le libellé (limite, niveau, détail…). */
  contexte?: string;
  icone: LucideIcon;
  teinte?: TeinteStat;
  /** Décalage de l'animation d'apparition (ms). */
  delay?: number;
}) {
  return (
    <Link
      href={href}
      style={{ animationDelay: `${delay}ms` }}
      className="animate-apparition-haut survol-carte group flex items-center gap-4 rounded-carte border border-bordure bg-white p-5 shadow-carte transition hover:border-sky-500/40"
    >
      <span
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-carte transition-transform duration-300 group-hover:scale-110",
          TEINTES[teinte],
        )}
      >
        <Icone className="size-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-titre text-[24px] leading-8 font-bold text-bleu">{valeur}</span>
        <span className="block truncate text-[13px] leading-4 font-semibold text-bleu">{libelle}</span>
        {contexte && (
          <span className="mt-0.5 block truncate text-[12px] leading-4 text-encre">{contexte}</span>
        )}
      </span>
    </Link>
  );
}
