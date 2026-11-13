// components/admin/carte-stat-admin.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 22 — Carte statistique « TailwindAdmin » de la console admin :
// icône sur pastille pastel (indigo / info / menthe / ambre / corail,
// comme les tuiles du template), valeur en gros, tendance ± % vs le
// mois dernier (badge doux vert menthe / corail) et mini courbe SVG
// statique rendue côté serveur. Aucun dégradé, aucune librairie.
// Lot 37 — CORRECTIF responsive : la ligne de contexte peut rétrécir
// (min-w-0) au lieu de pousser la carte plus large que sa colonne.
// ─────────────────────────────────────────────────────────────────
import Link from "next/link";
import { Minus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  libelle: string;
  valeur: number | string;
  icone: LucideIcon;
  /** Couleur de la pastille d'icône (palette TailwindAdmin). */
  ton?: Ton;
  /** Variation en % vs la période précédente (null = pas de tendance). */
  tendance?: number | null;
  /** Libellé de la tendance (ex. « vs le mois dernier »). */
  libelleTendance?: string;
  /** Ligne de contexte sous le libellé (ex. « 46 fiches au total »). */
  contexte?: string;
  /** 7 à 14 valeurs pour la mini-courbe (du plus ancien au plus récent). */
  donnees?: number[];
  /** Décalage de l'animation d'apparition (ms). */
  delay?: number;
};

export type Ton = "primaire" | "info" | "succes" | "alerte" | "erreur";

/** Pastilles pastel officielles du template + texte foncé assorti. */
export const PASTILLE_TUILE: Record<Ton, string> = {
  primaire: "bg-primaire/10 text-primaire-texte",
  info: "bg-adm-info-doux text-[#2b6be0]",
  succes: "bg-adm-succes-doux text-[#0f9b85]",
  alerte: "bg-adm-alerte-doux text-[#b26f00]",
  erreur: "bg-adm-erreur-doux text-[#c94f35]",
};

/** Mini courbe SVG 96×36 — trait indigo si ça monte, corail si ça baisse. */
function Etincelle({ donnees }: { donnees: number[] }) {
  const L = 96;
  const H = 36;
  const maxV = Math.max(...donnees, 1);
  const n = Math.max(donnees.length, 2);
  const points = donnees.map((v, i) => [
    (i * L) / (n - 1),
    H - 4 - (v / maxV) * (H - 10),
  ] as const);
  const trace = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const aire = `${trace} L ${L},${H} L 0,${H} Z`;
  const couleur = donnees[donnees.length - 1] >= donnees[0] ? "#5d87ff" : "#fa896b";

  return (
    <svg viewBox={`0 0 ${L} ${H}`} aria-hidden className="h-9 w-24 shrink-0">
      <path d={aire} fill={couleur} fillOpacity="0.10" />
      <path d={trace} fill="none" stroke={couleur} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CarteStatAdmin({
  href,
  libelle,
  valeur,
  icone: Icone,
  ton = "primaire",
  tendance = null,
  libelleTendance = "vs le mois dernier",
  contexte,
  donnees,
  delay = 0,
}: Props) {
  const montante = tendance !== null && tendance > 0;
  const descendante = tendance !== null && tendance < 0;

  return (
    <Link
      href={href}
      style={{ animationDelay: `${delay}ms` }}
      className="animate-apparition-haut group flex items-center justify-between gap-4 rounded-carte border border-adm-bordure bg-white p-5 shadow-carte transition hover:border-primaire/40 hover:shadow-[0_8px_28px_rgba(93,135,255,0.12)]"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-3">
          <span
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110",
              PASTILLE_TUILE[ton],
            )}
          >
            <Icone className="size-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-titre text-[24px] leading-8 font-bold text-adm-sombre">{valeur}</span>
            <span className="block truncate text-[13px] leading-4 font-semibold text-adm-gris">{libelle}</span>
          </span>
        </span>
        <span className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] leading-4">
          {tendance !== null && (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-[7px]  not-italic px-1.5 py-0.5 font-semibold",
                montante && "bg-adm-succes-doux text-[#0f9b85]",
                descendante && "bg-adm-erreur-doux text-[#c94f35]",
                !montante && !descendante && "bg-gris text-encre",
              )}
            >
              {montante ? (
                <TrendingUp className="size-3.5" aria-hidden />
              ) : descendante ? (
                <TrendingDown className="size-3.5" aria-hidden />
              ) : (
                <Minus className="size-3.5" aria-hidden />
              )}
              {montante ? "+" : ""}{tendance} %
            </span>
          )}
          <span className="min-w-0 truncate text-adm-gris">{contexte ?? libelleTendance}</span>
        </span>
      </span>
      {donnees && donnees.length > 1 && <Etincelle donnees={donnees} />}
    </Link>
  );
}