// lib/assistant/ordre-messages.ts
// ─────────────────────────────────────────────────────────────────
// LOT 70 — ORDRE CHRONOLOGIQUE DÉTERMINISTE DES MESSAGES DE CHAT.
//
// L'ANOMALIE : dans le chat de l'assistant (tutoriels ET assistant
// Webgiverse), la question et sa réponse s'affichaient dans le bon
// ordre à l'écran, mais APRÈS ACTUALISATION (F5) la réponse se
// retrouvait AU-DESSUS de la question.
//
// LA CAUSE : les échanges étaient enregistrés avec `createMany`
// (question + réponse dans le même appel). PostgreSQL fixe `now()`
// à l'instant de DÉBUT de la transaction : les deux lignes recevaient
// donc EXACTEMENT le même `creeLe`. À la relecture, le tri SQL sur une
// date identique ne garantit AUCUN ordre entre les lignes à égalité
// (le tri de PostgreSQL n'est pas stable) : la paire pouvait ressortir
// réponse-avant-question, et le reverse() côté Node inversait le
// désordre → fil affiché à l'envers.
//
// LE CORRECTIF (sans aucune migration) :
//   1. À la SAUVEGARDE : deux créations successives (question PUIS
//      réponse) → deux horodatages distincts (précision microseconde).
//   2. À la LECTURE : tri chronologique avec DÉPARTAGE déterministe —
//      à horodatage égal, la question (« user ») passe AVANT la
//      réponse (« assistant »). Les conversations DÉJÀ enregistrées
//      avec le même horodatage s'affichent donc de nouveau dans le
//      bon ordre, sans toucher à la base.
//   3. `retirerReponsesOrphelinesDebut` : si une coupure de fenêtre
//      (take 50 / take 6) isole une réponse sans sa question en tête
//      de fil, on la retire — un fil commence toujours par une
//      question. Les données ne sont jamais modifiées : c'est
//      uniquement l'ordre d'affichage qui est corrigé.
// ─────────────────────────────────────────────────────────────────

/** Tout message de chat horodaté (les deux noms de champ acceptés). */
export type MessageHorodate = {
  role: string; // "user" | "assistant"
  creeLe?: Date | string | null;
  createdAt?: Date | string | null;
};

/** Horodatage fiable en millisecondes (0 si absent ou illisible). */
function horodatage(m: MessageHorodate): number {
  const brut = m.creeLe ?? m.createdAt ?? null;
  if (!brut) return 0;
  const t = new Date(brut).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Comparateur chronologique : du plus ancien au plus récent, et à
 * horodatage IDENTIQUE, la question (« user ») avant la réponse
 * (« assistant ») — c'est l'ordre dans lequel les paires sont
 * enregistrées depuis le début (createMany [user, assistant]).
 */
export function comparerChronologique(
  a: MessageHorodate,
  b: MessageHorodate,
): number {
  const da = horodatage(a);
  const db = horodatage(b);
  if (da !== db) return da - db;
  const pa = a.role === "assistant" ? 1 : 0;
  const pb = b.role === "assistant" ? 1 : 0;
  return pa - pb;
}

/** Copie triée chronologiquement (jamais de mutation de l'original). */
export function ordonnerMessagesChronologique<T extends MessageHorodate>(
  messages: T[],
): T[] {
  return [...messages].sort(comparerChronologique);
}

/**
 * Retire les réponses sans question en tête de fil (coupure de
 * fenêtre « take »). Le fil affiché commence toujours par une question.
 */
export function retirerReponsesOrphelinesDebut<T extends { role: string }>(
  messages: T[],
): T[] {
  const copie = [...messages];
  while (copie.length > 0 && copie[0].role === "assistant") copie.shift();
  return copie;
}