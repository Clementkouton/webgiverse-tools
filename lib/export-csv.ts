// lib/export-csv.ts
// ─────────────────────────────────────────────────────────────────
// Lot 26 — helpers d'EXPORT CSV partagés par les routes de la console
// admin (segments d'utilisateurs, statistiques de recherche).
// Même format que la sauvegarde du Lot 25 : séparateur « ; » + BOM
// UTF-8 pour que Excel affiche les accents correctement.
// (Ne pas confondre avec lib/csv.ts = mini-parseur d'IMPORT du Lot 23.)
// ─────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";

/** Sérialise une valeur pour une cellule CSV (séparateur « ; »). */
export function celluleCsv(valeur: unknown): string {
  let texte: string;
  if (valeur === null || valeur === undefined) texte = "";
  else if (valeur instanceof Date) texte = valeur.toISOString();
  else if (typeof valeur === "object") texte = JSON.stringify(valeur);
  else texte = String(valeur);
  if (/[;"\n]/.test(texte)) return `"${texte.replace(/"/g, '""')}"`;
  return texte;
}

/** Construit un CSV à partir de lignes objets (colonnes = union des clés). */
export function versCsv(lignes: Record<string, unknown>[]): string {
  if (lignes.length === 0) return "(aucune ligne)";
  const colonnes = [
    ...lignes.reduce((set, l) => {
      Object.keys(l).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  ];
  const entete = colonnes.join(";");
  const corps = lignes
    .map((l) => colonnes.map((c) => celluleCsv(l[c])).join(";"))
    .join("\n");
  return `\uFEFF${entete}\n${corps}`;
}

/** Réponse fichier avec en-têtes de téléchargement. */
export function reponseFichierCsv(contenu: string, nomFichier: string) {
  return new NextResponse(contenu, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
      "Cache-Control": "no-store",
    },
  });
}
