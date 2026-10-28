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
  assistantMois: 10, // questions de chat libre par mois calendaire
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

/** 1er jour du mois en cours (UTC) — le quota assistant repart de zéro chaque mois. */
export function debutDuMois(): Date {
  const maintenant = new Date();
  return new Date(
    Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1)
  );
}

export type QuotaAssistant = {
  premium: boolean;
  /** Questions déjà posées ce mois-ci (0 pour les Premium). */
  utilisees: number;
  /** Questions restantes ce mois-ci. null = illimité (Premium). */
  restantes: number | null;
};

/** Compte les questions de chat libre du mois pour savoir si on bloque. */
export async function quotaAssistant(
  utilisateurId: string
): Promise<QuotaAssistant> {
  const premium = await premiumActif(utilisateurId);
  if (premium) {
    return { premium: true, utilisees: 0, restantes: null };
  }
  try {
    const utilisees = await prisma.message.count({
      where: {
        role: "user",
        conversation: { utilisateurId },
        creeLe: { gte: debutDuMois() },
      },
    });
    return {
      premium: false,
      utilisees,
      restantes: Math.max(0, LIMITES_DECOUVERTE.assistantMois - utilisees),
    };
  } catch {
    // Tables absentes (db push pas encore lancé) → on ne bloque personne
    return {
      premium: false,
      utilisees: 0,
      restantes: LIMITES_DECOUVERTE.assistantMois,
    };
  }
}