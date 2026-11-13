"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { estGerantAdmins } from "@/lib/admins-gerants"; // Lot 81 — gérants des droits admin
import { demarrerImpersonation, terminerImpersonation } from "@/lib/impersonation"; // Lot 82

/* ──────────────────────── Helpers internes ──────────────────────── */

/**
 * Récupère l'admin connecté. On passe par l'e-mail de la session puis par
 * une lecture en base : fiable même si la session ne contient pas l'id,
 * et chaque action est ainsi protégée contre un non-admin.
 */
async function getAdmin() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  const admin = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, email: true }, // Lot 81 — e-mail requis pour le contrôle « gérant »
  });
  if (!admin || admin.role !== "ADMIN") return null;
  return admin;
}

function rafraichir(id?: string) {
  revalidatePath("/admin/utilisateurs");
  if (id) revalidatePath(`/admin/utilisateurs/${id}`);
}

/** Lot 82 — nettoyage de l'ancien cookie non signé, chez ceux qui
 *  l'avaient encore dans le navigateur. Silencieux. */
async function purgerAncienCookieImpersonateur() {
  try {
    const jar = await cookies();
    if (jar.get("impersonateurId")) jar.delete("impersonateurId");
  } catch {
    /* hors contexte de requête : rien à purger */
  }
}

/* ──────────────────────── Statut du compte ──────────────────────── */

export async function suspendreMembreFormulaire(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) return;

  const id = String(formData.get("id") ?? "");
  if (!id || id === admin.id) return;

  const cible = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!cible || cible.role === "ADMIN") return;

  const motif = String(formData.get("motif") ?? "").trim();
  await prisma.user.update({
    where: { id },
    data: {
      statut: "SUSPENDU",
      motifSuspension: motif || null,
      suspenduLe: new Date(),
    },
  });
  rafraichir(id);
}

export async function bannirMembreFormulaire(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) return;

  const id = String(formData.get("id") ?? "");
  if (!id || id === admin.id) return;

  const cible = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!cible || cible.role === "ADMIN") return;

  const motif = String(formData.get("motif") ?? "").trim();
  await prisma.user.update({
    where: { id },
    data: {
      statut: "BANNI",
      motifSuspension: motif || null,
      suspenduLe: new Date(),
    },
  });
  rafraichir(id);
}

export async function reactiverMembreFormulaire(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) return;

  const id = String(formData.get("id") ?? "");
  if (!id || id === admin.id) return;

  await prisma.user.update({
    where: { id },
    data: { statut: "ACTIF", motifSuspension: null, suspenduLe: null },
  });
  rafraichir(id);
}

export async function rendreAdminFormulaire(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) return;

  // Lot 81 — donner le rôle admin est réservé aux comptes gérants
  // (webgiverse@gmail.com et clementkouton33@gmail.com) : voir
  // lib/admins-gerants.ts. Un autre admin ne peut pas le faire.
  if (!estGerantAdmins(admin.email)) return;

  const id = String(formData.get("id") ?? "");
  if (!id || id === admin.id) return;

  const cible = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!cible) return;

  await prisma.user.update({ where: { id }, data: { role: "ADMIN" } });
  rafraichir(id);
}

/**
 * Lot 81 — Retire le rôle ADMIN (l'utilisateur redevient USER).
 * Réservé aux comptes gérants (lib/admins-gerants.ts). On ne peut pas
 * retirer son propre rôle : celui qui agit reste donc toujours admin,
 * ce qui garantit qu'un gérant pourra redonner les droits plus tard.
 */
export async function retirerAdminFormulaire(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) return;

  if (!estGerantAdmins(admin.email)) return;

  const id = String(formData.get("id") ?? "");
  if (!id || id === admin.id) return;

  const cible = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!cible || cible.role !== "ADMIN") return;

  await prisma.user.update({ where: { id }, data: { role: "USER" } });
  rafraichir(id);
}

/* ──────────────────── Se connecter en tant que… ──────────────────── */

/**
 * Lot 82 — IMPERSONATION UNIFIÉE sur le mécanisme du cookie signé
 * (lib/impersonation.ts, Lot 35) :
 *   • l'admin garde SA session NextAuth intacte (aucun cookie de
 *     session réécrit) ;
 *   • un second cookie httpOnly « wg-impersonation », JWT signé avec
 *     AUTH_SECRET, désigne la cible — impossible à forger côté client ;
 *   • la callback `jwt` de auth.ts remplace l'identité affichée
 *     (id, rôle, e-mail, nom) tant que le cookie est actif, et le
 *     bandeau rouge l'expose via /api/impersonation/etat.
 *
 * L'ANCIEN mécanisme (session écrite en base + cookie NON SIGNÉ
 * « impersonateurId ») était doublement défectueux : la session en base
 * est ignorée par NextAuth quand `strategy: "jwt"` (aucune connexion
 * réelle ne se produisait), et le cookie non signé ne reposait sur
 * aucune cryptographie. Les deux ont été supprimés.
 */
export async function impersonerFormulaire(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) return;

  const id = String(formData.get("id") ?? "");
  if (!id || id === admin.id) return;

  const cible = await prisma.user.findUnique({
    where: { id },
    select: { role: true, statut: true },
  });
  // On n'impersonne ni un admin, ni un compte suspendu/banni.
  if (!cible || cible.role === "ADMIN" || cible.statut !== "ACTIF") return;

  await purgerAncienCookieImpersonateur();
  await demarrerImpersonation(admin.id, id);

  redirect("/");
}

/** Lot 82 — « Revenir en admin » : supprime le cookie signé, la
 *  session d'origine de l'admin réapparaît immédiatement (elle n'a
 *  jamais été touchée). */
export async function revenirAdminFormulaire() {
  await terminerImpersonation();
  await purgerAncienCookieImpersonateur();
  redirect("/admin/utilisateurs");
}

/**
 * Alias utilisé par le bandeau rouge d'impersonation
 * (components/auth/bandeau-impersonation.tsx) : même action que
 * « Revenir en admin ».
 */
export async function terminerImpersonationFormulaire() {
  await revenirAdminFormulaire();
}

/* ──────────────────────── Notes internes ──────────────────────── */

export async function ajouterNoteMembreFormulaire(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) return;

  const cibleId = String(formData.get("id") ?? "");
  const contenu = String(formData.get("contenu") ?? "").trim();
  if (!cibleId || !contenu) return;

  const cible = await prisma.user.findUnique({ where: { id: cibleId }, select: { id: true } });
  if (!cible) return;

  await prisma.noteMembre.create({
    data: {
      contenu,
      cible: { connect: { id: cibleId } },
      auteur: { connect: { id: admin.id } },
    },
  });
  rafraichir(cibleId);
}

export async function supprimerNoteMembreFormulaire(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) return;

  const noteId = String(formData.get("noteId") ?? "");
  if (!noteId) return;

  const note = await prisma.noteMembre.findUnique({
    where: { id: noteId },
    select: { id: true, cibleId: true },
  });
  if (!note) return;

  await prisma.noteMembre.delete({ where: { id: note.id } });
  rafraichir(note.cibleId);
}