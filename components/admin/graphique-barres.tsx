// components/admin/graphique-barres.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 22 — Graphique en barres verticales « TailwindAdmin » de la
// console admin : barres indigo arrondies, valeurs affichées
// au-dessus, grille légère. 100 % SVG statique rendu côté serveur :
// aucune librairie, aucun JS client.
// Lot 37 — CORRECTIF : quand le maximum valait 1, l'axe affichait
// « 1, 1, 0 » (la ligne médiane 0,5 était arrondie à 1). Désormais
// la ligne médiane n'apparaît que si son étiquette entière est
// différente du maximum et de zéro.
// ─────────────────────────────────────────────────────────────────

type Props = {
  /** Une valeur par colonne, de la plus ancienne à la plus récente. */
  valeurs: number[];
  /** Étiquette de chaque colonne (ex. « 18 », « 19 »… ou « lun »). */
  labels: string[];
  /** Couleur des barres (indigo de la console par défaut). */
  couleur?: string;
};

export function GraphiqueBarres({ valeurs, labels, couleur = "#5d87ff" }: Props) {
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

  // Grille : ligne du maximum, ligne médiane (si son étiquette
  // entière est utile), ligne du zéro.
  const milieu = Math.round(maxV / 2);
  const grille = [
    { yY: MARGE_H, etiq: String(maxV) },
    ...(milieu > 0 && milieu < maxV
      ? [{ yY: MARGE_H + hauteurUtile / 2, etiq: String(milieu) }]
      : []),
    { yY: MARGE_H + hauteurUtile, etiq: "0" },
  ];

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
          <line x1={MARGE_G} x2={LARGEUR - MARGE_D} y1={g.yY} y2={g.yY} stroke="#eef2f7" strokeWidth="1" />
          <text x={MARGE_G - 8} y={g.yY + 4} textAnchor="end" fontSize="11" fill="#99a1af">
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
                fill="#202936"
              >
                {v}
              </text>
            )}
            <text
              x={cx(i)}
              y={HAUTEUR - 8}
              textAnchor="middle"
              fontSize={labels.length > 10 ? "10" : "11"}
              fill="#99a1af"
            >
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}