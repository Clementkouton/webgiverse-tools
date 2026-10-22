// lib/moneroo.ts
// Intégration Moneroo (https://docs.moneroo.io) avec MODE SIMULATION AUTOMATIQUE :
// si MONEROO_SECRET_KEY n'est pas définie dans .env, tout le parcours
// fonctionne en simulation (aucun argent réel, aucune clé nécessaire).
// Quand tu auras ton compte Moneroo, ajoute simplement la clé dans .env :
// tout le reste fonctionne sans recoder.

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { DUREE_JOURS, type ClePlan } from "@/lib/plans";

const API_MONEROO = "https://api.moneroo.io/v1";

/**
 * Devise des paiements. "USD" aujourd'hui (les prix s'affichent en $).
 * Tu pourras passer à "XOF" plus tard pour du Mobile Money en FCFA —
 * il faudra alors ajuster les montants dans lib/plans.ts.
 */
export const DEVISE = "USD";

/**
 * Moneroo attend le montant dans l'unité PRINCIPALE de la devise
 * (2,99 pour 2,99 USD), alors qu'en base on stocke des centimes (299).
 */
const DIVISEUR = 100;

/** La clé secrète Moneroo (test_... ou live_...). Vide = mode simulation. */
export function cleSecrete(): string {
  return (process.env.MONEROO_SECRET_KEY ?? "").trim();
}

/**
 * Secret de signature des webhooks (dashboard Moneroo → Développeurs → Webhooks).
 * Si tu ne l'as pas configuré séparément, la clé secrète est utilisée.
 */
export function secretWebhook(): string {
  return (process.env.MONEROO_WEBHOOK_SECRET ?? cleSecrete()).trim();
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

type ReponseMoneroo<T> = { message?: string; data?: T; errors?: unknown };

/** Sépare « Jean Dupont » en prénom / nom — Moneroo exige les deux champs. */
function decouperNom(nomComplet: string): { first_name: string; last_name: string } {
  const parties = nomComplet.trim().split(/\s+/).filter(Boolean);
  if (parties.length === 0) return { first_name: "Client", last_name: "Webgiverse" };
  return { first_name: parties[0], last_name: parties.slice(1).join(" ") || "Webgiverse" };
}

/** Crée une transaction Moneroo et renvoie l'identifiant + l'URL du checkout officiel. */
export async function initierPaiementMoneroo(parametres: {
  email: string;
  nomComplet: string;
  montant: number; // en centimes (299 = 2,99 USD)
  reference: string;
  urlRetour: string;
}): Promise<{ ok: boolean; message: string; id?: string; url?: string }> {
  const reponse = await fetch(`${API_MONEROO}/payments/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cleSecrete()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      amount: parametres.montant / DIVISEUR,
      currency: DEVISE,
      description: "Abonnement Webgiverse Premium (30 jours)",
      customer: {
        email: parametres.email,
        ...decouperNom(parametres.nomComplet),
      },
      return_url: parametres.urlRetour,
      metadata: { reference: parametres.reference },
    }),
    cache: "no-store",
  });

  const donnees = (await reponse.json().catch(() => ({}))) as ReponseMoneroo<{
    id: string;
    checkout_url: string;
  }>;
  if (!reponse.ok || !donnees.data?.id || !donnees.data?.checkout_url) {
    return { ok: false, message: donnees.message ?? "Moneroo a refusé l'initialisation." };
  }
  return { ok: true, message: "OK", id: donnees.data.id, url: donnees.data.checkout_url };
}

type VerificationMoneroo = {
  id?: string;
  status?: string; // "success" | "pending" | "failed"
  amount?: number;
  currency?: string | { code?: string } | null;
  capture?: { method?: { name?: string }; gateway?: { name?: string } };
};

/** Interroge Moneroo pour connaître le statut réel d'un paiement (via son identifiant Moneroo). */
export async function verifierPaiementMoneroo(
  idMoneroo: string,
): Promise<{
  ok: boolean;
  message: string;
  donnees?: { statut: string; montant: number; devise: string; canal: string | null };
}> {
  const reponse = await fetch(`${API_MONEROO}/payments/${encodeURIComponent(idMoneroo)}/verify`, {
    headers: { Authorization: `Bearer ${cleSecrete()}`, Accept: "application/json" },
    cache: "no-store",
  });
  const donnees = (await reponse.json().catch(() => ({}))) as ReponseMoneroo<VerificationMoneroo>;
  if (!reponse.ok || !donnees.data?.status) {
    return { ok: false, message: donnees.message ?? "Vérification impossible." };
  }

  // L'API renvoie la devise en objet dans verify, en string dans les webhooks : on gère les deux.
  const devise =
    typeof donnees.data.currency === "string"
      ? donnees.data.currency
      : donnees.data.currency?.code ?? DEVISE;

  return {
    ok: true,
    message: "OK",
    donnees: {
      statut: donnees.data.status,
      montant: Math.round((donnees.data.amount ?? 0) * DIVISEUR), // redevient des centimes
      devise,
      canal: donnees.data.capture?.method?.name ?? donnees.data.capture?.gateway?.name ?? null,
    },
  };
}

/**
 * Vérifie la signature du webhook Moneroo : HMAC-SHA256 du corps brut
 * avec le secret de signature (cf. docs.moneroo.io → Webhooks).
 */
export function signatureWebhookValide(corpsBrut: string, signature: string | null): boolean {
  if (!signature) return false;
  const empreinte = crypto.createHmac("sha256", secretWebhook()).update(corpsBrut).digest("hex");
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