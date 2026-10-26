// lib/abonnements.ts
// Règles métier des abonnements Premium — indépendant du moyen de paiement.
// Chariow encaisse l'argent ; ce fichier décide combien de temps le
// premium dure et prolonge sans jamais faire perdre les jours déjà payés.

import { prisma } from "@/lib/prisma";
import { DUREE_JOURS, type ClePlan } from "@/lib/plans";

/** Date d'expiration après un paiement : maintenant + 30 jours. */
export function dateExpiration(): Date {
  return new Date(Date.now() + DUREE_JOURS * 24 * 60 * 60 * 1000);
}

/**
 * Active (ou prolonge) l'abonnement premium d'un utilisateur après un paiement.
 * - Aucun abonnement → création (expire dans 30 jours).
 * - Abonnement encore actif → prolongé de 30 jours À PARTIR de sa date
 *   d'expiration (le client ne perd jamais les jours déjà payés).
 */
export async function activerAbonnement(parametres: {
  utilisateurId: string;
  plan: ClePlan;
  paiementId: string;
}) {
  const maintenant = new Date();
  const existant = await prisma.abonnement.findUnique({
    where: { utilisateurId: parametres.utilisateurId },
  });

  const base =
    existant && existant.statut === "ACTIF" && existant.expireLe > maintenant
      ? existant.expireLe // prolongation : repart de la fin déjà payée
      : maintenant;

  const expireLe = new Date(base.getTime() + DUREE_JOURS * 24 * 60 * 60 * 1000);

  const abonnement = existant
    ? await prisma.abonnement.update({
        where: { id: existant.id },
        data: {
          plan: parametres.plan,
          statut: "ACTIF",
          expireLe,
          annuleLe: null, // une nouvelle souscription annule une éventuelle demande d'arrêt
        },
      })
    : await prisma.abonnement.create({
        data: {
          utilisateurId: parametres.utilisateurId,
          plan: parametres.plan,
          statut: "ACTIF",
          debutLe: maintenant,
          expireLe,
        },
      });

  await prisma.paiement.update({
    where: { id: parametres.paiementId },
    data: { abonnementId: abonnement.id },
  });

  return abonnement;
}