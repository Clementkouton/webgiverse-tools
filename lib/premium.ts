// lib/premium.ts
// ─────────────────────────────────────────────────────────────────
// Source de vérité pour l'application RÉELLE des plans d'abonnement.
// Le plan Découverte (gratuit) a des limites ; les plans Pro et
// Entreprise n'en ont pas. Toutes les actions/API passent par ici.
//
// Lot 54 — sièges d'équipe : un membre invité par un titulaire
// Entreprise actif bénéficie automatiquement des mêmes avantages
// que le plan Entreprise (voir planActif / premiumActif ci-dessous).
// ─────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";

/** Limites du plan Découverte (gratuit) — celles affichées sur /tarifs. */
export const LIMITES_DECOUVERTE = {
  favoris: 20,
  prompts: 10, // prompts IA sauvegardés (« Mes prompts » du dashboard)
  listes: 10,
  assistantMois: 10, // questions de chat libre par mois calendaire
} as const;

/** Lot 54 — nombre maximum de sièges offerts par un abonnement
 *  Entreprise (hors le titulaire lui-même). Pour l'ajuster, change
 *  uniquement cette valeur : la page « Mon équipe » et les vérifications
 *  suivent automatiquement. */
export const MAX_MEMBRES_EQUIPE = 4;

/** Niveau réellement bénéficié : abonnement personnel OU siège d'équipe. */
export type NiveauPlan = "GRATUIT" | "PRO" | "ENTREPRISE";

/** Renvoie true si l'utilisateur a un abonnement ACTIF non expiré. */
export async function premiumActif(utilisateurId: string): Promise<boolean> {
  return (await planActif(utilisateurId)) !== "GRATUIT";
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

// ── Lot 54 — niveau de plan réel ────────────────────────────────

/** Niveau reçu via un siège d'équipe : ENTREPRISE si le membre occupe
 *  un siège dont le titulaire a un abonnement Entreprise ACTIF non
 *  expiré, sinon GRATUIT. Défensif : table absente (migration lot 54
 *  pas encore passée) → GRATUIT, jamais d'erreur. */
async function planViaEquipe(utilisateurId: string): Promise<NiveauPlan> {
  try {
    const membreEntreprise = (prisma as unknown as {
      membreEntreprise: {
        findUnique(args: {
          where: { membreId: string };
          select: { titulaireId: true };
        }): Promise<{ titulaireId: string } | null>;
      };
    }).membreEntreprise;
    const siege = await membreEntreprise.findUnique({
      where: { membreId: utilisateurId },
      select: { titulaireId: true },
    });
    if (!siege) return "GRATUIT";

    const abonnementTitulaire = await prisma.abonnement.findUnique({
      where: { utilisateurId: siege.titulaireId },
      select: { plan: true, statut: true, expireLe: true },
    });
    if (
      abonnementTitulaire &&
      abonnementTitulaire.plan === "ENTREPRISE" &&
      abonnementTitulaire.statut === "ACTIF" &&
      abonnementTitulaire.expireLe > new Date()
    ) {
      return "ENTREPRISE";
    }
  } catch {
    // Table MembreEntreprise absente ou Abonnement absente → plan gratuit
  }
  return "GRATUIT";
}

/**
 * Le niveau le plus élevé dont bénéficie l'utilisateur :
 * 1) son abonnement personnel actif (Pro ou Entreprise) ;
 * 2) à défaut, un siège d'équipe Entreprise actif (lot 54).
 * Défensif : si les tables n'existent pas encore → GRATUIT.
 */
export async function planActif(utilisateurId: string): Promise<NiveauPlan> {
  try {
    const abonnement = await prisma.abonnement.findUnique({
      where: { utilisateurId },
      select: { plan: true, statut: true, expireLe: true },
    });
    if (
      abonnement &&
      abonnement.statut === "ACTIF" &&
      abonnement.expireLe > new Date()
    ) {
      return abonnement.plan === "ENTREPRISE" ? "ENTREPRISE" : "PRO";
    }
  } catch {
    // Table Abonnement absente (db push pas encore lancé) → on continue
  }
  return planViaEquipe(utilisateurId);
}

/** true si l'utilisateur bénéficie du plan Entreprise
 *  (abonnement personnel actif OU siège d'équipe actif). */
export async function entrepriseActif(
  utilisateurId: string
): Promise<boolean> {
  return (await planActif(utilisateurId)) === "ENTREPRISE";
}