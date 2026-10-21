// app/actions/profil.ts
"use server";

// ─────────────────────────────────────────────────────────────────
// Actions serveur du profil utilisateur.
// Un fichier "use server" n'exporte QUE des fonctions async.
// ─────────────────────────────────────────────────────────────────
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";

/* ── 1. Enregistrer le diagnostic de l'assistant ──────────────────
   Appelée par components/assistant/mode-guide.tsx :
   enregistrerProfil(objectif, niveau, budget)
   CORRECTION : avant, cette fonction appelait majProfil(objectif)
   qui validait une chaîne contre un schéma objet → RIEN n'était
   jamais enregistré. Maintenant les 3 champs sont bien sauvegardés.
*/
export async function enregistrerProfil(
  objectif: string,
  niveau: string,
  budget: string,
): Promise<{ succes: boolean; erreur?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { succes: false, erreur: "non-connecte" };
  }

  const analyse = z
    .object({
      objectif: z.string().trim().max(40).optional().or(z.literal("")),
      niveau: z.string().trim().max(40).optional().or(z.literal("")),
      budget: z.string().trim().max(40).optional().or(z.literal("")),
    })
    .safeParse({ objectif, niveau, budget });
  if (!analyse.success) {
    return { succes: false, erreur: "Valeurs invalides." };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        objectif: analyse.data.objectif || null,
        niveau: analyse.data.niveau || null,
        budget: analyse.data.budget || null,
      },
    });
    await journaliser(session.user.id, "profil", "Diagnostic enregistré depuis l'assistant");
    revalidatePath("/dashboard");
    return { succes: true };
  } catch (error) {
    console.error("[enregistrerProfil] ERREUR COMPLÈTE :", error);
    return { succes: false, erreur: "Impossible d'enregistrer le profil. Réessaie." };
  }
}

/* ── 2. Action du formulaire « Mon profil » du dashboard ──────────
   Signature compatible useActionState (React 19) :
   (etatPrecedent, formData) → { succes, message }
   Enregistre le nom + objectif + niveau + budget d'un seul coup.
*/
export async function majProfilAction(
  _etatPrecedent: { succes: boolean; message: string },
  formData: FormData,
): Promise<{ succes: boolean; message: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { succes: false, message: "Connecte-toi pour enregistrer ton profil." };
  }

  const analyse = z
    .object({
      nom: z
        .string()
        .trim()
        .min(2, "Le nom doit contenir au moins 2 caractères.")
        .max(60, "Le nom ne peut pas dépasser 60 caractères.")
        .optional()
        .or(z.literal("")),
      objectif: z.string().trim().max(40).optional().or(z.literal("")),
      niveau: z.string().trim().max(40).optional().or(z.literal("")),
      budget: z.string().trim().max(40).optional().or(z.literal("")),
    })
    .safeParse({
      nom: formData.get("nom"),
      objectif: formData.get("objectif"),
      niveau: formData.get("niveau"),
      budget: formData.get("budget"),
    });
  if (!analyse.success) {
    return {
      succes: false,
      message: analyse.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        // On ne touche au nom que si l'utilisateur en a saisi un.
        ...(analyse.data.nom ? { name: analyse.data.nom } : {}),
        objectif: analyse.data.objectif || null,
        niveau: analyse.data.niveau || null,
        budget: analyse.data.budget || null,
      },
    });
    await journaliser(session.user.id, "profil", "Profil mis à jour depuis le dashboard");
    revalidatePath("/dashboard");
    return { succes: true, message: "Profil enregistré ✓" };
  } catch (error) {
    console.error("[majProfilAction] ERREUR COMPLÈTE :", error);
    return {
      succes: false,
      message: "Impossible d'enregistrer le profil. Réessaie.",
    };
  }
}