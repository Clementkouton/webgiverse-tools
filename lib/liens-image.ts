// lib/liens-image.ts
// ─────────────────────────────────────────────────────────────────
// Lot 89 — LIENS D'IMAGES DROPBOX / GOOGLE DRIVE → LIENS DIRECTS.
//
// Les liens « Partager » de Dropbox et Drive ne sont PAS des images :
//   • un lien de DOSSIER (/scl/fo/, /sh/, /drive/folders/…) est une
//     page web de navigation — AUCUN navigateur ne peut l'afficher
//     dans une balise <img> (c'était la cause du « Image introuvable
//     à cette adresse » du Lot 89) ;
//   • un lien de FICHIER Dropbox (…/scl/fi/…?rlkey=…&dl=0) sert une
//     PAGE de prévisualisation HTML ; le même lien avec raw=1 sert le
//     fichier BRUT (type image/*) → s'affiche dans un <img> ;
//   • un lien de FICHIER Drive (/file/d/ID/view) sert aussi une page ;
//     l'image brute se sert sur lh3.googleusercontent.com/d/ID (le
//     CDN d'images de Google : pas d'écran d'accord ni de scan virus).
//
// `normaliserLienImage()` est appelée quand on QUITTE le champ URL
// (onBlur) et côté serveur à l'enregistrement : elle convertit ce qui
// est convertible et explique en français ce qui ne l'est pas.
// ─────────────────────────────────────────────────────────────────

export type StatutLienImage = "directe" | "convertie" | "dossier" | "invalide";

export type ResultatLienImage = {
  /** L'URL à utiliser (transformée, ou originale si rien à changer). */
  url: string;
  statut: StatutLienImage;
  /** Message à afficher sous le champ (conseil, conversion ou erreur). */
  message?: string;
};

export function normaliserLienImage(brut: string): ResultatLienImage {
  const texte = brut.trim();
  if (!texte) return { url: "", statut: "directe" };

  // URL syntaxiquement valable ?
  let adresse: URL;
  try {
    adresse = new URL(texte);
  } catch {
    return {
      url: texte,
      statut: "invalide",
      message:
        "Cette adresse n'est pas une URL valide : elle doit commencer par https:// (colle le lien complet).",
    };
  }
  if (adresse.protocol !== "https:" && adresse.protocol !== "http:") {
    return { url: texte, statut: "invalide", message: "Seules les adresses http(s):// sont acceptées." };
  }

  const hote = adresse.hostname.replace(/^www\./, "");

  // ── Dropbox ───────────────────────────────────────────────────────
  if (hote === "dropbox.com" || hote.endsWith(".dropbox.com")) {
    // Lien de DOSSIER : /scl/fo/… (nouveau format) ou /sh/… (ancien).
    if (/\/(scl\/fo|sh)\//.test(adresse.pathname)) {
      return {
        url: texte,
        statut: "dossier",
        message:
          "C'est le lien du DOSSIER Dropbox : un dossier ne peut pas s'afficher comme image. Ouvre le dossier, clique sur l'image → Partager → Copier le lien. Le lien d'un fichier contient /scl/fi/ (et se termine souvent par ?rlkey=…).",
      };
    }
    // Lien de FICHIER : /scl/fi/… (nouveau) ou /s/… (ancien), ou déjà
    // un lien direct dl.dropboxusercontent.com (rien à faire).
    if (hote === "dl.dropboxusercontent.com") {
      return { url: texte, statut: "directe" };
    }
    if (/\/(scl\/fi|s)\//.test(adresse.pathname)) {
      // raw=1 → le fichier brut au lieu de la page HTML. On retire
      // « dl » (raw prime) et « st » (jeton à durée limitée : la clé
      // stable de partage est « rlkey », qui reste en place).
      adresse.searchParams.delete("dl");
      adresse.searchParams.delete("st");
      adresse.searchParams.set("raw", "1");
      return {
        url: adresse.toString(),
        statut: "convertie",
        message: "Lien Dropbox converti en lien direct (raw=1) : l'aperçu doit s'afficher ci-dessus.",
      };
    }
    return { url: texte, statut: "directe" };
  }

  // ── Google Drive ──────────────────────────────────────────────────
  if (hote === "drive.google.com" || hote === "docs.google.com") {
    // DOSSIER Drive : impossible à afficher.
    if (adresse.pathname.includes("/folders/")) {
      return {
        url: texte,
        statut: "dossier",
        message:
          "C'est le lien d'un DOSSIER Google Drive. Clic droit sur le FICHIER image → Partager → « Tout le monde disposant du lien » → Copier le lien.",
      };
    }
    // Fichier : /file/d/ID/… (par chemin) ou open?id=ID / uc?id=ID (par paramètre).
    const parChemin = adresse.pathname.match(/\/file\/d\/([A-Za-z0-9_-]{10,})/);
    const idFichier = parChemin?.[1] ?? adresse.searchParams.get("id");
    if (idFichier) {
      return {
        // lh3.googleusercontent.com est le CDN d'images de Google :
        // sert l'image directement, sans page d'accord ni avertissement.
        url: `https://lh3.googleusercontent.com/d/${idFichier}`,
        statut: "convertie",
        message: "Lien Google Drive converti en lien direct : l'aperçu doit s'afficher ci-dessus.",
      };
    }
    return { url: texte, statut: "directe" };
  }

  // Déjà un lien direct Google (lh3 / usercontent) ou autre CDN : on touche à rien.
  if (hote === "lh3.googleusercontent.com" || hote === "drive.usercontent.google.com") {
    return { url: texte, statut: "directe" };
  }

  // ── Google Photos (pas convertible automatiquement) ───────────────
  if (hote === "photos.google.com" || hote === "photos.app.goo.gl") {
    return {
      url: texte,
      statut: "dossier",
      message:
        "Les liens Google Photos ne sont pas des images directes. Télécharge l'image, héberge-la dans Dropbox ou Drive (le FICHIER, partagé « Tous les utilisateurs avec le lien ») et colle ce lien-là.",
    };
  }

  // ── Tout le reste (imgur, site perso, CDN…) : on ne touche pas. ───
  return { url: texte, statut: "directe" };
}