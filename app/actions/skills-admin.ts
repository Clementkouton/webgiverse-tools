"use server";
// app/actions/skills-admin.ts
// ─────────────────────────────────────────────────────────────────
// Lot 39 — ACTIONS SERVEUR de la console admin pour la bibliothèque
// de Skills (app/admin/skills). Fichier INDÉPENDANT : aucune ligne de
// app/actions/admin.ts n'est modifiée, aucune autre page n'est
// touchée.
//   · basculerSkillFeaturedAction : à la une / retirer de la une
//   · supprimerSkillAction        : suppression d'une fiche
// Chaque action vérifie le rôle ADMIN en base (même garde que
// app/actions/admin.ts) puis rafraîchit /admin/skills et /skills.
// ─────────────────────────────────────────────────────────────────
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const db = prisma as any;

/** Garde admin : vérifie la session ET le rôle en base (immédiat). */
async function exigerAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Accès réservé aux administrateurs.");
  const moi = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (moi?.role !== "ADMIN") throw new Error("Accès réservé aux administrateurs.");
  return session.user.id;
}

/** À la une ↔ retirer de la une (bascule du champ featured). */
export async function basculerSkillFeaturedAction(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("skillId"));
  const skill = await db.skill.findUnique({
    where: { id },
    select: { featured: true },
  });
  if (!skill) return;
  await db.skill.update({
    where: { id },
    data: { featured: !skill.featured },
  });
  revalidatePath("/admin/skills");
  revalidatePath("/skills");
}

/** Supprime définitivement la fiche (la grille /skills se met à jour). */
export async function supprimerSkillAction(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("skillId"));
  try {
    await db.skill.delete({ where: { id } });
  } catch {
    /* déjà supprimée ou table absente : rien à faire */
  }
  revalidatePath("/admin/skills");
  revalidatePath("/skills");
}