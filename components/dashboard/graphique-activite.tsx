// components/dashboard/graphique-activite.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 18 — Graphique « Mon activité des 7 derniers jours » (style
// Metis) : courbe lissée avec aire en dégradé de marque, grille
// légère, points et étiquettes de jours. 100 % SVG statique rendu
// côté serveur : aucune librairie de graphiques, aucun JS client,
// aucune dépendance à installer. Charte : trait violet, aire dégradée.
// ─────────────────────────────────────────────────────────────────

type Props = {
  /** Une valeur par jour, du plus ancien (gauche) au plus récent. */
  valeurs: number[];
  /** Étiquette de chaque jour (ex. « lun », « mar »…). */
  labels: string[];
};

/** Construit un chemin lissé (courbes de Bézier par points milieux). */
function cheminLisse(
  points: readonly (readonly [number, number])[],
): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]},${points[0][1]}`;
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const mx = (x0 + x1) / 2;
    d += ` C ${mx},${y0} ${mx},${y1} ${x1},${y1}`;
  }
  return d;
}

export function GraphiqueActivite({ valeurs, labels }: Props) {
  const LARGEUR = 600;
  const HAUTEUR = 230;
  const MARGE_G = 36;
  const MARGE_D = 14;
  const MARGE_H = 22;
  const MARGE_B = 30;

  const maxV = Math.max(...valeurs, 1);
  const n = Math.max(valeurs.length, 2);
  const x = (i: number) =>
    MARGE_G + (i * (LARGEUR - MARGE_G - MARGE_D)) / (n - 1);
  const y = (v: number) =>
    MARGE_H + (1 - v / maxV) * (HAUTEUR - MARGE_H - MARGE_B);

  const points = valeurs.map((v, i) => [x(i), y(v)] as const);
  const courbe = cheminLisse(points);
  const aire = points.length
    ? `${courbe} L ${x(n - 1)},${HAUTEUR - MARGE_B} L ${x(0)},${HAUTEUR - MARGE_B} Z`
    : "";

  // Grille : 3 lignes (max, moitié, zéro) avec leur étiquette d'axe.
  const grille = [1, 0.5, 0].map((ratio) => {
    const v = Math.round(maxV * ratio);
    return { yY: y(maxV * ratio), etiq: String(v) };
  });

  return (
    <svg
      viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
      role="img"
      aria-label="Graphique de l'activité des 7 derniers jours"
      className="h-auto w-full"
    >
      <defs>
        <linearGradient id="wgv-aire" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6a3bff" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#00d1ff" stopOpacity="0.03" />
        </linearGradient>
      </defs>

      {/* Grille + étiquettes d'axe */}
      {grille.map((g, i) => (
        <g key={i}>
          <line
            x1={MARGE_G} x2={LARGEUR - MARGE_D} y1={g.yY} y2={g.yY}
            stroke="#e5e9f2" strokeWidth="1"
          />
          <text
            x={MARGE_G - 8} y={g.yY + 4}
            textAnchor="end" fontSize="11" fill="#8a94a6"
          >
            {g.etiq}
          </text>
        </g>
      ))}

      {/* Aire + courbe */}
      {aire && <path d={aire} fill="url(#wgv-aire)" />}
      {courbe && (
        <path
          d={courbe}
          fill="none"
          stroke="#6a3bff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Points + valeur au-dessus de chaque point non nul */}
      {points.map(([px, py], i) => (
        <g key={i}>
          <circle
            cx={px} cy={py} r="4"
            fill="#ffffff" stroke="#6a3bff" strokeWidth="2.5"
          />
          {valeurs[i] > 0 && (
            <text
              x={px} y={py - 10}
              textAnchor="middle" fontSize="11" fontWeight="600" fill="#0b1b3f"
            >
              {valeurs[i]}
            </text>
          )}
        </g>
      ))}

      {/* Étiquettes de jours */}
      {labels.map((l, i) => (
        <text
          key={`${l}-${i}`}
          x={x(i)} y={HAUTEUR - 8}
          textAnchor="middle" fontSize="11" fill="#8a94a6"
        >
          {l}
        </text>
      ))}
    </svg>
  );
}
