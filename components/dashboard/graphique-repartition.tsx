// components/dashboard/graphique-repartition.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 18 — Graphique en anneau « Répartition » (style Metis) :
// segments en stroke-dasharray, total au centre, légende avec valeur
// et pourcentage. 100 % SVG statique côté serveur : aucune librairie.
// Les couleurs sont passées par le parent (jetons hex de la charte).
// ─────────────────────────────────────────────────────────────────

export type SegmentRepartition = {
  libelle: string;
  valeur: number;
  /** Couleur hex du segment (ex. #6a3bff pour le violet de marque). */
  couleur: string;
};

type Props = {
  segments: SegmentRepartition[];
  /** Total de référence (somme des segments si omis). */
  total?: number;
  /** Libellé sous le total au centre (ex. « favoris »). */
  totalLibelle?: string;
};

export function GraphiqueRepartition({ segments, total, totalLibelle = "" }: Props) {
  const TAILLE = 190;
  const CENTRE = TAILLE / 2;
  const RAYON = 70;
  const EPAISSEUR = 22;
  const CIRCONF = 2 * Math.PI * RAYON;

  const somme =
    total !== undefined
      ? total
      : segments.reduce((s, seg) => s + seg.valeur, 0);
  const segmentsVisibles = segments.filter((s) => s.valeur > 0);

  // Offsets cumulés : chaque segment démarre là où le précédent s'arrête.
  let cumul = 0;
  const arcs = segments.map((seg) => {
    const part = somme > 0 ? seg.valeur / somme : 0;
    const arc = {
      ...seg,
      longueur: part * CIRCONF,
      decalage: cumul * CIRCONF,
      pct: Math.round(part * 100),
    };
    cumul += part;
    return arc;
  });

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg
        viewBox={`0 0 ${TAILLE} ${TAILLE}`}
        role="img"
        aria-label="Graphique en anneau de la répartition"
        className="h-[190px] w-[190px] shrink-0"
      >
        {/* Anneau de fond (visible quand tout est à zéro) */}
        <circle
          cx={CENTRE} cy={CENTRE} r={RAYON}
          fill="none" stroke="#eef1f7" strokeWidth={EPAISSEUR}
        />
        {/* Segments — départ à midi via rotation -90° */}
        <g transform={`rotate(-90 ${CENTRE} ${CENTRE})`}>
          {arcs.map((a) =>
            a.longueur > 0 ? (
              <circle
                key={a.libelle}
                cx={CENTRE} cy={CENTRE} r={RAYON}
                fill="none"
                stroke={a.couleur}
                strokeWidth={EPAISSEUR}
                strokeDasharray={`${a.longueur} ${CIRCONF - a.longueur}`}
                strokeDashoffset={-a.decalage}
              />
            ) : null,
          )}
        </g>
        {/* Total au centre */}
        <text
          x={CENTRE} y={CENTRE - 2}
          textAnchor="middle" fontSize="30" fontWeight="700" fill="#0b1b3f"
          className="font-titre"
        >
          {somme}
        </text>
        {totalLibelle && (
          <text
            x={CENTRE} y={CENTRE + 18}
            textAnchor="middle" fontSize="12" fill="#8a94a6"
          >
            {totalLibelle}
          </text>
        )}
      </svg>

      {/* Légende */}
      <ul className="grid gap-2.5">
        {arcs.map((a) => (
          <li key={a.libelle} className="flex items-center gap-2.5 text-[13px] leading-4">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: a.couleur }}
            />
            <span className="min-w-0 flex-1 font-medium text-bleu">{a.libelle}</span>
            <span className="shrink-0 tabular-nums text-encre">
              {a.valeur} · {a.pct}%
            </span>
          </li>
        ))}
        {segmentsVisibles.length === 0 && (
          <li className="text-[13px] leading-4 text-encre">Aucune donnée</li>
        )}
      </ul>
    </div>
  );
}
