// lib/csv.ts
// ─────────────────────────────────────────────────────────────────
// Lot 23 — Mini-parseur CSV (sans dépendance) pour l'import en masse
// des outils, tutoriels et prompts depuis /admin/import.
//   • détection automatique du séparateur (; , tab) ;
//   • guillemets RFC 4180 : « "..." » protège les virgules/points-
//     virgules et autorise PLUSIEURS LIGNES dans une cellule (utile
//     pour le contenu complet d'un prompt) ; "" = guillemet littéral ;
//   • en-têtes normalisés : accents, espaces, majuscules et tirets
//     ignorés → « Durée min », "duree_min" et "DURÉE-MIN" marchent.
// ─────────────────────────────────────────────────────────────────

export type LigneCsv = Record<string, string>;

/** Enlève accents et caractères non alphanumériques, tout en minuscules. */
export function normaliserEntete(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Découpe le texte brut en lignes de cellules (respecte les guillemets). */
function decouperLignes(texte: string, separateur: string): string[][] {
  const lignes: string[][] = [];
  let cellule = "";
  let ligne: string[] = [];
  let entreGuillemets = false;

  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];

    if (entreGuillemets) {
      if (c === '"') {
        if (texte[i + 1] === '"') {
          cellule += '"';
          i++;
        } else {
          entreGuillemets = false;
        }
      } else {
        cellule += c;
      }
      continue;
    }

    // Guillemet OUVRANT : seulement en DÉBUT de cellule (RFC 4180).
    // Avant (Lot 23) tout guillemet basculait en mode « entre
    // guillemets » : un guillemet non apparié au milieu d'une
    // description avalait la fin de la ligne, voire les lignes
    // suivantes → lignes fantômes à l'import.
    if (c === '"') {
      if (cellule === "") {
        entreGuillemets = true;
      } else {
        cellule += c; // guillemet au milieu d'un texte = littéral
      }
    } else if (c === separateur) {
      ligne.push(cellule);
      cellule = "";
    } else if (c === "\n") {
      ligne.push(cellule);
      lignes.push(ligne);
      ligne = [];
      cellule = "";
    } else if (c !== "\r") {
      cellule += c;
    }
  }

  // Dernière ligne (fichier sans saut final)
  if (cellule !== "" || ligne.length > 0) {
    ligne.push(cellule);
    lignes.push(ligne);
  }

  return lignes;
}

export type CsvParse = {
  /** Lignes prêtes à l'emploi, clés = en-têtes normalisés. */
  lignes: LigneCsv[];
  /** En-têtes tels qu'écrits dans le fichier (pour les messages d'erreur). */
  enTetes: string[];
  /** En-têtes normalisés (pour savoir quelles colonnes le fichier contient). */
  colonnes: Set<string>;
  /** Nombre de lignes de données détectées. */
  total: number;
};

/**
 * Parse un CSV. Renvoie `null` si le fichier est vide ou sans en-têtes.
 * Accepte aussi les colonnes en trop : elles sont simplement ignorées.
 */
export function parserCsv(texteBrut: string): CsvParse | null {
  const texte = texteBrut.replace(/^\uFEFF/, "").trim();
  if (!texte) return null;

  // Détection du séparateur sur la 1re ligne : le plus fréquent gagne
  const premiere = texte.split("\n")[0] ?? "";
  const candidats = [";", ",", "\t"];
  let separateur = ";";
  let meilleur = -1;
  for (const c of candidats) {
    const n = premiere.split(c).length - 1;
    if (n > meilleur) {
      meilleur = n;
      separateur = c;
    }
  }
  if (meilleur === 0) return null; // aucun séparateur → fichier incompréhensible

  const brutes = decouperLignes(texte, separateur);
  if (brutes.length === 0) return null;

  const enTetes = (brutes.shift() ?? []).map((h) => h.trim());
  if (enTetes.every((h) => h === "")) return null;

  const cles = enTetes.map(normaliserEntete);

  const lignes: LigneCsv[] = brutes
    .filter((l) => l.some((c) => c.trim() !== "")) // saute les lignes vides
    .map((cells) => {
      const objet: LigneCsv = {};
      cles.forEach((cle, i) => {
        if (cle) objet[cle] = (cells[i] ?? "").trim();
      });
      return objet;
    });

  return { lignes, enTetes, colonnes: new Set(cles.filter(Boolean)), total: lignes.length };
}

/** lit `ligne[champ]` sans se soucier de la casse du nom de colonne. */
export function lit(ligne: LigneCsv, champ: string): string {
  return ligne[normaliserEntete(champ)] ?? "";
}

/** "1", "true", "oui", "vrai", "yes", "x" → true ; le reste → false. */
export function booleen(valeur: string | undefined): boolean {
  return /^(1|true|oui|vrai|yes|y|x)$/i.test((valeur ?? "").trim());
}

/** Entier sûr : vide / invalide → `defaut`. */
export function entier(valeur: string | undefined, defaut: number): number {
  const n = Number.parseInt((valeur ?? "").trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : defaut;
}

/** Découpe « A | B | C » en tableau propre (30 éléments max). */
export function decouper(valeur: string | undefined, max = 30): string[] {
  return (valeur ?? "")
    .split("|")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, max);
}

/** Slug unique dans un lot : « nom », « nom-2 », « nom-3 »… */
export class Sluggeur {
  private pris = new Set<string>();

  constructor(
    private base: (texte: string) => string,
    private occupes: Set<string> = new Set(),
  ) {}

  de(texte: string): string {
    const racine = this.base(texte) || "element";
    if (!this.pris.has(racine) && !this.occupes.has(racine)) {
      this.pris.add(racine);
      return racine;
    }
    let n = 2;
    while (this.pris.has(`${racine}-${n}`) || this.occupes.has(`${racine}-${n}`)) n++;
    const slug = `${racine}-${n}`;
    this.pris.add(slug);
    return slug;
  }
}