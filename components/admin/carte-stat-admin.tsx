// components/admin/carte-stat-admin.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 21 — Carte statistique « Spark » de la console admin :
// icône sur tuile vert clair, valeur en gros, tendance ± % vs le
// mois dernier (flèche verte/rouge) et mini courbe (sparkline SVG
// statique rendue côté serveur). Aucun dégradé, aucune librairie.
// ─────────────────────────────────────────────────────────────────
import Link from "next/link";
import { Minus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  libelle: string;
  valeur: number | string;
  icone: LucideIcon;
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

/** Mini courbe SVG 96×36 — trait vert si ça monte, rouge si ça baisse. */
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
  const couleur = donnees[donnees.length - 1] >= donnees[0] ? "#17854f" : "#dc2626";

  return (
    <svg viewBox={`0 0 ${L} ${H}`} aria-hidden className="h-9 w-24 shrink-0">
      <path d={aire} fill={couleur} fillOpacity="0.09" />
      <path d={trace} fill="none" stroke={couleur} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CarteStatAdmin({
  href,
  libelle,
  valeur,
  icone: Icone,
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
      className="animate-apparition-haut group flex items-center justify-between gap-4 rounded-carte border border-bordure bg-white p-5 shadow-carte transition hover:border-vert/40"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-vert-clair text-vert transition-transform duration-300 group-hover:scale-110">
            <Icone className="size-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-titre text-[24px] leading-8 font-bold text-bleu">{valeur}</span>
            <span className="block truncate text-[13px] leading-4 font-semibold text-bleu">{libelle}</span>
          </span>
        </span>
        <span className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] leading-4">
          {tendance !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold",
                montante && "bg-vert-clair text-vert-fonce",
                descendante && "bg-red-50 text-red-700",
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
          <span className="truncate text-encre">{contexte ?? libelleTendance}</span>
        </span>
      </span>
      {donnees && donnees.length > 1 && <Etincelle donnees={donnees} />}
    </Link>
  );
}