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
// apparaître sur le site public (scripts, styles globaux, onclick…).
// ─────────────────────────────────────────────────────────────────

/** Balises complètement retirées (avec leur contenu). */
const BALISES_INTERDITES =
  "script|style|iframe|object|embed|link|meta|form|input|button|base";

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

/** Retire ce qui ne doit JAMAIS être affiché sur le site public. */
export function nettoyerHtml(html: string): string {
  return html
    // blocs entiers : <script>…</script>, <style>…</style>…
    .replace(new RegExp(`<\\s*(?:${BALISES_INTERDITES})[^>]*>[\\s\\S]*?<\\s*\\/\\s*(?:${BALISES_INTERDITES})\\s*>`, "gi"), "")
    // balises orphelines : <iframe …>, <meta …>…
    .replace(new RegExp(`<\\s*\\/?\\s*(?:${BALISES_INTERDITES})[^>]*>`, "gi"), "")
    // attributs d'événements : onclick="…", onerror='…', onmouseover=…
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // URLs dangereuses dans les liens, images et iframes restantes
    .replace(/(href|src)\s*=\s*("|')\s*(javascript|data|vbscript):[^"']*\2/gi, '$1="#"')
    // srcdoc d'iframe (déjà retirée, mais au cas où)
    .replace(/\ssrcdoc\s*=\s*("[^"]*"|'[^']*')/gi, "");
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
 * déjà HTML est renvoyé tel quel.
 */
export function texteVersHtml(texte: string): string {
  const normalise = normaliserHtml(texte);
  if (sembleHtml(normalise)) return normalise;
  const paragraphes = normalise
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphes
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}