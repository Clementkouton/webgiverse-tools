// lib/images.ts
// ─────────────────────────────────────────────────────────────────
// Lot 89 — LIENS D'IMAGES DROPBOX / GOOGLE DRIVE dans les articles.
//
// PROBLÈME : les liens de PARTAGE de Dropbox et Google Drive ne
// renvoient PAS une image, mais une PAGE WEB (l'aperçu du fichier).
// Une balise <img> qui reçoit une page HTML n'affiche rien — ni
// l'aperçu du formulaire, ni l'image sur le site public. Vérifié en
// direct : un lien Dropbox « ?dl=0 » renvoie text/html (311 Ko), le
// même lien avec « ?raw=1 » renvoie bien image/jpeg.
//
//   • Dropbox  : https://www.dropbox.com/scl/fi/…?dl=0  → page web
//                https://www.dropbox.com/scl/fi/…?raw=1 → image directe
//                (officiel : help.dropbox.com/share/force-download)
//                ⚠️ /scl/fo/… et /sh/… = liens de DOSSIER : jamais une
//                image, même convertis.
//   • Drive    : https://drive.google.com/file/d/<ID>/view → page web
//                https://drive.google.com/uc?export=view&id=<ID> → image
//                ⚠️ /drive/folders/… = dossier ; docs.google.com =
//                document (rien de tout ça n'est une image).
//
// Cette fonction PURE (client + serveur, aucune dépendance) convertit
// les liens de partage en liens d'image directs, et signale les liens
// qui ne peuvent JAMAIS fonctionner (dossiers, Google Docs…) avec un
// message français clair.
// ─────────────────────────────────────────────────────────────────

export type ResultatConversionImage = {
  /** URL à utiliser : convertie, identique, ou « » si champ vide.
   *  `null` = le lien ne peut JAMAIS afficher une image (dossier,
   *  document Google…) → ne pas enregistrer tel quel. */
  url: string | null;
  /** Info positive affichée quand un lien de partage a été converti. */
  message?: string;
  /** Explication française quand le lien est inutilisable tel quel. */
  erreur?: string;
};

/** Convertit un lien de partage Dropbox / Google Drive en URL d'image
 *  directe. Les autres URLs (hébergeurs d'images, CDN…) passent sans
 *  modification. */
export function convertirEnUrlImageDirecte(brut: string): ResultatConversionImage {
  const valeur = String(brut ?? "").trim();
  if (valeur === "") return { url: "" };

  // Pas une URL exploitable → renvoyée telle quelle : la validation
  // zod du formulaire affichera son erreur standard « URL invalide ».
  let adresse: URL;
  try {
    adresse = new URL(valeur);
  } catch {
    return { url: valeur };
  }
  if (adresse.protocol !== "https:" && adresse.protocol !== "http:") {
    return { url: valeur };
  }

  const hote = adresse.hostname.toLowerCase();
  const chemin = adresse.pathname;

  // ── Dropbox ─────────────────────────────────────────────────────
  if (hote === "dropbox.com" || hote.endsWith(".dropbox.com")) {
    // Lien de DOSSIER partagé (/scl/fo/… ou ancien /sh/…) : une page
    // de dossier ne sera JAMAIS une image → erreur expliquée.
    if (/^\/(scl\/fo|sh)\//.test(chemin)) {
      return {
        url: null,
        erreur:
          "C'est un lien de DOSSIER Dropbox : il ouvre une page de dossiers/fichiers, pas une image. " +
          "Ouvre ce lien, clique sur l'image voulue, puis « Copier le lien » du FICHIER et recolle-le ici.",
      };
    }
    // Lien de FICHIER : on force le rendu direct avec raw=1 (moyen
    // officiel documenté par Dropbox), on retire dl / st (jeton
    // d'expiration inutile) et on garde rlkey (clé d'accès stable).
    const params = adresse.searchParams;
    const avaitLienNonDirect = params.has("dl") || params.has("raw");
    params.delete("dl");
    params.delete("st");
    params.set("raw", "1");
    const converti = adresse.toString();
    return {
      url: converti,
      message: avaitLienNonDirect
        ? "Lien Dropbox converti en lien d'image direct (raw=1)."
        : undefined,
    };
  }

  // ── Google Drive ────────────────────────────────────────────────
  if (hote === "drive.google.com" || hote.endsWith(".drive.google.com")) {
    // Dossier Drive → jamais une image.
    if (/^\/drive\/folders\//.test(chemin) || chemin.startsWith("/folderview") || chemin.startsWith("/embeddedfolderview")) {
      return {
        url: null,
        erreur:
          "C'est un lien de DOSSIER Google Drive : il ouvre une liste de fichiers, pas une image. " +
          "Ouvre ce lien, double-clique sur l'image voulue, puis « Partager » → « Copier le lien » sur le FICHIER.",
      };
    }
    // 1) Fichier ouvert : /file/d/<ID>/view?usp=sharing
    let identifiant = chemin.match(/^\/file\/d\/([A-Za-z0-9_-]+)/)?.[1] ?? "";
    // 2) Anciens formats : /open?id=<ID>, /uc?id=<ID>, /thumbnail?id=<ID>
    if (!identifiant) {
      const parametreId = adresse.searchParams.get("id") ?? "";
      if (/^[A-Za-z0-9_-]{10,}$/.test(parametreId)) identifiant = parametreId;
    }
    if (!identifiant) {
      return {
        url: null,
        erreur:
          "Lien Google Drive non reconnu. Dans Drive, clique droit sur l'image → « Partager » → " +
          "« Copier le lien » (le lien doit ressembler à https://drive.google.com/file/d/…/view).",
      };
    }
    // URL d'image directe. Le fichier doit être partagé en
    // « Tous les utilisateurs avec le lien peuvent consulter ».
    const converti = `https://drive.google.com/uc?export=view&id=${identifiant}`;
    return {
      url: converti,
      message:
        valeur === converti
          ? undefined
          : "Lien Google Drive converti en lien d'image direct. Le fichier doit être partagé « Tous les utilisateurs avec le lien ».",
    };
  }

  // ── Google Docs / Sheets / Slides / Forms ───────────────────────
  if (hote === "docs.google.com" || hote.endsWith(".docs.google.com")) {
    return {
      url: null,
      erreur:
        "Un lien Google Docs / Sheets / Slides n'est pas une image. Ouvre le document, clic droit sur l'image → " +
        "« Enregistrer l'image sous… », puis héberge ce fichier image (Dropbox, Drive…) et colle le lien du FICHIER.",
    };
  }

  // ── Tout le reste : hébergeurs d'images, CDN, site perso… ───────
  return { url: valeur };
}