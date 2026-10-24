// lib/premium.ts
// ─────────────────────────────────────────────────────────────────
// Source de vérité pour l'application RÉELLE des plans d'abonnement.
// Le plan Découverte (gratuit) a des limites ; les plans Pro et
// Entreprise n'en ont pas. Toutes les actions/API passent par ici.
// ─────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";

/** Limites du plan Découverte (gratuit) — celles affichées sur /tarifs. */
export const LIMITES_DECOUVERTE = {
  favoris: 20,
  listes: 10,
} as const;

/** Renvoie true si l'utilisateur a un abonnement ACTIF non expiré. */
export async function premiumActif(utilisateurId: string): Promise<boolean> {
  try {
    const abonnement = await prisma.abonnement.findUnique({
      where: { utilisateurId },
      select: { statut: true, expireLe: true },
    });
    return Boolean(
      abonnement &&
        abonnement.statut === "ACTIF" &&
        abonnement.expireLe > new Date()
    );
  } catch {
    // Table Abonnement absente (db push pas encore lancé) → plan gratuit
    return false;
  }
}