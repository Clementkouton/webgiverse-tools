// app/actions/apprentissage.ts
// Lot 19 (correctif) — actions serveur de la section « Apprendre » du
// dashboard : favoris de prompts IA, progression des tutoriels,
// suppression d'une conversation de l'assistant.
//
// CORRECTIFS apportés par cette version :
//   1. TOUTES les requêtes Prisma sont dans un try/catch : une action ne
//      plante plus jamais. Avant, un échec hors try/catch (create, count,
//      delete…) faisait planter l'action entière → côté client le bouton
//      restait figé et l'overlay d'erreur recouvrait la page.
//   2. Si la base de données n'est pas à jour (tables PromptFavori /
//      ProgressionTuto absentes — codes Prisma P2021 / P2022), l'action
//      renvoie la raison « base » : les boutons affichent alors
//      l'instruction exacte « npx prisma db push » au lieu d'un message
//      générique. Le détail complet est aussi écrit dans le terminal.
//   3. Raisons typées exportées (RaisonApprentissage) pour un affichage
//      précis côté client.
//   4. Client Prisma non régénéré (prisma.promptFavori undefined) → raison
//      « client » : message dédié avec la procédure de régénération.
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LIMITES_DECOUVERTE, premiumActif } from "@/lib/premium";
import { journaliser } from "@/lib/journal";

/** Raisons renvoyées aux composants clients pour afficher le bon message. */
export type RaisonApprentissage =
  | "non-connecte"
  | "invalide"
  | "limite" // plan Découverte : quota atteint
  | "base" // base de données non à jour (tables absentes)
  | "client" // client Prisma non régénéré (modèles nouveaux inconnus)
  | "indisponible"; // erreur passagère

/** Traduit une erreur Prisma en raison affichable + trace dans le terminal. */
function raisonDepuisErreur(erreur: unknown, contexte: string): RaisonApprentissage {
  const code = (erreur as { code?: string } | null)?.code ?? null;
  if (code === "P2021" || code === "P2022") {
    // P2021 : la table n'existe pas · P2022 : une colonne manque
    console.error(
      `[apprentissage] ${contexte} : base de données NON À JOUR (code ${code}).\n` +
        "→ Dans le projet : arrête le serveur puis lance  npx prisma db push\n" +
        "  (crée les tables PromptFavori / ProgressionTuto manquantes), relance le serveur et recharge la page.",
    );
    return "base";
  }

  // « Cannot read properties of undefined (reading 'findUnique') » etc. :
  // le modèle n'existe pas dans le client généré → client Prisma ancien
  // (régénération échouée, typiquement à cause du serveur qui tournait).
  const brut = erreur instanceof Error ? erreur.message : String(erreur ?? "");
  if (
    (brut.includes("of undefined") || brut.includes("of null")) &&
    /(findUnique|findMany|findFirst|upsert|create|createMany|delete|deleteMany|update|updateMany|count|aggregate)/.test(brut)
  ) {
    console.error(
      `[apprentissage] ${contexte} : CLIENT PRISMA NON RÉGÉNÉRÉ — il ne connaît pas les\n` +
        "  modèles PromptFavori / ProgressionTuto ajoutés au Lot 19.\n" +
        "→ Dans le projet, DANS L'ORDRE :\n" +
        "    1. arrête le serveur (Ctrl+C)\n" +
        "    2. npx prisma db push\n" +
        "    3. Remove-Item -Recurse -Force node_modules\\.prisma\n" +
        "    4. npx prisma generate\n" +
        "    5. npm run dev",
    );
    return "client";
  }

  console.error(`[apprentissage] ${contexte} :`, erreur);
  return "indisponible";
}

async function userIdConnecte(): Promise<string | null> {
  try {
    const session = await auth();
    return session?.user?.id ?? null;
  } catch (erreur) {
    console.error("[apprentissage] Session illisible :", erreur);
    return null;
  }
}

/* ════════════════════════════════════════════════════════════════
   1) FAVORIS DE PROMPTS
   ════════════════════════════════════════════════════════════════ */

/** Bascule le favori d'un prompt : présent → retiré, absent → ajouté. */
export async function basculerFavoriPrompt(promptId: string): Promise<{
  ok: boolean;
  favori?: boolean;
  raison?: RaisonApprentissage;
}> {
  const userId = await userIdConnecte();
  if (!userId) return { ok: false, raison: "non-connecte" };

  const idValide = z.string().min(1).max(64).safeParse(promptId);
  if (!idValide.success) return { ok: false, raison: "invalide" };

  try {
    const existant = await prisma.promptFavori.findUnique({
      where: { userId_promptId: { userId, promptId } },
      select: { id: true },
    });

    if (existant) {
      await prisma.promptFavori.delete({ where: { id: existant.id } });
      revalidatePath("/dashboard/prompts");
      revalidatePath("/prompts");
      return { ok: true, favori: false };
    }

    // Plan Découverte : nombre de prompts sauvegardés limité
    if (!(await premiumActif(userId))) {
      const nbPrompts = await prisma.promptFavori.count({ where: { userId } });
      if (nbPrompts >= LIMITES_DECOUVERTE.prompts) {
        return { ok: false, raison: "limite" };
      }
    }

    await prisma.promptFavori.create({ data: { userId, promptId } });
    journaliser(userId, "prompt_favori", JSON.stringify({ promptId }));
    revalidatePath("/dashboard/prompts");
    revalidatePath("/prompts");
    return { ok: true, favori: true };
  } catch (erreur) {
    return { ok: false, raison: raisonDepuisErreur(erreur, "basculerFavoriPrompt") };
  }
}

/** Bouton « retirer » d'une carte du dashboard (formulaire). */
export async function retirerPromptFormulaire(donnees: FormData): Promise<void> {
  const userId = await userIdConnecte();
  if (!userId) return;
  const analyse = z.string().min(1).max(64).safeParse(donnees.get("promptId"));
  if (!analyse.success) return;
  try {
    await prisma.promptFavori.deleteMany({ where: { userId, promptId: analyse.data } });
  } catch (erreur) {
    raisonDepuisErreur(erreur, "retirerPromptFormulaire");
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
): Promise<{ ok: boolean; raison?: RaisonApprentissage }> {
  const userId = await userIdConnecte();
  if (!userId) return { ok: false, raison: "non-connecte" };

  const analyse = z
    .object({ tutoId: z.string().min(1).max(64), statut: z.enum(STATUTS_TUTO) })
    .safeParse({ tutoId, statut });
  if (!analyse.success) return { ok: false, raison: "invalide" };

  try {
    await prisma.progressionTuto.upsert({
      where: { userId_tutoId: { userId, tutoId: analyse.data.tutoId } },
      update: { statut: analyse.data.statut },
      create: { userId, tutoId: analyse.data.tutoId, statut: analyse.data.statut },
    });
  } catch (erreur) {
    return { ok: false, raison: raisonDepuisErreur(erreur, "majProgressionTuto") };
  }
  journaliser(userId, "tuto_progression", JSON.stringify({ tutoId: analyse.data.tutoId, statut: analyse.data.statut }));
  revalidatePath("/dashboard/tutoriels");
  revalidatePath("/tutoriels");
  return { ok: true };
}

/** Retire le tutoriel de la liste (repart de zéro). */
export async function retirerProgressionTuto(
  tutoId: string,
): Promise<{ ok: boolean; raison?: RaisonApprentissage }> {
  const userId = await userIdConnecte();
  if (!userId) return { ok: false, raison: "non-connecte" };
  const analyse = z.string().min(1).max(64).safeParse(tutoId);
  if (!analyse.success) return { ok: false, raison: "invalide" };
  try {
    await prisma.progressionTuto.deleteMany({ where: { userId, tutoId: analyse.data } });
  } catch (erreur) {
    return { ok: false, raison: raisonDepuisErreur(erreur, "retirerProgressionTuto") };
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
  const tutoAnalyse = z.string().min(1).max(64).safeParse(donnees.get("tutoId"));
  if (!tutoAnalyse.success) return;
  const brut = String(donnees.get("statut") ?? "");
  if (brut === "AUCUN") {
    await retirerProgressionTuto(tutoAnalyse.data);
    return;
  }
  const analyse = z.enum(STATUTS_TUTO).safeParse(brut);
  if (!analyse.success) return;
  await majProgressionTuto(tutoAnalyse.data, analyse.data);
}

/* ════════════════════════════════════════════════════════════════
   3) CONVERSATIONS DE L'ASSISTANT
   ════════════════════════════════════════════════════════════════ */

/** Supprime UNE conversation de l'utilisateur connecté (messages en cascade). */
export async function supprimerConversationFormulaire(donnees: FormData): Promise<void> {
  const userId = await userIdConnecte();
  if (!userId) return;
  const analyse = z.string().min(1).max(64).safeParse(donnees.get("conversationId"));
  if (!analyse.success) return;
  try {
    await prisma.conversation.deleteMany({
      where: { id: analyse.data, utilisateurId: userId },
    });
  } catch (erreur) {
    raisonDepuisErreur(erreur, "supprimerConversationFormulaire");
    return;
  }
  revalidatePath("/dashboard/assistant");
}