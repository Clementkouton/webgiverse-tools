/**
 * Lot 81 — Comptes habilités à GÉRER LES DROITS ADMIN.
 *
 * Seuls ces comptes peuvent donner le rôle ADMIN à un utilisateur
 * (« Rendre admin ») ou le lui retirer (« Retirer admin »).
 *
 * Le contrôle est fait CÔTÉ SERVEUR dans chaque action concernée
 * (app/actions/gestion-utilisateurs.ts et app/actions/admin.ts) ;
 * l'interface ne fait que masquer les boutons pour les autres admins —
 * c'est la vérification serveur qui protège vraiment.
 *
 * La comparaison est insensible à la casse et aux espaces accidentels
 * (saisie, import, provider OAuth…).
 */
export const EMAILS_GERANTS_ADMIN: readonly string[] = [
  "webgiverse@gmail.com",
  "clementkouton33@gmail.com",
];

/** Le compte dont l'e-mail est fourni a-t-il le droit de gérer les admins ? */
export function estGerantAdmins(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalise = email.trim().toLowerCase();
  return EMAILS_GERANTS_ADMIN.includes(normalise);
}