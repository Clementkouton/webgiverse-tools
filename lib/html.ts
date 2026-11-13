// lib/html.ts
// ─────────────────────────────────────────────────────────────────
// Lot 24 — HTML des articles : normalisation + assainissement.
// Les articles proviennent de 3 sources :
//   1. l'éditeur riche (HTML propre) ;
//   2. d'anciens contenus « texte brut » (1 paragraphe = 1 ligne) ;
//   3. des collages d'exports IA (DeepSeek, ChatGPT…) parfois
//      ÉCHAPPÉS (&lt;p&gt;…) ou enveloppés dans un document complet
//      (<!DOCTYPE html><html><head>…<body>…).
// normaliserHtml() ramène TOUTES ces sources à un fragment HTML
// propre ; nettoyerHtml() retire ensuite ce qui ne doit JAMAIS
// apparaître sur le site public (scripts, iframes, onclick…).
//
// Lot 82 — SÉCURITÉ XSS : l'ancien nettoyerHtml() était écrit à base
// d'expressions régulières maison. Ce type de filtre est contournable
// (attributs d'événement exotiques, balises imbriquées type
// <scr<script>ipt>, mutations de navigateur « mXSS »…). Il est
// remplacé par la bibliothèque de référence sanitize-html : liste
// BLANCHE de balises et d'attributs (tout ce qui n'est pas explicitement
// autorisé est retiré), schémas d'URL contrôlés (javascript:, data:
// interdits sauf pour les images), analyse HTML complète.
// À installer :  npm install sanitize-html  +  npm install -D @types/sanitize-html
// ─────────────────────────────────────────────────────────────────
import sanitizeHtml from "sanitize-html";

/** Détecte des balises ÉCHAPPÉES du type &lt;p class="…"&gt;, &lt;div&gt;
 *  — y compris doublement échappées (&amp;lt;p&amp;gt;). */
const BALISES_ECHAPPEES =
  /&(?:amp;)?lt;\/?\s*(?:p|div|span|h[1-6]|ul|ol|li|table|tbody|thead|tr|td|th|blockquote|pre|code|strong|b|em|i|u|s|a|img|br|hr|section|article|header|footer|figure|figcaption|font|mark|small|sub|sup|style|script)\b/i;

/** Décode une passe d'entités HTML courantes. */
function decoderEntites(texte: string): string {
  return texte
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, "\u00a0")
    .replace(/&amp;/gi, "&");
}

/**
 * Ramène n'importe quel contenu enregistré à un fragment HTML :
 *   • décode les balises échappées (&lt;p&gt; → <p>) — jusqu'à 3
 *     passes pour les contenus doublement échappés ;
 *   • déballe les documents complets (DOCTYPE, <html>, <head>…</head>,
 *     <body>) en gardant le corps du texte.
 * Un contenu déjà propre passe sans modification (les &quot; légitimes
 * à l'intérieur des attributs ne sont PAS touchés : c'est du HTML
 * valide que le navigateur sait interpréter tout seul).
 */
export function normaliserHtml(brut: string): string {
  let html = String(brut ?? "");

  // 1) Balises échappées → balises réelles (2-3 passes pour le double échappement)
  for (let passe = 0; passe < 3 && BALISES_ECHAPPEES.test(html); passe++) {
    html = decoderEntites(html);
  }

  // 2) Coquille « document complet » (exports IA) → fragment de corps
  html = html
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<\s*\/?\s*html\b[^>]*>/gi, "")
    .replace(/<\s*head\b[^>]*>[\s\S]*?<\s*\/\s*head\s*>/gi, "")
    .replace(/<\s*title\b[^>]*>[\s\S]*?<\s*\/\s*title\s*>/gi, "")
    .replace(/<\s*\/?\s*body\b[^>]*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  return html.trim();
}

// ── Lot 82 — Assainissement sur LISTE BLANCHE (sanitize-html) ──────
// Choisies pour NE PAS changer l'apparence des articles existants :
//   • toutes les balises de mise en forme produites par l'éditeur
//     riche sont conservées ;
//   • les attributs « class » et « style » restent permis (Tailwind et
//     styles inline de l'éditeur), le reste est filtré par balise ;
//   • « font » est conservé (anciens contenus) ;
//   • liens : seuls http, https et mailto — les javascript:/data:/
//     vbscript: sont retirés, rel « noopener noreferrer nofollow »
//     ajouté systématiquement ;
//   • images : http/https et data: (captures collées dans l'éditeur).
const OPTIONS_ASSAINISSEMENT: sanitizeHtml.IOptions = {
  allowedTags: [
    // Structure et texte
    "p", "br", "hr", "span", "div", "blockquote", "pre", "code",
    "mark", "small", "sub", "sup", "font", "center",
    // Titres
    "h1", "h2", "h3", "h4", "h5", "h6",
    // Listes et définitions
    "ul", "ol", "li", "dl", "dt", "dd",
    // Mise en valeur
    "strong", "b", "em", "i", "u", "s", "del", "ins",
    // Liens et images
    "a", "img",
    // Tableaux
    "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption",
    // Sections
    "figure", "figcaption", "section", "article", "header", "footer",
    "aside", "nav", "main",
    // Médias (anciens contenus) — les gestionnaires d'événements et les
    // URL non http(s) restent interdits même sur ces balises.
    "video", "audio", "source", "track",
  ],
  allowedAttributes: {
    a: ["href", "name", "target", "rel", "title"],
    img: ["src", "srcset", "sizes", "alt", "title", "width", "height", "loading"],
    font: ["color", "face", "size"],
    video: ["src", "poster", "width", "height", "controls", "muted", "loop", "preload"],
    audio: ["src", "controls", "muted", "loop", "preload"],
    source: ["src", "type"],
    track: ["src", "kind", "srclang", "label"],
    td: ["colspan", "rowspan", "align", "valign"],
    th: ["colspan", "rowspan", "align", "valign", "scope"],
    tr: ["align", "valign"],
    ol: ["start", "type"],
    li: ["value"],
    // Attributs de mise en page hérités des anciens contenus.
    p: ["align"],
    div: ["align"],
    h1: ["align"], h2: ["align"], h3: ["align"],
    h4: ["align"], h5: ["align"], h6: ["align"],
    hr: ["align", "size", "width"],
    table: ["align", "border", "cellpadding", "cellspacing", "width"],
    // L'éditeur riche produit des classes Tailwind et des styles inline :
    // on les conserve sur toutes les balises pour ne rien changer à
    // l'apparence, tout en filtrant TOUS les autres attributs (onclick,
    // onerror, srcdoc, formaction… disparaissent).
    "*": ["class", "style"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowProtocolRelative: false, // « //exemple.com » refusé
  transformTags: {
    a: (_balise, attribs) => ({
      tagName: "a",
      attribs: { ...attribs, rel: "noopener noreferrer nofollow" },
    }),
  },
};

/** Retire ce qui ne doit JAMAIS être affiché sur le site public :
 *  scripts, iframes, formulaires, gestionnaires d'événements, URLs
 *  dangereuses — via sanitize-html (liste blanche, voir ci-dessus). */
export function nettoyerHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS_ASSAINISSEMENT);
}

/** Pipeline complet, à utiliser AVANT affichage ou enregistrement :
 *  normalise (entités, coquille de document) PUIS assainit. */
export function preparerHtmlPourAffichage(brut: string): string {
  return nettoyerHtml(normaliserHtml(brut));
}

/** Le contenu contient-il déjà du HTML (vs l'ancien texte brut) ? */
export function sembleHtml(texte: string): boolean {
  return /<\/?(p|br|h[1-6]|ul|ol|li|strong|b|em|i|u|s|a|img|table|thead|tbody|tr|td|th|blockquote|pre|code|div|span|section|article|figure|hr|font|mark|small|sub|sup)\b[^>]*>/i.test(
    texte,
  );
}

/**
 * Convertit l'ancien contenu « texte brut » (1 paragraphe = 1 ligne,
 * lignes vides = sauts) en HTML propre pour l'éditeur riche. Un
 * contenu échappé ou enveloppé est d'abord normalisé ; un contenu
 * déjà HTML est assaini ; le résultat est TOUJOURS assaini (Lot 82) :
 * ce qu'il affiche se limite à ce que nettoyerHtml laisse passer.
 */
export function texteVersHtml(texte: string): string {
  const normalise = normaliserHtml(texte);
  if (sembleHtml(normalise)) return nettoyerHtml(normalise);
  const paragraphes = normalise
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return nettoyerHtml(
    paragraphes
      .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
      .join(""),
  );
}