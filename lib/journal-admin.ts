// lib/journal-admin.ts
// ─────────────────────────────────────────────────────────────────
// Lot 25 — Journal d'audit de la console admin.
// `tracerActionAdmin()` est AUTO-CONTENUE : elle relit la session
// elle-même, donc aucune signature d'action existante ne change.
// Elle ne lève JAMAIS d'exception : une trace ratée ne doit pas
// faire échouer l'action métier qu'elle accompagne.
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
