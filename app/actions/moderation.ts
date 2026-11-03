// app/actions/moderation.ts
"use server";
// ─────────────────────────────────────────────────────────────────
// Lot 25 — Actions de la page « Modération » centralisée.
// Les propositions d'outils et les avis réutilisent directement les
// actions existantes de app/actions/admin.ts ; ce fichier ajoute
// uniquement la gestion des MESSAGES DE CONTACT (marquer traité /
// supprimer), absente jusqu'ici, avec trace d'audit.
// ─────────────────────────────────────────────────────────────────
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tracerActionAdmin } from "@/lib/journal-admin";

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

/** Marque un message de contact comme traité (bouton « Traité »). */
export async function marquerMessageTraiteFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = String(donnees.get("messageId") ?? "");
  if (!id) return;
  const message = await prisma.messageContact.findUnique({ where: { id } });
  if (!message) return;
  await prisma.messageContact.update({ where: { id }, data: { traite: true } });
  await tracerActionAdmin({
    action: "CONTACT_TRAITE",
    cible: `Contact : ${message.sujet} (${message.email})`,
  });
  revalidatePath("/admin/moderation");
  revalidatePath("/admin");
}

/** Supprime définitivement un message de contact. */
export async function supprimerMessageContactFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = String(donnees.get("messageId") ?? "");
  if (!id) return;
  const message = await prisma.messageContact.findUnique({ where: { id } });
  if (!message) return;
  await prisma.messageContact.delete({ where: { id } });
  await tracerActionAdmin({
    action: "CONTACT_SUPPRIME",
    cible: `Contact : ${message.sujet} (${message.email})`,
    details: message.message.slice(0, 300),
  });
  revalidatePath("/admin/moderation");
  revalidatePath("/admin");
}
