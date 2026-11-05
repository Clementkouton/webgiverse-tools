"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

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
    select: { id: true, role: true },
  });
  if (!admin || admin.role !== "ADMIN") return null;
  return admin;
}

function rafraichir(id?: string) {
  revalidatePath("/admin/utilisateurs");
  if (id) revalidatePath(`/admin/utilisateurs/${id}`);
}

/** Nom du cookie de session NextAuth réellement présent dans le navigateur. */
async function nomCookieSession() {
  const jar = await cookies();
  const candidats = [
    "__Secure-authjs.session-token", // Auth.js v5 en HTTPS
    "authjs.session-token", // Auth.js v5 en local
    "__Secure-next-auth.session-token", // NextAuth v4 en HTTPS
    "next-auth.session-token", // NextAuth v4 en local
  ];
  return candidats.find((nom) => Boolean(jar.get(nom))) ?? null;
}

/**
 * Crée une session en base (model Session : sessionToken / userId / expires)
 * pour l'utilisateur donné et pose le cookie de session correspondant.
 * C'est le mécanisme d'une connexion « en tant que » avec sessions en base.
 */
async function ouvrirSessionPour(userId: string) {
  const nom = await nomCookieSession();
  if (!nom) return false;

  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const sessionToken = randomUUID();
  await prisma.session.create({ data: { sessionToken, userId, expires } });

  const jar = await cookies();
  jar.set(nom, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: nom.startsWith("__Secure"),
    expires,
  });
  return true;
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
      statutCompte: "SUSPENDU",
      motifCompte: motif || null,
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
      statutCompte: "BANNI",
      motifCompte: motif || null,
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
    data: { statutCompte: "ACTIF", motifCompte: null, suspenduLe: null },
  });
  rafraichir(id);
}

export async function rendreAdminFormulaire(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) return;

  const id = String(formData.get("id") ?? "");
  if (!id || id === admin.id) return;

  const cible = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!cible) return;

  await prisma.user.update({ where: { id }, data: { role: "ADMIN" } });
  rafraichir(id);
}

/* ──────────────────── Se connecter en tant que… ──────────────────── */

export async function impersonerFormulaire(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) return;

  const id = String(formData.get("id") ?? "");
  if (!id || id === admin.id) return;

  const cible = await prisma.user.findUnique({
    where: { id },
    select: { role: true, statutCompte: true },
  });
  // On n'impersonne ni un admin, ni un compte suspendu/banni.
  if (!cible || cible.role === "ADMIN" || cible.statutCompte !== "ACTIF") return;

  const ok = await ouvrirSessionPour(id);
  if (!ok) return;

  const jar = await cookies();
  jar.set("impersonateurId", admin.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
  });

  redirect("/");
}

export async function revenirAdminFormulaire() {
  const jar = await cookies();
  const adminId = jar.get("impersonateurId")?.value;
  if (!adminId) redirect("/admin/utilisateurs");

  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, role: true },
  });
  if (!admin || admin.role !== "ADMIN") {
    jar.delete("impersonateurId");
    redirect("/");
  }

  const ok = await ouvrirSessionPour(adminId);
  jar.delete("impersonateurId");
  redirect(ok ? "/admin/utilisateurs" : "/");
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
    data: { auteurId: admin.id, cibleId, contenu },
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