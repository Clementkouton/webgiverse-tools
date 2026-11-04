// app/actions/gestion-utilisateurs.ts
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Administration des membres :
//   • suspension / bannissement en 1 clic avec motif (révocable) ;
//   • impersonation « Se connecter en tant que… » (+ retour) ;
//   • notes internes privées sur un membre.
// ─────────────────────────────────────────────────────────────────
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  demarrerImpersonation,
  terminerImpersonation,
  lireImpersonation,
} from "@/lib/impersonation";

async function exigerAdmin(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Accès réservé aux administrateurs.");
  const moi = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (moi?.role !== "ADMIN") throw new Error("Accès réservé aux administrateurs.");
  return session.user.id;
}

// ── Suspension / bannissement (révocable) ────────────────────────────

const schemaSuspension = z.object({
  utilisateurId: z.string().min(1),
  motif: z.string().trim().min(3, "Indique un motif (3 caractères minimum).").max(500),
  duree: z.string().optional(), // "1" | "7" | "30" | "" (illimitée)
});

/** Suspend (durée optionnelle en jours) ou bannit un membre, avec motif. */
export async function suspendreMembreFormulaire(donnees: FormData) {
  const adminId = await exigerAdmin();
  const analyse = schemaSuspension.safeParse({
    utilisateurId: donnees.get("utilisateurId"),
    motif: donnees.get("motif"),
    duree: donnees.get("duree") ?? "",
  });
  if (!analyse.success) return;

  const cible = await prisma.user.findUnique({ where: { id: analyse.data.utilisateurId } });
  if (!cible || cible.role === "ADMIN") return; // jamais un admin (dont soi-même)

  const jours = Number(analyse.data.duree ?? "");
  const suspenduJusqua =
    Number.isFinite(jours) && jours > 0
      ? new Date(Date.now() + Math.min(jours, 365) * 24 * 60 * 60 * 1000)
      : null;

  await prisma.user.update({
    where: { id: cible.id },
    data: {
      statut: "SUSPENDU",
      motifCompte: analyse.data.motif,
      suspenduLe: new Date(),
      // réutilisé comme « raison » : la date de fin est dans le motif si fixée
      ...(suspenduJusqua
        ? { motifCompte: `${analyse.data.motif} — jusqu'au ${suspenduJusqua.toLocaleDateString("fr-FR")}` }
        : {}),
    },
  });
  // La session existante est invalidée automatiquement (auth.ts, < 60 s).
  await prisma.noteInterne.create({
    data: {
      cibleId: cible.id,
      auteurId: adminId,
      contenu: `⛔ Suspension : ${analyse.data.motif}`,
    },
  });
  revalidatePath("/admin/utilisateurs");
  revalidatePath(`/admin/utilisateurs/${cible.id}`);
}

/** Bannit définitivement un membre (révocable via « Réactiver »). */
export async function bannirMembreFormulaire(donnees: FormData) {
  const adminId = await exigerAdmin();
  const analyse = schemaSuspension.safeParse({
    utilisateurId: donnees.get("utilisateurId"),
    motif: donnees.get("motif"),
    duree: "",
  });
  if (!analyse.success) return;

  const cible = await prisma.user.findUnique({ where: { id: analyse.data.utilisateurId } });
  if (!cible || cible.role === "ADMIN") return;

  await prisma.user.update({
    where: { id: cible.id },
    data: { statut: "BANNI", motifCompte: analyse.data.motif, suspenduLe: new Date() },
  });
  await prisma.noteInterne.create({
    data: {
      cibleId: cible.id,
      auteurId: adminId,
      contenu: `🚫 Bannissement : ${analyse.data.motif}`,
    },
  });
  revalidatePath("/admin/utilisateurs");
  revalidatePath(`/admin/utilisateurs/${cible.id}`);
}

/** Révoque la suspension / le bannissement : le compte redevient ACTIF. */
export async function reactiverMembreFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("utilisateurId"));
  const cible = await prisma.user.findUnique({ where: { id } });
  if (!cible || cible.statut === "ACTIF") return;

  await prisma.user.update({
    where: { id },
    data: { statut: "ACTIF", motifCompte: null, suspenduLe: null },
  });
  revalidatePath("/admin/utilisateurs");
  revalidatePath(`/admin/utilisateurs/${id}`);
}

// ── Impersonation « Se connecter en tant que… » ──────────────────────

/**
 * Démarre une session de support : l'admin voit le site avec les yeux du
 * membre (bandeau rouge permanent). Interdit sur un autre admin.
 */
export async function impersonerFormulaire(donnees: FormData) {
  const adminId = await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("utilisateurId"));
  if (id === adminId) return;

  const cible = await prisma.user.findUnique({
    where: { id },
    select: { role: true, statut: true },
  });
  // On n'impersonne pas un admin (sécurité) ni un compte inactif.
  if (!cible || cible.role === "ADMIN" || cible.statut !== "ACTIF") return;

  await demarrerImpersonation(adminId, id);
  redirect("/dashboard");
}

/** Bouton « Revenir à mon compte admin » du bandeau rouge. */
export async function terminerImpersonationFormulaire() {
  const impersonation = await lireImpersonation();
  if (!impersonation) redirect("/");
  await terminerImpersonation();
  redirect("/admin/utilisateurs");
}

// ── Notes internes sur un membre (historique privé admin) ────────────

export async function ajouterNoteFormulaire(donnees: FormData) {
  const adminId = await exigerAdmin();
  const cibleId = z.string().min(1).parse(donnees.get("utilisateurId"));
  const contenu = String(donnees.get("contenu") ?? "").trim().slice(0, 2000);
  if (!contenu) return;

  const cible = await prisma.user.findUnique({ where: { id: cibleId }, select: { id: true } });
  if (!cible) return;
  await prisma.noteInterne.create({ data: { cibleId, auteurId: adminId, contenu } });
  revalidatePath(`/admin/utilisateurs/${cibleId}`);
  revalidatePath("/admin/utilisateurs");
}

export async function supprimerNoteFormulaire(donnees: FormData) {
  await exigerAdmin();
  const noteId = z.string().min(1).parse(donnees.get("noteId"));
  const note = await prisma.noteInterne.findUnique({ where: { id: noteId } });
  if (!note) return;
  await prisma.noteInterne.delete({ where: { id: noteId } });
  revalidatePath(`/admin/utilisateurs/${note.cibleId}`);
  revalidatePath("/admin/utilisateurs");
}
