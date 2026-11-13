// lib/limitation-debit.ts
// ─────────────────────────────────────────────────────────────────
// Lot 82 — LIMITATION DE DÉBIT (rate limiting) maison, sans dépendance.
//
// Pourquoi : aucune route sensible du site n'était limitée — un script
// pouvait tenter des mots de passe en boucle (connexion), bombarder
// d'e-mails le formulaire « mot de passe oublié », ou noyer
// l'assistant IA (coûts OpenRouter) et les formulaires publics.
//
// Principe : fenêtre fixe en mémoire. Chaque clé (e-mail, IP, utilisateur)
// a un compteur qui expire au bout de la fenêtre ; au-delà du maximum,
// `autoriserRequete` renvoie false et l'appelant répond 429 / message.
//
// ⚠️ LIMITE CONNUE (honnêteté) : sur Vercel, chaque instance de fonction
// a sa PROPRE mémoire — un attaquant réparti sur plusieurs instances
// contourne partiellement la limite. Ça reste une barrière efficace
// contre les scripts simples, les boucles et les accidents ; pour une
// limite globale rigoureuse, brancher Upstash Redis plus tard (l'API
// de ce module est conçue pour être remplacée sans toucher aux appels).
// ─────────────────────────────────────────────────────────────────

type Compteur = {
  /** Fin de la fenêtre courante (horodatage millisecondes). */
  expireLe: number;
  /** Nombre de requêtes admises dans la fenêtre courante. */
  total: number;
};

const COMPTEURS = new Map<string, Compteur>();

/** Garde-fou mémoire : au-delà de ce nombre de clés, on purge tout
 *  (une attaque par IP forgées ne doit pas faire grimper la RAM). */
const MAX_ENTREES = 50_000;

let dernierNettoyage = 0;

function purger(maintenant: number) {
  for (const [cle, compteur] of COMPTEURS) {
    if (compteur.expireLe <= maintenant) COMPTEURS.delete(cle);
  }
}

/**
 * La requête identifiée par `cle` est-elle admise ?
 *   • 1re requête de la fenêtre  → admise, fenêtre démarrée ;
 *   • sous le maximum            → admise, compteur incrémenté ;
 *   • au maximum                 → refusée jusqu'à la fin de la fenêtre.
 * Exemple : autoriserRequete(`connexion:${email}`, 10, 15 * 60_000)
 *   → 10 tentatives maximum par e-mail et par 15 minutes.
 */
export function autoriserRequete(
  cle: string,
  max: number,
  fenetreMs: number,
): boolean {
  const maintenant = Date.now();

  // Nettoyage périodique (une fois par minute au maximum).
  if (maintenant - dernierNettoyage > 60_000 || COMPTEURS.size > MAX_ENTREES) {
    dernierNettoyage = maintenant;
    purger(maintenant);
  }

  const compteur = COMPTEURS.get(cle);
  if (!compteur || compteur.expireLe <= maintenant) {
    // Fenêtre expirée ou première visite : on repart de zéro.
    COMPTEURS.set(cle, { expireLe: maintenant + fenetreMs, total: 1 });
    return true;
  }
  if (compteur.total >= max) return false;
  compteur.total += 1;
  return true;
}

/**
 * Adresse IP du client d'après les en-têtes standard des hébergeurs
 * (Vercel/Netlify renseignent x-forwarded-for ; x-real-ip en secours).
 * Accepte aussi bien un objet Headers de route API que celui renvoyé
 * par `await headers()` dans une Server Action.
 */
export function ipClient(entetes: Headers | null): string {
  if (!entetes) return "inconnue";
  const transmis = entetes.get("x-forwarded-for") ?? "";
  const premier = transmis.split(",")[0]?.trim();
  if (premier) return premier;
  return entetes.get("x-real-ip")?.trim() || "inconnue";
}