// lib/paystack.ts
// Intégration Paystack avec MODE SIMULATION AUTOMATIQUE :
// si PAYSTACK_SECRET_KEY n'est pas définie dans .env, tout le parcours
// fonctionne en simulation (aucun argent réel, aucune clé nécessaire).
// Quand tu auras ton compte Paystack, ajoute simplement la clé dans .env :
// tout le reste fonctionne sans recoder.

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { DUREE_JOURS, type ClePlan } from "@/lib/plans";

const API_PAYSTACK = "https://api.paystack.co";

/** La clé secrète Paystack. Vide = mode simulation. */
export function cleSecrete(): string {
  return (process.env.PAYSTACK_SECRET_KEY ?? "").trim();
}

/** Vrai si on est en mode simulation (pas de clé configurée). */
export function estSimulation(): boolean {
  return cleSecrete() === "";
}

/** Référence de paiement unique et lisible (ex : WGV-MD3K2A-9F3B21CD). */
export function nouvelleReference(): string {
  const horodatage = Date.now().toString(36).toUpperCase();
  const aleatoire = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `WGV-${horodatage}-${aleatoire}`;
}

type ReponsePaystack<T> = { status: boolean; message: string; data?: T };

/** Crée une transaction Paystack et renvoie l'URL du checkout officiel. */
export async function initierTransactionPaystack(parametres: {
  email: string;
  montant: number; // centimes
  reference: string;
  urlRetour: string;
}): Promise<{ ok: boolean; message: string; url?: string }> {
  const reponse = await fetch(`${API_PAYSTACK}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cleSecrete()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: parametres.email,
      amount: parametres.montant, // Paystack attend les subunits (cents pour l'USD)
      currency: "USD",
      reference: parametres.reference,
      callback_url: parametres.urlRetour,
      metadata: { service: "Webgiverse Premium" },
    }),
    cache: "no-store",
  });

  const donnees = (await reponse.json()) as ReponsePaystack<{ authorization_url: string }>;
  if (!reponse.ok || !donnees.status || !donnees.data?.authorization_url) {
    return { ok: false, message: donnees.message || "Paystack a refusé l'initialisation." };
  }
  return { ok: true, message: "OK", url: donnees.data.authorization_url };
}

type VerificationPaystack = {
  id?: number;
  status: string; // "success" | "failed" | "abandoned"…
  amount: number;
  currency: string;
  channel?: string;
};

/** Interroge Paystack pour connaître le statut réel d'une transaction. */
export async function verifierTransactionPaystack(
  reference: string,
): Promise<{ ok: boolean; message: string; donnees?: VerificationPaystack }> {
  const reponse = await fetch(`${API_PAYSTACK}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${cleSecrete()}` },
    cache: "no-store",
  });
  const donnees = (await reponse.json()) as ReponsePaystack<VerificationPaystack>;
  if (!reponse.ok || !donnees.status || !donnees.data) {
    return { ok: false, message: donnees.message || "Vérification impossible." };
  }
  return { ok: true, message: "OK", donnees: donnees.data };
}

/**
 * Vérifie la signature du webhook Paystack (HMAC SHA512 du corps brut
 * avec la clé secrète — cf. doc officielle Paystack).
 */
export function signatureWebhookValide(corpsBrut: string, signature: string | null): boolean {
  if (!signature) return false;
  const empreinte = crypto.createHmac("sha512", cleSecrete()).update(corpsBrut).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(empreinte), Buffer.from(signature));
  } catch {
    return false;
  }
}

/** Date d'expiration après un paiement : maintenant + 30 jours. */
export function dateExpiration(): Date {
  return new Date(Date.now() + DUREE_JOURS * 24 * 60 * 60 * 1000);
}

/**
 * Active (ou prolonge) l'abonnement premium d'un utilisateur après un paiement.
 * - Aucun abonnement → création (expire dans 30 jours).
 * - Abonnement encore actif → prolongé de 30 jours à partir de sa date d'expiration
 *   (le client ne perd jamais les jours déjà payés).
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