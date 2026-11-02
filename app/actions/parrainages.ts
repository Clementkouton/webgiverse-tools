// app/actions/parrainages.ts
"use server";
// ─────────────────────────────────────────────────────────────────
// Lot 23 — CONTRÔLE des parrainages depuis /admin/parrainages.
//   • Verser la récompense manuellement (si le webhook a raté) :
//     réutilise recompenserParrain() qui est idempotent et notifie.
//   • Annuler un lien (fraude suspectée, auto-parrainage…) sans
//     supprimer la trace : statut ANNULE, réactivable.
//   • Supprimer définitivement une ligne.
// ─────────────────────────────────────────────────────────────────
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recompenserParrain } from "@/lib/parrainage";

async function exigerAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Accès réservé aux administrateurs.");
  const moi = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (moi?.role !== "ADMIN") throw new Error("Accès réservé aux administrateurs.");
}

/** Lit le champ `parrainageId` du formulaire. */
function lireId(donnees: FormData): string | null {
  const resultat = z.string().min(1).safeParse(donnees.get("parrainageId"));
  return resultat.success ? resultat.data : null;
}

function rafraichir() {
  revalidatePath("/admin/parrainages");
  revalidatePath("/admin");
}

/**
 * Verse « 1 mois offert » au parrain tout de suite (contrôle manuel).
 * La logique (prolongation d'abonnement, notification, marquage
 * RECOMPENSE) est dans recompenserParrain — on vérifie juste que le
 * lien est bien en attente pour éviter les doubles versements.
 */
export async function verserRecompenseFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = lireId(donnees);
  if (!id) return;

  const lien = await (prisma as any).parrainage?.findUnique?.({
    where: { id },
    select: { filleulId: true, statut: true },
  });
  if (!lien || lien.statut !== "EN_ATTENTE") return;

  await recompenserParrain(lien.filleulId);
  rafraichir();
}

/** Casse le lien parrain/filleul (anti-fraude) — réactivable. */
export async function annulerParrainageFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = lireId(donnees);
  if (!id) return;

  await (prisma as any).parrainage?.update?.({
    where: { id },
    data: { statut: "ANNULE", recompenseLe: null },
  });
  rafraichir();
}

/** Rétablit un lien annulé en « en attente » (la récompense pourra être versée). */
export async function reactiverParrainageFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = lireId(donnees);
  if (!id) return;

  await (prisma as any).parrainage?.update?.({
    where: { id },
    data: { statut: "EN_ATTENTE" },
  });
  rafraichir();
}

/** Suppression définitive de la ligne de parrainage. */
export async function supprimerParrainageFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = lireId(donnees);
  if (!id) return;

  await (prisma as any).parrainage?.delete?.({ where: { id } });
  rafraichir();
}