// lib/parrainages.ts
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Parrainage : code personnel, rattachement des filleuls et
// RÉCOMPENSE AUTOMATIQUE quand un filleul passe Premium.
//
// Flux :
//   1. Chaque membre obtient un code unique (généré à la première
//      visite de /dashboard/parrainage).
//   2. Un visiteur s'inscrit via /inscription?ref=CODE (formulaire
//      e-mail) ou Google → création d'un Parrainage EN_ATTENTE.
//   3. Le filleul souscrit un plan Premium (Chariow ou test) →
//      activerAbonnement() appelle recompenserParrainage() :
//      le parrain reçoit automatiquement 14 jours Premium et un e-mail.
// ─────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";
import { envoyerEmail, emailRecompenseParrain } from "@/lib/email";

/** Alphabet sans caractères ambigus (pas de 0/O, 1/I/L). */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function genererCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `WG-${code}`;
}

/**
 * Renvoie le code de parrainage du membre, en le créant au premier appel.
 * Idempotent : les visites suivantes renvoient le même code.
 */
export async function assurerCodeParrain(utilisateurId: string): Promise<string> {
  const utilisateur = await prisma.user.findUnique({
    where: { id: utilisateurId },
    select: { codeParrain: true },
  });
  if (utilisateur?.codeParrain) return utilisateur.codeParrain;

  // Tentative avec quelques essais (collision improbable mais gérée).
  for (let essai = 0; essai < 6; essai++) {
    const code = genererCode();
    try {
      await prisma.user.update({ where: { id: utilisateurId }, data: { codeParrain: code } });
      return code;
    } catch {
      // P2002 (code déjà pris) → on régénère.
    }
  }
  throw new Error("Impossible de générer un code de parrainage unique.");
}

/**
 * Relie un nouveau compte à son parrain via le code d'invitation.
 * Silencieux et idempotent : toute condition non remplie renvoie null
 * (code inconnu, auto-parrainage, filleul déjà parrainé, parrain suspendu).
 */
export async function creerParrainage(codeBrut: string, filleulId: string) {
  const code = codeBrut.trim().toUpperCase();
  if (!code || !filleulId) return null;

  let parrain = await prisma.user.findFirst({
    where: { codeParrain: code },
    select: { id: true, statut: true },
  });
  if (!parrain && code.length >= 20) {
    // Anciens liens partagés (lot 20) : ?ref= contenant l'ID utilisateur.
    parrain = await prisma.user
      .findUnique({ where: { id: code }, select: { id: true, statut: true } })
      .catch(() => null);
  }
  if (!parrain || parrain.id === filleulId) return null;
  if (parrain.statut !== "ACTIF") return null;

  const dejaParraine = await prisma.parrainage.findUnique({
    where: { filleulId },
    select: { id: true },
  });
  if (dejaParraine) return null;

  try {
    return await prisma.parrainage.create({
      data: { parrainId: parrain.id, filleulId, statut: "EN_ATTENTE" },
    });
  } catch {
    return null;
  }
}

/**
 * RÉCOMPENSE AUTOMATIQUE : appelée par activerAbonnement() dès qu'un
 * filleul passe Premium. Le parrain reçoit `joursOfferts` jours Premium :
 * prolongés depuis son échéance s'il est déjà Premium, sinon un plan Pro
 * de 14 jours est créé. Marque le parrainage RECOMPENSE (idempotent).
 */
export async function recompenserParrainage(filleulId: string): Promise<boolean> {
  const parrainage = await prisma.parrainage.findUnique({
    where: { filleulId },
    include: { parrain: { select: { id: true, email: true, name: true } } },
  });
  if (!parrainage || parrainage.statut === "RECOMPENSE") return false;

  const jours = parrainage.joursOfferts > 0 ? parrainage.joursOfferts : 14;
  const maintenant = new Date();
  const abonnement = await prisma.abonnement.findUnique({
    where: { utilisateurId: parrainage.parrainId },
  });
  const base =
    abonnement && abonnement.statut === "ACTIF" && abonnement.expireLe > maintenant
      ? abonnement.expireLe
      : maintenant;
  const expireLe = new Date(base.getTime() + jours * 24 * 60 * 60 * 1000);

  if (abonnement) {
    await prisma.abonnement.update({
      where: { id: abonnement.id },
      data: { statut: "ACTIF", expireLe, annuleLe: null },
    });
  } else {
    await prisma.abonnement.create({
      data: {
        utilisateurId: parrainage.parrainId,
        plan: "PRO",
        statut: "ACTIF",
        debutLe: maintenant,
        expireLe,
      },
    });
  }

  await prisma.parrainage.update({
    where: { id: parrainage.id },
    data: { statut: "RECOMPENSE", recompenseLe: maintenant },
  });

  // E-mail au parrain : ne lève jamais d'exception (envoyerEmail renvoie false).
  const filleul = await prisma.user.findUnique({
    where: { id: filleulId },
    select: { name: true, email: true },
  });
  await envoyerEmail({
    a: parrainage.parrain.email,
    sujet: `+${jours} jours Premium offerts — ton filleul a rejoint Premium !`,
    html: emailRecompenseParrain({
      nomParrain: parrainage.parrain.name,
      nomFilleul: filleul?.name ?? "un nouveau membre",
      jours,
      expireLe,
    }),
  });
  return true;
}
