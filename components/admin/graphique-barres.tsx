// components/admin/graphique-barres.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 21 — Graphique en barres verticales « Spark » de la console
// admin : barres vert arrondies, valeurs affichées au-dessus, grille
// légère. 100 % SVG statique rendu côté serveur : aucune librairie,
// aucun JS client.
// ─────────────────────────────────────────────────────────────────

type Props = {
  /** Une valeur par colonne, de la plus ancienne à la plus récente. */
  valeurs: number[];
  /** Étiquette de chaque colonne (ex. « 18 », « 19 »… ou « lun »). */
  labels: string[];
  /** Couleur des barres (vert de la console par défaut). */
  couleur?: string;
};

export function GraphiqueBarres({ valeurs, labels, couleur = "#17854f" }: Props) {
  const LARGEUR = 600;
  const HAUTEUR = 230;
  const MARGE_G = 30;
  const MARGE_D = 10;
  const MARGE_H = 24;
  const MARGE_B = 28;

  const maxV = Math.max(...valeurs, 1);
  const n = Math.max(valeurs.length, 1);
  const largeurUtile = LARGEUR - MARGE_G - MARGE_D;
  const bande = largeurUtile / n;
  const barre = Math.min(bande * 0.55, 30);
  const hauteurUtile = HAUTEUR - MARGE_H - MARGE_B;
  const h = (v: number) => (v / maxV) * hauteurUtile;
  const cx = (i: number) => MARGE_G + bande * i + bande / 2;

  // Grille : 3 lignes (max, moitié, zéro) avec leur étiquette d'axe.
  const grille = [1, 0.5, 0].map((ratio) => ({
    yY: MARGE_H + (1 - ratio) * hauteurUtile,
    etiq: String(Math.round(maxV * ratio)),
  }));

  return (
    <svg
      viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
      role="img"
      aria-label="Graphique en barres"
      className="h-auto w-full"
    >
      {/* Grille + étiquettes d'axe */}
      {grille.map((g, i) => (
        <g key={i}>
          <line x1={MARGE_G} x2={LARGEUR - MARGE_D} y1={g.yY} y2={g.yY} stroke="#e5e9f2" strokeWidth="1" />
          <text x={MARGE_G - 8} y={g.yY + 4} textAnchor="end" fontSize="11" fill="#8a94a6">
            {g.etiq}
          </text>
        </g>
      ))}

      {/* Barres + valeurs */}
      {valeurs.map((v, i) => {
        const hauteurBarre = Math.max(h(v), v > 0 ? 3 : 0);
        return (
          <g key={i}>
            {v > 0 && (
              <rect
                x={cx(i) - barre / 2}
                y={HAUTEUR - MARGE_B - hauteurBarre}
                width={barre}
                height={hauteurBarre}
                rx={Math.min(5, barre / 2)}
                fill={couleur}
              />
            )}
            {v > 0 && (
              <text
                x={cx(i)}
                y={HAUTEUR - MARGE_B - hauteurBarre - 7}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#0b1b3f"
              >
                {v}
              </text>
            )}
            <text
              x={cx(i)}
              y={HAUTEUR - 8}
              textAnchor="middle"
              fontSize={labels.length > 10 ? "10" : "11"}
              fill="#8a94a6"
            >
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}