// lib/journal-admin.ts
// ─────────────────────────────────────────────────────────────────
// Lot 25 — Journal d'audit de la console admin.
// `tracerActionAdmin()` est AUTO-CONTENUE : elle relit la session
// elle-même, donc aucune signature d'action existante ne change.
// Elle ne lève JAMAIS d'exception : une trace ratée ne doit pas
// faire échouer l'action métier qu'elle accompagne.
//
// Lot 85 — `tracerRefusAdmin()` trace les TENTATIVES REFUSÉES :
// un compte connecté SANS rôle admin qui appelle une action admin
// (requête forgée, curiosité, compte piraté…) laisse une trace
// « ACCES_ADMIN_REFUSE » dans le journal : qui, quand, avec quel rôle,
// et si la tentative a eu lieu pendant une impersonation. Les
// tentatives SANS session (attaquant totalement anonyme) ne sont pas
// tracées : rien ne les identifie et le journal ne référence que des
// comptes existants.
// ─────────────────────────────────────────────────────────────────
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type TraceAdmin = {
  /** Code d'action lisible : OUTIL_CREE, ARTICLE_SUPPRIME… */
  action: string;
  /** Libellé de la cible : « Article : Mon titre », « Outil : ChatGPT ». */
  cible: string;
  /** Détails libres : changements, ancien → nouveau, commentaire… */
  details?: string;
};

/** Enregistre une trace d'audit (feu et oubli, silencieux en cas d'échec). */
export async function tracerActionAdmin(trace: TraceAdmin): Promise<void> {
  try {
    const session = await auth();
    const adminId = session?.user?.id;
    if (!adminId) return;
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { name: true, email: true },
    });
    // Keep this access dynamic so a stale generated Prisma type does not
    // prevent the admin audit helper from compiling.
    await (prisma as any).journalAdmin.create({
      data: {
        adminId,
        adminNom: admin?.name ?? admin?.email ?? null,
        action: trace.action,
        cible: trace.cible.slice(0, 200),
        details: trace.details?.slice(0, 2000) ?? null,
      },
    });
  } catch {
    // Le journal ne doit jamais casser l'action métier.
  }
}

/** Traces « consultatives » depuis les routes API (export…). */
export async function tracerConsultation(action: string, cible: string): Promise<void> {
  await tracerActionAdmin({ action, cible });
}

// ── Lot 85 — Trace des refus d'accès admin ──────────────────────────
// Garde-fou ANTI-INONDATION en mémoire : 30 traces maximum par compte
// et par heure glissante (clé = compte × heure). Une requête forgée
// en boucle ne doit pas remplir la table JournalAdmin ; au-delà du
// plafond, le refus reste total côté action, seule la trace s'arrête.
const TRACES_REFUS = new Map<string, number>();
const MAX_TRACES_REFUS_PAR_HEURE = 30;

export type RefusAdmin = {
  /** Compte qui a tenté l'action (existent forcément : connecté). */
  utilisateurId: string;
  email?: string | null;
  /** Rôle du compte au moment de la tentative (USER en principe). */
  role?: string | null;
  /** Identifiant de l'admin si la tentative vient d'une impersonation. */
  impersonnePar?: string | null;
  /** Où la tentative a été repérée : console, gestion utilisateurs… */
  contexte: string;
};

export async function tracerRefusAdmin(infos: RefusAdmin): Promise<void> {
  try {
    const heure = Math.floor(Date.now() / 3_600_000);
    const cle = `${infos.utilisateurId}:${heure}`;
    const total = (TRACES_REFUS.get(cle) ?? 0) + 1;
    TRACES_REFUS.set(cle, total);
    // La carte ne grandit jamais déraisonnablement : une clé par
    // compte et par heure ; purge massive si elle gonfle quand même.
    if (TRACES_REFUS.size > 20_000) TRACES_REFUS.clear();
    if (total > MAX_TRACES_REFUS_PAR_HEURE) return; // anti-inondation

    await (prisma as any).journalAdmin.create({
      data: {
        adminId: infos.utilisateurId,
        adminNom: infos.email ?? null,
        action: "ACCES_ADMIN_REFUSE",
        cible: infos.contexte.slice(0, 200),
        details: [
          `Rôle du compte : ${infos.role ?? "inconnu"}`,
          infos.impersonnePar
            ? `Tentative pendant une impersonation (par ${infos.impersonnePar})`
            : null,
          `Tentative n° ${total} sur la dernière heure`,
        ]
          .filter(Boolean)
          .join(" · ")
          .slice(0, 2000),
      },
    });
  } catch {
    // Le journal ne doit jamais casser l'action métier (refus inclus).
  }
}