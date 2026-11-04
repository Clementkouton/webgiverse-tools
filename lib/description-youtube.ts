// lib/description-youtube.ts
// ─────────────────────────────────────────────────────────────────
// Lot 28 — RÉCUPÉRATION ET RAFFINEMENT des descriptions YouTube des
// tutoriels. Les descriptions brutes des vidéos contiennent beaucoup
// de bruit (hashtags, « abonne-toi », liens sociaux, séparateurs…)
// et parfois des pépites : liens de ressources (docs, outils, Colab),
// chapitres horodatés, explications. Ce module :
//   1. RÉCUPÈRE la description brute — endpoint interne /next (voie
//      fiable depuis les IP de serveurs), puis page watch, puis API
//      interne InnerTube en repli — utilisé par la route admin et par
//      le script local `scripts/recuperer-descriptions-youtube.ts` ;
//   2. RAFFINE la description : isole les CHAPITRES (horodatés),
//      les RESSOURCES (liens externes utiles, sans liens sociaux ni
//      paramètres de tracking) et les PARAGRAPHES utiles (sans
//      hashtags, sans appels à l'abonnement) ;
//   3. RELIT la structure stockée en base (colonne Json) de façon
//      défensive pour l'affichage.
// Aucune dépendance externe : uniquement fetch + RegExp.
// ─────────────────────────────────────────────────────────────────

export type ChapitreYoutube = { temps: string; titre: string };
export type RessourceYoutube = { label: string | null; url: string };
export type DescriptionRaffinee = {
  chapitres: ChapitreYoutube[];
  ressources: RessourceYoutube[];
  paragraphes: string[];
};

const UA_NAVIGATEUR =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/* ════════════════════════════════════════════════════════════════
   1) EXTRACTION DE L'ID VIDÉO
   ════════════════════════════════════════════════════════════════ */

/** Extrait l'ID vidéo (11 caractères) d'une URL YouTube quelconque. */
export function extraireIdYoutube(url: string): string | null {
  const m =
    url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/) ??
    url.match(/youtu\.be\/([\w-]{11})/);
  return m ? m[1] : null;
}

/* ════════════════════════════════════════════════════════════════
   2) RÉCUPÉRATION DE LA DESCRIPTION BRUTE
   ════════════════════════════════════════════════════════════════ */

/**
 * Extrait l'objet JSON équilibré qui suit `marqueur` dans un document
 * HTML YouTube (ex : « ytInitialPlayerResponse »). Respecte les
 * chaînes et les échappements — pas besoin de librairie externe.
 */
export function extraireJsonApres(html: string, marqueur: string): Record<string, unknown> | null {
  const i = html.indexOf(marqueur);
  if (i < 0) return null;
  const debut = html.indexOf("{", i + marqueur.length);
  if (debut < 0) return null;
  let profondeur = 0;
  let enChaine = false;
  let echappe = false;
  for (let k = debut; k < html.length; k++) {
    const c = html[k];
    if (enChaine) {
      if (echappe) echappe = false;
      else if (c === "\\") echappe = true;
      else if (c === '"') enChaine = false;
      continue;
    }
    if (c === '"') enChaine = true;
    else if (c === "{") profondeur++;
    else if (c === "}") {
      profondeur--;
      if (profondeur === 0) {
        try {
          return JSON.parse(html.slice(debut, k + 1)) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** Tire la description brute d'un player response YouTube (2 emplacements possibles). */
export function descriptionDepuisPlayer(
  joueur: Record<string, unknown> | null,
): string | null {
  if (!joueur) return null;
  const details = joueur.videoDetails as Record<string, unknown> | null | undefined;
  const courte = details?.shortDescription;
  if (typeof courte === "string" && courte.trim()) return courte;
  // Repli : microformat (description longue au format simpleText)
  const micro = (joueur.microformat as Record<string, any> | undefined)
    ?.playerMicroformatRenderer?.description?.simpleText;
  if (typeof micro === "string" && micro.trim()) return micro;
  return null;
}

/** Stratégie 0 — endpoint interne /next (données de la page watch).
 * Contrairement au player, /next n'est PAS soumis au mur anti-bot
 * « Sign in to confirm you're not a bot » : c'est la voie fiable
 * depuis les IP de serveurs (Vercel, CI…). La description arrive
 * sous forme d'objet « attributedDescription » : le champ content
 * contient le texte AFFICHÉ (liens tronqués « https://exemple… »)
 * et commandRuns porte les URLs RÉELLES (souvent enveloppées dans
 * youtube.com/redirect?q=…) → on reconstruit le texte brut complet. */
type DescriptionAttribuee = {
  content: string;
  commandRuns?: Array<{
    startIndex: number;
    length: number;
    onTap?: { innertubeCommand?: { urlEndpoint?: { url?: string } } };
  }>;
};

/** Replace chaque texte d'URL tronqué par l'URL complète décodée. */
function reconstruireUrlsAttribuees(ad: DescriptionAttribuee): string {
  let contenu = ad.content;
  const runs = [...(ad.commandRuns ?? [])]
    .filter((cr) => cr.onTap?.innertubeCommand?.urlEndpoint?.url)
    .sort((a, b) => b.startIndex - a.startIndex); // arrière → indices stables
  for (const cr of runs) {
    const enveloppe = cr.onTap!.innertubeCommand!.urlEndpoint!.url as string;
    let reel = enveloppe;
    if (enveloppe.includes("youtube.com/redirect")) {
      try {
        const q = new URL(enveloppe).searchParams.get("q");
        if (q) reel = q;
      } catch {
        // enveloppe illisible → on garde le texte affiché tel quel
      }
    }
    if (!/^https?:\/\//i.test(reel)) continue;
    contenu = contenu.slice(0, cr.startIndex) + reel + contenu.slice(cr.startIndex + cr.length);
  }
  return contenu;
}

async function viaNext(youtubeId: string): Promise<string | null> {
  const corps = {
    context: { client: { clientName: "WEB", clientVersion: "2.20241126.01.00", hl: "fr", gl: "FR" } },
    videoId: youtubeId,
    contentCheckOk: true,
    racyCheckOk: true,
  };
  const reponse = await fetch("https://www.youtube.com/youtubei/v1/next?prettyPrint=false", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": UA_NAVIGATEUR,
      "Accept-Language": "fr-FR,fr;q=0.9",
      Origin: "https://www.youtube.com",
      Referer: `https://www.youtube.com/watch?v=${youtubeId}`,
      "X-YouTube-Client-Name": "1",
      "X-YouTube-Client-Version": "2.20241126.01.00",
    },
    body: JSON.stringify(corps),
    signal: AbortSignal.timeout(10_000),
  });
  if (!reponse.ok) return null;
  const donnees = (await reponse.json().catch(() => null)) as Record<string, unknown> | null;
  if (!donnees) return null;
  // Recherche récursive de l'objet attributedDescription (son
  // emplacement varie selon les versions de la réponse).
  let trouve: DescriptionAttribuee | null = null;
  const visiter = (noeud: unknown): void => {
    if (!noeud || typeof noeud !== "object" || trouve) return;
    const n = noeud as Record<string, unknown>;
    const ad = n.attributedDescription as DescriptionAttribuee | undefined;
    if (ad && typeof ad.content === "string" && ad.content.trim()) {
      trouve = ad;
      return;
    }
    for (const v of Object.values(n)) visiter(v);
  };
  visiter(donnees);
  return trouve ? reconstruireUrlsAttribuees(trouve) : null;
}

/** Stratégie 1 — page watch classique (fonctionne depuis une IP résidentielle). */
async function viaPageWatch(youtubeId: string): Promise<string | null> {
  const reponse = await fetch(
    `https://www.youtube.com/watch?v=${youtubeId}&hl=fr&bpctr=9999999999&has_verified=1`,
    {
      headers: {
        "User-Agent": UA_NAVIGATEUR,
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        // Consentement posé d'avance : évite la page « before you continue »
        Cookie: "CONSENT=YES+cb.20240101-01-p0.fr+FX+100; SOCS=CAI",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!reponse.ok) return null;
  const html = await reponse.text();
  return descriptionDepuisPlayer(extraireJsonApres(html, "ytInitialPlayerResponse"));
}

type ClientInnerTube = { nom: string; version: string; ua: string; extra?: Record<string, unknown> };

const CLIENTS_INNERTUBE: ClientInnerTube[] = [
  {
    nom: "ANDROID",
    version: "19.44.38",
    ua: "com.google.android.youtube/19.44.38 (Linux; U; Android 11) gzip",
    extra: { androidSdkVersion: 30 },
  },
  {
    nom: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
    version: "2.0",
    ua: "Mozilla/5.0 (PlayStation; PlayStation 4/12.00) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Safari/605.1.15",
  },
  {
    nom: "MWEB",
    version: "2.20240726.01.00",
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7_10 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  },
];

/** Stratégie 2 — API interne publique InnerTube (repli quand la page watch est bloquée). */
async function viaInnerTube(youtubeId: string, client: ClientInnerTube): Promise<string | null> {
  const corps = {
    context: {
      client: {
        clientName: client.nom,
        clientVersion: client.version,
        hl: "fr",
        gl: "FR",
        ...(client.extra ?? {}),
      },
    },
    videoId: youtubeId,
    contentCheckOk: true,
    racyCheckOk: true,
  };
  const reponse = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": client.ua,
      "Accept-Language": "fr-FR,fr;q=0.9",
      Origin: "https://www.youtube.com",
    },
    body: JSON.stringify(corps),
    signal: AbortSignal.timeout(8_000),
  });
  if (!reponse.ok) return null;
  const joueur = (await reponse.json().catch(() => null)) as Record<string, unknown> | null;
  if (!joueur) return null;
  // LOGIN_REQUIRED = mur anti-robot → description absente, on passera au client suivant
  const jouabilite = (joueur.playabilityStatus as Record<string, unknown> | undefined)?.status;
  if (jouabilite === "LOGIN_REQUIRED" || jouabilite === "ERROR") return null;
  return descriptionDepuisPlayer(joueur);
}

/**
 * Récupère la description BRUTE d'une vidéo YouTube en essayant
 * plusieurs stratégies de bout en bout. null = tout a échoué
 * (blocage IP, vidéo privée/supprimée…) → on retentera plus tard.
 */
export async function recupererDescriptionBrute(youtubeId: string): Promise<string | null> {
  const etapes: Array<() => Promise<string | null>> = [
    () => viaNext(youtubeId), // voie fiable depuis les IP de serveurs
    () => viaPageWatch(youtubeId),
    ...CLIENTS_INNERTUBE.map((client) => () => viaInnerTube(youtubeId, client)),
  ];
  for (const etape of etapes) {
    try {
      const description = await etape();
      if (description) return description;
    } catch {
      // réseau / timeout / JSON invalide → stratégie suivante
    }
  }
  return null;
}

/* ════════════════════════════════════════════════════════════════
   3) RAFFINEMENT — la description brute → structure propre
   ════════════════════════════════════════════════════════════════ */

/** Lignes qui n'apportent rien : appels à l'abonnement, réseaux sociaux, dons, promo… */
const BRUIT =
  /abonne\w*|s'abonner|subscribe|souscrivre|cloche|bell icon|merci (d'avoir|pour)|pouce (bleu|vert)|j'aime la vid[ée]o|partage (cette |la )?vid[ée]o|laisse(r)? un comm|un commentaire|newsletter|instagram|tiktok|twitter|facebook|linkedin|snapchat|telegram|whatsapp|discord|patreon|utip|streamlabs|paypal|ko-?fi|buymeacoffee|tipeee|twitch|devenir membre|join this channel|membership|sponsor|partenariat|questions?\s+en\s+commentaire|un like\b|@\w+\s*[:：]?\s*$|code promo|\bpromo\b|r[ée]duction|%\s*(de|off)|\bonlyfans\b/i;

/** Domaines sociaux / dons / agrégateurs de liens = jamais une « ressource » de pratique. */
const DOMAINES_BRUIT =
  /(^|\.)(instagram\.com|tiktok\.com|twitter\.com|x\.com|facebook\.com|linkedin\.com|snapchat\.com|t\.me|discord\.gg|discord\.com|whatsapp\.com|patreon\.com|utip\.eu|streamlabs\.com|paypal\.me|paypal\.com|ko-fi\.com|buymeacoffee\.com|tipeee\.com|twitch\.tv|onlyfans\.com|snipfeed\.co|beacons\.ai|linktr\.ee|youtube\.com\/@|youtube\.com\/channel\/|youtube\.com\/user\/|mailto:)/i;

/** Paramètres d'URL de tracking à retirer des ressources. */
const PARAMS_TRACKING = /^(utm_[\w-]+|fbclid|gclid|si|si_id|feature|app)$/i;

/** Ligne composée uniquement de séparateurs décoratifs (───, ═══, ***, •••). */
const SEPARATEUR = /^[\s\-–—=_*•·‣⁃~═─━#|>»+]+$/u;

const REGEX_CHAPITRE = /^((?:\d{1,2}:)?\d{1,2}:\d{2})\s*[-–—:|.·)\]]*\s*(.+)$/u;
const REGEX_HASHTAG = /#[\p{L}\p{N}_-]+/gu;
// Groupe de capture OBLIGATOIRE : String.split conserve alors les
// séparateurs capturés → découpe fiable texte / URL / texte…
const REGEX_URL = /(https?:\/\/[^\s<>()\[\]{}"']+)/g;
const CONTIENT_LETTRE = /\p{L}/u;

const MAX_CHAPITRES = 30;
const MAX_RESSOURCES = 15;
const MAX_CHARS_PARAGRAPHES = 1_600;

/** Retire les paramètres de tracking d'une URL de ressource. */
function nettoyerUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const cle of [...u.searchParams.keys()]) {
      if (PARAMS_TRACKING.test(cle)) u.searchParams.delete(cle);
    }
    return u.toString().replace(/\?$/, "");
  } catch {
    return url;
  }
}

/**
 * Libellé direct d'une ressource : le texte qui précède immédiatement
 * l'URL sur la même ligne (« Guide officiel : https://… »). Renvoie
 * null si ce texte est vide ou trop long pour être un libellé.
 */
function libelleDirect(segmentAvant: string): string | null {
  const nettoye = segmentAvant.replace(REGEX_HASHTAG, " ").replace(/\s+/g, " ").trim();
  const sansPonctuation = nettoye.replace(/[:：\-–—]+\s*$/, "").trim();
  if (sansPonctuation.length < 2 || sansPonctuation.length > 70) return null;
  if (!CONTIENT_LETTRE.test(sansPonctuation)) return null;
  if (BRUIT.test(sansPonctuation)) return null; // « Rejoins la newsletter : … » → pas un label
  return sansPonctuation;
}

/**
 * Transforme une description YouTube brute en structure propre :
 * chapitres horodatés, ressources (liens utiles) et paragraphes.
 * Renvoie des listes VIDÉES (pas null) si rien n'est exploitable.
 */
export function raffinerDescriptionYouTube(brute: string): DescriptionRaffinee {
  const chapitres: ChapitreYoutube[] = [];
  const ressources: RessourceYoutube[] = [];
  const paragraphes: string[] = [];
  const urlsVues = new Set<string>();

  let budgetParagraphes = MAX_CHARS_PARAGRAPHES;

  const lignes = brute
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !SEPARATEUR.test(l));

  // Label en attente : une ligne courte finissant par « : » juste avant
  // une URL pure devient le libellé de cette ressource.
  let labelEnAttente: string | null = null;

  for (const ligne of lignes) {
    // ── 1. Découpe la ligne en alternance texte / URL ─────────────
    // [texte0, url0, texte1, url1, …] grâce au groupe de capture.
    const segments = ligne.split(REGEX_URL);
    const indicesUrls: number[] = [];
    for (let i = 1; i < segments.length; i += 2) indicesUrls.push(i);
    const consommes = new Set<number>(); // segments texte utilisés comme libellés

    // ── 2. Ressources : URL nettoyée, dédoublonnée, avec son label ──
    indicesUrls.forEach((indiceUrl, k) => {
      const url = nettoyerUrl(segments[indiceUrl]);
      if (DOMAINES_BRUIT.test(url)) return; // réseaux sociaux, dons…
      const cle = url.toLowerCase();
      if (urlsVues.has(cle)) return;
      urlsVues.add(cle);
      if (ressources.length >= MAX_RESSOURCES) return;

      let label: string | null = null;
      const indiceAvant = indiceUrl - 1;
      const brut = segments[indiceAvant] ?? "";
      if (brut.trim() && !consommes.has(indiceAvant)) {
        const candidat = libelleDirect(brut);
        // 1re URL de la ligne : tout libellé convient ; les suivantes
        // exigent une forme « Doc : https://… » pour rester lisibles.
        if (candidat && (k === 0 || brut.trim().endsWith(":"))) {
          label = candidat;
          consommes.add(indiceAvant);
        }
      }
      if (!label && k === 0 && labelEnAttente) label = labelEnAttente;
      ressources.push({ label, url });
    });
    labelEnAttente = null;

    // ── 3. Textes résiduels (hashtags retirés, espaces réduits) ────
    for (let i = 0; i < segments.length; i += 2) {
      if (consommes.has(i)) continue; // déjà utilisé comme libellé
      const residu = (segments[i] ?? "")
        .replace(REGEX_HASHTAG, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!residu || SEPARATEUR.test(residu)) continue;
      if (!CONTIENT_LETTRE.test(residu)) continue; // ligne d'emojis / symboles

      // 3a. Chapitre horodaté (« 03:12 Créer un prompt efficace »)
      const mChapitre = residu.match(REGEX_CHAPITRE);
      if (mChapitre && CONTIENT_LETTRE.test(mChapitre[2])) {
        if (chapitres.length < MAX_CHAPITRES) {
          chapitres.push({ temps: mChapitre[1], titre: mChapitre[2].trim() });
        }
        continue;
      }

      // 3b. Lignes de bruit (« Abonne-toi et active la cloche »)
      if (BRUIT.test(residu)) continue;

      // 3c. Label en attente pour l'URL de la ligne suivante
      if (residu.length <= 70 && residu.endsWith(":")) {
        labelEnAttente = residu.replace(/[:\s]+$/, "");
        continue;
      }

      // 3d. Paragraphe utile (assez long pour porter une information)
      if (residu.length >= 28 && residu.split(" ").length >= 4) {
        const place = Math.max(0, budgetParagraphes);
        if (place === 0) continue;
        const contenu = residu.length > place ? `${residu.slice(0, place - 1)}…` : residu;
        budgetParagraphes -= contenu.length;
        paragraphes.push(contenu);
      }
      // (les lignes trop courtes sont des titres de section → ignorées)
    }
  }

  // Un unique horodatage isolé n'est pas un sommaire → on l'abandonne
  const chapitresFinaux = chapitres.length >= 2 ? chapitres : [];

  return { chapitres: chapitresFinaux, ressources, paragraphes };
}

/** Renvoie true si la structure raffinée contient au moins une information utile. */
export function descriptionEstVide(d: DescriptionRaffinee): boolean {
  return d.chapitres.length === 0 && d.ressources.length === 0 && d.paragraphes.length === 0;
}

/* ════════════════════════════════════════════════════════════════
   4) LECTURE DÉFENSIVE (affichage depuis la colonne Json)
   ════════════════════════════════════════════════════════════════ */

function estChapitre(v: unknown): v is ChapitreYoutube {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.temps === "string" &&
    c.temps.length > 0 &&
    typeof c.titre === "string" &&
    c.titre.length > 0
  );
}

function estRessource(v: unknown): v is RessourceYoutube {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  if (typeof r.url !== "string" || r.url.length < 8) return false;
  if (r.label !== null && typeof r.label !== "string") return false;
  return true;
}

/**
 * Relit la colonne `Tuto.descriptionRaffinee` (Json) en structure
 * typée. null = rien à afficher (absente, vide ou corrompue).
 */
export function parserDescriptionRaffinee(valeur: unknown): DescriptionRaffinee | null {
  if (!valeur || typeof valeur !== "object") return null;
  let v = valeur as Record<string, unknown>;
  // Lot 34 — réparation défensive des anciens imports : l'enveloppe
  // { ok: true, valeur: { chapitres… } } (bug d'écriture, désormais
  // corrigé) est dépliée une fois pour retrouver la structure attendue.
  if (
    !Array.isArray(v.chapitres) &&
    !Array.isArray(v.ressources) &&
    !Array.isArray(v.paragraphes) &&
    v.valeur &&
    typeof v.valeur === "object" &&
    !Array.isArray(v.valeur)
  ) {
    v = v.valeur as Record<string, unknown>;
  }
  if (v.vide === true) return null;
  const chapitres = Array.isArray(v.chapitres) ? v.chapitres.filter(estChapitre) : [];
  const ressources = Array.isArray(v.ressources) ? v.ressources.filter(estRessource) : [];
  const paragraphes = Array.isArray(v.paragraphes)
    ? v.paragraphes.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  if (chapitres.length === 0 && ressources.length === 0 && paragraphes.length === 0) return null;
  return { chapitres, ressources, paragraphes };
}

/* ════════════════════════════════════════════════════════════════
   5) IMPORT CSV (Lot 29) — colonne « descriptionRaffinee » de
      /admin/import?onglet=tutoriels
   ════════════════════════════════════════════════════════════════ */

/** Valeur stockable dans la colonne Json `Tuto.descriptionRaffinee`. */
export type ValeurDescriptionRaffinee = DescriptionRaffinee | { vide: true };

export type ResultatDescriptionCsv =
  | { ok: true; /** null = aucune modification à écrire (cellules vides). */
      valeur: ValeurDescriptionRaffinee | null }
  | { ok: false; erreur: string };

/** Cellules CSV brutes des 4 colonnes de description (après trim de l'appelant). */
export type CellulesDescriptionCsv = {
  json: string;
  chapitres: string;
  ressources: string;
  paragraphes: string;
};

const REGEX_CHAPITRE_CSV = /^((?:\d{1,2}:)?\d{1,2}:\d{2})\s+(.+)$/;
const MAX_CHAPITRES_CSV = 100;
const MAX_RESSOURCES_CSV = 50;
const MAX_PARAGRAPHES_CSV = 20;
const MAX_CAR_PARAGRAPHE_CSV = 4000;

/** « 00:00 Intro | 02:35 Installer l'outil » → chapitres. */
function parserChapitresCsv(valeur: string): { ok: true; chapitres: ChapitreYoutube[] } | { ok: false; erreur: string } {
  const chapitres: ChapitreYoutube[] = [];
  for (const brut of valeur.split("|").map((s) => s.trim()).filter(Boolean)) {
    const m = brut.match(REGEX_CHAPITRE_CSV);
    if (!m) {
      return {
        ok: false,
        erreur: `chapitre illisible (« ${brut.slice(0, 60)} » — format attendu « mm:ss Titre » ou « hh:mm:ss Titre »)`,
      };
    }
    chapitres.push({ temps: m[1]!, titre: m[2]!.trim().slice(0, 160) });
  }
  return { ok: true, chapitres: chapitres.slice(0, MAX_CHAPITRES_CSV) };
}

/** « https://a.com | Guide officiel : https://docs.fr » → ressources. */
function parserRessourcesCsv(valeur: string): { ok: true; ressources: RessourceYoutube[] } | { ok: false; erreur: string } {
  const ressources: RessourceYoutube[] = [];
  for (const brut of valeur.split("|").map((s) => s.trim()).filter(Boolean)) {
    const debutUrl = brut.search(/https?:\/\//);
    if (debutUrl === -1) {
      return { ok: false, erreur: `ressource sans URL (« ${brut.slice(0, 60)} »)` };
    }
    const label = brut.slice(0, debutUrl).replace(/[\s:;,\-–—]+$/, "").trim() || null;
    const urlBrute = brut.slice(debutUrl).trim();
    let url: string;
    try {
      const u = new URL(urlBrute);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("protocole");
      url = u.toString();
    } catch {
      return { ok: false, erreur: `URL de ressource invalide (« ${urlBrute.slice(0, 60)} »)` };
    }
    ressources.push({ label, url });
  }
  return { ok: true, ressources: ressources.slice(0, MAX_RESSOURCES_CSV) };
}

/** Texte libre : paragraphes séparés par « || » (le « | » simple reste
 * utilisable à l'intérieur d'un paragraphe). Tolérant : pas d'erreur. */
function parserParagraphesCsv(valeur: string): string[] {
  return valeur
    .split("||")
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, MAX_PARAGRAPHES_CSV)
    .map((p) => p.slice(0, MAX_CAR_PARAGRAPHE_CSV));
}

/**
 * Normalise une valeur JSON provenant de la cellule
 * « descriptionRaffinee » (exactement la structure produite par le
 * scraper) : entrées invalides filtrées, tout vide → { vide: true }.
 */
function normaliserDescriptionJson(j: unknown): ValeurDescriptionRaffinee | null {
  // Un tableau (ou une valeur simple) est une erreur de manipulation :
  // on refuse plutôt que de le réduire silencieusement à { vide: true }.
  if (!j || typeof j !== "object" || Array.isArray(j)) return null;
  const v = j as Record<string, unknown>;
  if (v.vide === true) return { vide: true };
  const chapitres = Array.isArray(v.chapitres)
    ? v.chapitres.filter(estChapitre).slice(0, MAX_CHAPITRES_CSV)
    : [];
  const ressources = Array.isArray(v.ressources)
    ? v.ressources.filter(estRessource).slice(0, MAX_RESSOURCES_CSV)
    : [];
  const paragraphes = Array.isArray(v.paragraphes)
    ? v.paragraphes
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .slice(0, MAX_PARAGRAPHES_CSV)
        .map((p) => p.slice(0, MAX_CAR_PARAGRAPHE_CSV))
    : [];
  if (chapitres.length === 0 && ressources.length === 0 && paragraphes.length === 0) {
    return { vide: true };
  }
  return { chapitres, ressources, paragraphes };
}

/**
 * Construit la valeur de `Tuto.descriptionRaffinee` depuis les cellules
 * CSV d'une ligne d'import tutoriel (Lot 29).
 *
 * Deux syntaxes acceptées :
 *   1. `descriptionRaffinee` : JSON complet (structure du scraper) ou
 *      le mot-clé « vide » — REMPLACE toute la description existante ;
 *   2. `chapitres` / `ressources` / `paragraphes` : syntaxe lisible —
 *      chaque colonne fournie (cellule non vide) remplace SA partie,
 *      les autres sont conservées à partir de la description existante
 *      (`existante` = valeur Json lue en base, mode mise à jour).
 *
 * Toutes les cellules vides → `{ ok: true, valeur: null }` : la
 * description existante n'est JAMAIS écrasée par une cellule oubliée.
 */
export function parserDescriptionRaffineeCsv(
  cellules: CellulesDescriptionCsv,
  existante: unknown = null,
): ResultatDescriptionCsv {
  const json = cellules.json.trim();

  // ── 1) JSON complet (ou mot-clé « vide ») : remplacement intégral ──
  if (json) {
    if (/^(vide|rien|-)$/i.test(json)) return { ok: true, valeur: { vide: true } };
    let j: unknown;
    try {
      j = JSON.parse(json);
    } catch {
      return { ok: false, erreur: "JSON invalide dans la colonne « descriptionRaffinee »" };
    }
    const normalise = normaliserDescriptionJson(j);
    if (!normalise) {
      return {
        ok: false,
        erreur: "« descriptionRaffinee » doit être un objet JSON (chapitres, ressources, paragraphes)",
      };
    }
    return { ok: true, valeur: normalise };
  }

  const chapitresBrut = cellules.chapitres.trim();
  const ressourcesBrut = cellules.ressources.trim();
  const paragraphesBrut = cellules.paragraphes.trim();

  // ── 2) Toutes les cellules vides → inchangé (protection anti-perte) ─
  if (!chapitresBrut && !ressourcesBrut && !paragraphesBrut) {
    return { ok: true, valeur: null };
  }

  // Base = description déjà en base (mode mise à jour) : les parties
  // non fournies sont conservées.
  const base: DescriptionRaffinee =
    parserDescriptionRaffinee(existante) ?? { chapitres: [], ressources: [], paragraphes: [] };

  let chapitres = base.chapitres;
  if (chapitresBrut) {
    const r = parserChapitresCsv(chapitresBrut);
    if (!r.ok) return { ok: false, erreur: r.erreur };
    chapitres = r.chapitres;
  }

  let ressources = base.ressources;
  if (ressourcesBrut) {
    const r = parserRessourcesCsv(ressourcesBrut);
    if (!r.ok) return { ok: false, erreur: r.erreur };
    ressources = r.ressources;
  }

  const paragraphes = paragraphesBrut ? parserParagraphesCsv(paragraphesBrut) : base.paragraphes;

  if (chapitres.length === 0 && ressources.length === 0 && paragraphes.length === 0) {
    return { ok: true, valeur: null };
  }
  return { ok: true, valeur: { chapitres, ressources, paragraphes } };
}
