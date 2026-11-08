// lib/acces-skills.ts
// ─────────────────────────────────────────────────────────────────
// Lot 38 — SOURCE DE VÉRITÉ de l'accès à la bibliothèque de Skills.
// La section /skills est RÉSERVÉE AUX ABONNÉS (plans Pro et
// Entreprise), même règle que les tutoriels Premium :
//   · Visiteur non connecté  → invitation à se connecter / s'abonner
//   · Membre sans abonnement → invitation à passer Premium
//   · Abonné Pro / Entreprise actif → accès complet
// Le verrou est calculé côté serveur (pages + requêtes) : impossible
// de le contourner depuis le client.
// ─────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";

export type AccesSkills = {
  connecte: boolean;
  premium: boolean;
  /** true si le visiteur peut consulter la bibliothèque complète. */
  peutAcceder: boolean;
};

const ACCES_INVITE: AccesSkills = {
  connecte: false,
  premium: false,
  peutAcceder: false,
};

/**
 * Calcule l'accès Skills d'un visiteur à partir de son abonnement en
 * base. Défensif : table absente / erreur → non premium, la page reste
 * affichable (jamais de crash à cause du verrou).
 */
export async function accesSkills(
  utilisateurId: string | null | undefined,
): Promise<AccesSkills> {
  if (!utilisateurId) return ACCES_INVITE;
  try {
    const abonnement = await prisma.abonnement.findUnique({
      where: { utilisateurId },
      select: { plan: true, statut: true, expireLe: true },
    });
    const premium = Boolean(
      abonnement &&
        abonnement.statut === "ACTIF" &&
        abonnement.expireLe > new Date() &&
        (abonnement.plan === "PRO" || abonnement.plan === "ENTREPRISE"),
    );
    return { connecte: true, premium, peutAcceder: premium };
  } catch {
    // Table Abonnement absente (db push pas encore lancé) → non premium
    return { connecte: true, premium: false, peutAcceder: false };
  }
}