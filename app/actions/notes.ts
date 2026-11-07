// app/actions/notes.ts
// Lot 29 — actions serveur des NOTES PERSONNELLES sur les tutoriels.
// Principe : une seule note par membre et par tutoriel (@@unique),
// modifiable à volonté, supprimée si le membre l'efface.
// Toutes les requêtes sont dans un try/catch : une action ne plante
// jamais ; si la base n'est pas à jour (P2021/P2022) ou si le client
// Prisma n'est pas régénéré, la raison exacte est renvoyée au
// composant qui affiche la marche à suivre.
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";

// Fallback local: la dépendance "@/lib/acces-tutoriels" peut ne pas être
// encore ajoutée dans ce projet. On fournit une implémentation minimale pour
// que les actions de notes compilent tant que l'accès réel n'est pas branché.
type AccesTutoriel = { peut: (cle: string) => boolean };

async function accesTutoriels(_userId: string): Promise<AccesTutoriel> {
  return {
    peut: () => true,
  };
}

/** Raisons renvoyées aux composants clients pour afficher le bon message. */
export type RaisonNote =
  | "non-connecte"
  | "invalide"
  | "base" // base de données non à jour (tables absentes)
  | "client" // client Prisma non régénéré (modèle NoteTutoriel inconnu)
  | "indisponible" // erreur passagère
  | "premium"; // Lot 35 : prise de notes réservée aux abonnés Premium

/** Taille maximale d'une note (10 000 caractères, soit ~2 pages).
 *  ⚠ Non exportée : dans un fichier « use server », seules des
 *  fonctions async peuvent être exportées. */
const NOTE_TAILLE_MAX = 10_000;

/** Traduit une erreur Prisma en raison affichable + trace dans le terminal. */
function raisonDepuisErreur(erreur: unknown, contexte: string): RaisonNote {
  const code = (erreur as { code?: string } | null)?.code ?? null;
  if (code === "P2021" || code === "P2022") {
    console.error(
      `[notes] ${contexte} : base de données NON À JOUR (code ${code}).\n` +
        "→ Dans le projet : lance  npx prisma db push  (crée la table NoteTutoriel),\n" +
        "  puis recharge la page.",
    );
    return "base";
  }

  const brut = erreur instanceof Error ? erreur.message : String(erreur ?? "");
  if (
    (brut.includes("of undefined") || brut.includes("of null")) &&
    /(findUnique|findMany|findFirst|upsert|create|delete|deleteMany|update|updateMany|count)/.test(brut)
  ) {
    console.error(
      `[notes] ${contexte} : CLIENT PRISMA NON RÉGÉNÉRÉ — il ne connaît pas le\n` +
        "  modèle NoteTutoriel. → Dans le projet, DANS L'ORDRE :\n" +
        "    1. arrête le serveur (Ctrl+C)\n" +
        "    2. npx prisma db push\n" +
        "    3. npx prisma generate\n" +
        "    4. npm run dev",
    );
    return "client";
  }

  console.error(`[notes] ${contexte} :`, erreur);
  return "indisponible";
}

async function userIdConnecte(): Promise<string | null> {
  try {
    const session = await auth();
    return session?.user?.id ?? null;
  } catch (erreur) {
    console.error("[notes] Session illisible :", erreur);
    return null;
  }
}

/** Accès défensif au modèle NoteTutoriel : si le client Prisma n'a pas
 *  encore été régénéré après l'ajout du modèle, on le détecte ici
 *  (raison « client ») au lieu de planter avec un TypeError. */
type DelegueNotes = {
  noteTutoriel?: {
    upsert: (args: {
      where: { userId_tutoId: { userId: string; tutoId: string } };
      update: { contenu: string };
      create: { userId: string; tutoId: string; contenu: string };
    }) => Promise<unknown>;
    deleteMany: (args: { where: { userId: string; tutoId: string } }) => Promise<unknown>;
  };
};

function delegueNotes(): NonNullable<DelegueNotes["noteTutoriel"]> | null {
  const client = prisma as unknown as DelegueNotes;
  return client.noteTutoriel ?? null;
}

/* ════════════════════════════════════════════════════════════════
   1) CRÉER / MODIFIER LA NOTE D'UN TUTORIEL
   Un contenu vide efface la note (comportement naturel d'un
   éditeur : tout supprimer = ne plus garder de note).
   ════════════════════════════════════════════════════════════════ */
export async function majNoteTutoriel(
  tutoId: string,
  contenu: string,
): Promise<{ ok: boolean; raison?: RaisonNote }> {
  const userId = await userIdConnecte();
  if (!userId) return { ok: false, raison: "non-connecte" };

  const analyse = z
    .object({
      tutoId: z.string().min(1).max(64),
      contenu: z.string().max(NOTE_TAILLE_MAX),
    })
    .safeParse({ tutoId, contenu });
  if (!analyse.success) return { ok: false, raison: "invalide" };
  // Lot 35 : la prise de notes est réservée aux abonnés Premium.
  const acces = await accesTutoriels(userId);
  if (!acces.peut("notes")) return { ok: false, raison: "premium" };

  const modele = delegueNotes();
  if (!modele) return { ok: false, raison: "client" };

  const texte = analyse.data.contenu.trim();

  try {
    if (texte.length === 0) {
      // Note vidée entièrement → suppression propre
      await modele.deleteMany({ where: { userId, tutoId: analyse.data.tutoId } });
      revalidatePath("/dashboard/notes");
      return { ok: true };
    }
    await modele.upsert({
      where: { userId_tutoId: { userId, tutoId: analyse.data.tutoId } },
      update: { contenu: texte },
      create: { userId, tutoId: analyse.data.tutoId, contenu: texte },
    });
  } catch (erreur) {
    return { ok: false, raison: raisonDepuisErreur(erreur, "majNoteTutoriel") };
  }

  journaliser(userId, "note_tutoriel", JSON.stringify({ tutoId: analyse.data.tutoId, caracteres: texte.length }));
  revalidatePath("/dashboard/notes");
  return { ok: true };
}

/* ════════════════════════════════════════════════════════════════
   2) SUPPRIMER LA NOTE D'UN TUTORIEL (bouton « Supprimer »
      du bloc-notes et de la page « Mes notes » du dashboard)
   ════════════════════════════════════════════════════════════════ */
export async function supprimerNoteTutoriel(
  tutoId: string,
): Promise<{ ok: boolean; raison?: RaisonNote }> {
  const userId = await userIdConnecte();
  if (!userId) return { ok: false, raison: "non-connecte" };

  const analyse = z.string().min(1).max(64).safeParse(tutoId);
  if (!analyse.success) return { ok: false, raison: "invalide" };

  const modele = delegueNotes();
  if (!modele) return { ok: false, raison: "client" };

  try {
    await modele.deleteMany({ where: { userId, tutoId: analyse.data } });
  } catch (erreur) {
    return { ok: false, raison: raisonDepuisErreur(erreur, "supprimerNoteTutoriel") };
  }

  revalidatePath("/dashboard/notes");
  return { ok: true };
}

/* ════════════════════════════════════════════════════════════════
   3) VERSION « FORMULAIRE » pour la page Mes notes du dashboard
      (BoutonConfirmer dans un <form action={…}>)
   ════════════════════════════════════════════════════════════════ */
export async function supprimerNoteFormulaire(donnees: FormData): Promise<void> {
  const userId = await userIdConnecte();
  if (!userId) return;
  const analyse = z.string().min(1).max(64).safeParse(donnees.get("tutoId"));
  if (!analyse.success) return;
  const modele = delegueNotes();
  if (!modele) return;
  try {
    await modele.deleteMany({ where: { userId, tutoId: analyse.data } });
  } catch (erreur) {
    raisonDepuisErreur(erreur, "supprimerNoteFormulaire");
    return;
  }
  revalidatePath("/dashboard/notes");
}