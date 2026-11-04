// app/actions/parrainages.ts
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Parrainage :
//   • membre : obtient (ou retrouve) son code d'invitation ;
//   • admin : relances individuelles et de masse des membres qui
//     n'ont pas encore de filleul Premium.
// ─────────────────────────────────────────────────────────────────
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  assurerCodeParrain,
  creerParrainage,
} from "@/lib/parrainages";
import { envoyerEmail, emailRelanceParrainage } from "@/lib/email";

export type EtatParrainage = { ok: boolean; message: string; code?: string } | null;

/** Le membre récupère son code (créé à la première utilisation). */
export async function obtenirCodeParrainAction(): Promise<EtatParrainage> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Connecte-toi d'abord." };
  try {
    const code = await assurerCodeParrain(session.user.id);
    revalidatePath("/dashboard/parrainage");
    return { ok: true, message: "Ton code d'invitation est prêt.", code };
  } catch {
    return { ok: false, message: "Impossible de générer ton code pour l'instant." };
  }
}

/**
 * Rattache le membre connecté à son parrain via un code (page
 * /dashboard/parrainage — cas des inscrits passés par Google sans
 * paramètre ?ref=, ou d'un code entré plus tard).
 */
export async function rattacherParrainAction(
  _precedent: EtatParrainage,
  donnees: FormData
): Promise<EtatParrainage> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Connecte-toi d'abord." };

  const code = String(donnees.get("code") ?? "");
  const parrainage = await creerParrainage(code, session.user.id);
  if (!parrainage) {
    return {
      ok: false,
      message: "Code inconnu, tu es déjà parrainé(e), ou ce code est le tien.",
    };
  }
  revalidatePath("/dashboard/parrainage");
  return { ok: true, message: "Parrainage enregistré — merci ! 🎉" };
}

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

/** Membres éligibles à une relance (inscrits, actifs, sans filleul Premium). */
async function membresARelancer() {
  const utilisateurs = await prisma.user.findMany({
    where: {
      role: "USER",
      statut: "ACTIF",
      // pas de parrainage récompensé (aucun filleul Premium)
      filleulsParraines: { none: { statut: "RECOMPENSE" } },
    },
    select: { id: true, name: true, email: true, createdAt: true, relanceParrainageLe: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  // On laisse au moins 3 jours après l'inscription avant de relancer,
  // et on place en tête ceux jamais relancés.
  const ilYa3Jours = new Date(Date.now() - 3 * 86_400_000);
  return utilisateurs
    .filter((u) => u.createdAt < ilYa3Jours)
    .sort((a, b) => Number(Boolean(a.relanceParrainageLe)) - Number(Boolean(b.relanceParrainageLe)));
}

async function envoyerRelance(utilisateur: { id: string; name: string | null; email: string }) {
  const code = await assurerCodeParrain(utilisateur.id);
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://webgiverse-tools.vercel.app";
  const lien = `${base}/inscription?ref=${code}`;
  await envoyerEmail({
    a: utilisateur.email,
    sujet: "Ton code de parrainage Webgiverse — +14 jours Premium par filleul",
    html: emailRelanceParrainage({ nom: utilisateur.name ?? "", lienInvitation: lien, jours: 14 }),
  });
  await prisma.user.update({
    where: { id: utilisateur.id },
    data: { relanceParrainageLe: new Date() },
  });
}

/** Relance UN membre (bouton de la liste éligibles, /admin/parrainages). */
export async function relancerMembreFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("utilisateurId"));
  const utilisateur = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, statut: true },
  });
  if (!utilisateur || utilisateur.role !== "USER" || utilisateur.statut !== "ACTIF") return;
  await envoyerRelance(utilisateur);
  revalidatePath("/admin/parrainages");
}

/** Relance tous les éligibles (maximum 100 par clic, les plus anciens d'abord). */
export async function relancerTousFormulaire(): Promise<void> {
  await exigerAdmin();
  const eligible = await membresARelancer();
  const lot = eligible.slice(0, 100);
  for (const membre of lot) {
    await envoyerRelance(membre);
  }
  revalidatePath("/admin/parrainages");
}
