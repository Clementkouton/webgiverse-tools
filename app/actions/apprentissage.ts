// app/actions/apprentissage.ts
// Lot 19 — actions serveur de la section « Apprendre » du dashboard :
//   • favoris de prompts IA (basculer / retirer via formulaire)
//   • progression des tutoriels (en cours / terminé / retirer)
//   • suppression d'une conversation de l'assistant
// Toutes les actions vérifient la session côté serveur et ne font jamais
// planter la page si les tables ne sont pas encore créées (db push absent).
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LIMITES_DECOUVERTE, premiumActif } from "@/lib/premium";
import { journaliser } from "@/lib/journal";

async function userIdConnecte(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// Le client Prisma peut ne pas encore inclure ce modèle si `prisma generate`
// n'a pas été relancé après son ajout au schéma.
const promptFavori = (prisma as unknown as {
  promptFavori: {
    findUnique: (args: object) => Promise<{ id: string } | null>;
    delete: (args: object) => Promise<unknown>;
    count: (args: object) => Promise<number>;
    create: (args: object) => Promise<unknown>;
    deleteMany: (args: object) => Promise<unknown>;
  };
}).promptFavori;

// Le client Prisma peut également ne pas encore inclure ce modèle.
const progressionTuto = (prisma as unknown as {
  progressionTuto: {
    upsert: (args: object) => Promise<unknown>;
    deleteMany: (args: object) => Promise<unknown>;
  };
}).progressionTuto;

/* ════════════════════════════════════════════════════════════════
   1) FAVORIS DE PROMPTS
   ════════════════════════════════════════════════════════════════ */

/** Bascule le favori d'un prompt : présent → retiré, absent → ajouté. */
export async function basculerFavoriPrompt(promptId: string): Promise<{
  ok: boolean;
  favori?: boolean;
  raison?: string;
}> {
  const userId = await userIdConnecte();
  if (!userId) return { ok: false, raison: "non-connecte" };

  const idValide = z.string().min(1).max(64).safeParse(promptId);
  if (!idValide.success) return { ok: false, raison: "invalide" };

  let existant: { id: string } | null = null;
  try {
    existant = await promptFavori.findUnique({
      where: { userId_promptId: { userId, promptId } },
      select: { id: true },
    });
  } catch {
    return { ok: false, raison: "indisponible" };
  }

  if (existant) {
    try {
      await promptFavori.delete({ where: { id: existant.id } });
    } catch {
      return { ok: false, raison: "indisponible" };
    }
    revalidatePath("/dashboard/prompts");
    revalidatePath("/prompts");
    return { ok: true, favori: false };
  }

  // Plan Découverte : nombre de prompts sauvegardés limité
  if (!(await premiumActif(userId))) {
    let nbPrompts: number;
    try {
      nbPrompts = await promptFavori.count({ where: { userId } });
    } catch {
      return { ok: false, raison: "indisponible" };
    }
    if (nbPrompts >= LIMITES_DECOUVERTE.prompts) {
      return { ok: false, raison: "limite" };
    }
  }

  try {
    await promptFavori.create({ data: { userId, promptId } });
  } catch {
    return { ok: false, raison: "indisponible" };
  }
  journaliser(userId, "prompt_favori", JSON.stringify({ promptId }));
  revalidatePath("/dashboard/prompts");
  revalidatePath("/prompts");
  return { ok: true, favori: true };
}

/** Bouton « retirer » d'une carte du dashboard (formulaire). */
export async function retirerPromptFormulaire(donnees: FormData): Promise<void> {
  const userId = await userIdConnecte();
  if (!userId) return;
  const promptId = z.string().min(1).parse(donnees.get("promptId"));
  try {
    await promptFavori.deleteMany({ where: { userId, promptId } });
  } catch {
    return;
  }
  revalidatePath("/dashboard/prompts");
}

/* ════════════════════════════════════════════════════════════════
   2) PROGRESSION DES TUTORIELS
   ════════════════════════════════════════════════════════════════ */

const STATUTS_TUTO = ["EN_COURS", "TERMINE"] as const;
type StatutTuto = (typeof STATUTS_TUTO)[number];

/** Définit (ou met à jour) la progression d'un tutoriel. */
export async function majProgressionTuto(
  tutoId: string,
  statut: StatutTuto,
): Promise<{ ok: boolean; raison?: string }> {
  const userId = await userIdConnecte();
  if (!userId) return { ok: false, raison: "non-connecte" };

  const analyse = z
    .object({ tutoId: z.string().min(1).max(64), statut: z.enum(STATUTS_TUTO) })
    .safeParse({ tutoId, statut });
  if (!analyse.success) return { ok: false, raison: "invalide" };

  try {
    await progressionTuto.upsert({
      where: { userId_tutoId: { userId, tutoId } },
      update: { statut: analyse.data.statut },
      create: { userId, tutoId, statut: analyse.data.statut },
    });
  } catch {
    return { ok: false, raison: "indisponible" };
  }
  journaliser(userId, "tuto_progression", JSON.stringify({ tutoId, statut: analyse.data.statut }));
  revalidatePath("/dashboard/tutoriels");
  revalidatePath("/tutoriels");
  return { ok: true };
}

/** Retire le tutoriel de la liste (repart de zéro). */
export async function retirerProgressionTuto(tutoId: string): Promise<{ ok: boolean }> {
  const userId = await userIdConnecte();
  if (!userId) return { ok: false };
  try {
    await progressionTuto.deleteMany({ where: { userId, tutoId } });
  } catch {
    return { ok: false };
  }
  revalidatePath("/dashboard/tutoriels");
  revalidatePath("/tutoriels");
  return { ok: true };
}

/**
 * Version « formulaire » utilisée sur les cartes du dashboard :
 * statut = EN_COURS | TERMINE | AUCUN (AUCUN = retirer la ligne).
 */
export async function majProgressionFormulaire(donnees: FormData): Promise<void> {
  const userId = await userIdConnecte();
  if (!userId) return;
  const tutoId = z.string().min(1).parse(donnees.get("tutoId"));
  const brut = String(donnees.get("statut") ?? "");
  if (brut === "AUCUN") {
    await retirerProgressionTuto(tutoId);
    return;
  }
  const analyse = z.enum(STATUTS_TUTO).safeParse(brut);
  if (!analyse.success) return;
  await majProgressionTuto(tutoId, analyse.data);
}

/* ════════════════════════════════════════════════════════════════
   3) CONVERSATIONS DE L'ASSISTANT
   ════════════════════════════════════════════════════════════════ */

/** Supprime UNE conversation de l'utilisateur connecté (messages en cascade). */
export async function supprimerConversationFormulaire(donnees: FormData): Promise<void> {
  const userId = await userIdConnecte();
  if (!userId) return;
  const conversationId = z.string().min(1).parse(donnees.get("conversationId"));
  try {
    await prisma.conversation.deleteMany({
      where: { id: conversationId, utilisateurId: userId },
    });
  } catch {
    return;
  }
  revalidatePath("/dashboard/assistant");
}