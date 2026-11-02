// lib/html.ts
// ─────────────────────────────────────────────────────────────────
// Lot 23 — Assainissement minimaliste du HTML riche des articles.
// Le contenu n'est écrit que depuis la console admin (éditeur riche),
// mais on nettoie quand même ce qui ne doit JAMAIS apparaître sur le
// site public : scripts, iframes arbitraires, attributs d'événement
// (onclick…), URLs javascript:/data:.
// ─────────────────────────────────────────────────────────────────

/** Balises complètement retirées (avec leur contenu). */
const BALISES_INTERDITES = "script|style|iframe|object|embed|link|meta|form|input|button|base";

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

/** Le contenu contient-il déjà du HTML (vs l'ancien texte brut) ? */
export function sembleHtml(texte: string): boolean {
  return /<\/?(p|br|h[1-6]|ul|ol|li|strong|b|em|i|u|s|a|img|table|thead|tbody|tr|td|th|blockquote|pre|code|div|span)\b[^>]*>/i.test(texte);
}

/**
 * Convertit l'ancien contenu « texte brut » (1 paragraphe = 1 ligne,
 * lignes vides = sauts) en HTML propre pour l'éditeur riche. Un
 * contenu déjà HTML est renvoyé tel quel.
 */
export function texteVersHtml(texte: string): string {
  if (sembleHtml(texte)) return texte;
  const paragraphes = texte
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphes
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}