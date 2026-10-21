// app/actions/avis.ts
"use server";

// ─────────────────────────────────────────────────────────────────
// Actions serveur pour gérer SES PROPRES avis depuis le dashboard :
// - majAvisAction            → modifier un avis (formulaire client)
// - supprimerAvisFormulaire  → supprimer un avis (formulaire serveur)
// Chaque action vérifie que l'avis appartient bien à l'utilisateur.
// ─────────────────────────────────────────────────────────────────
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";

async function userIdConnecte() {
  const session = await auth();
  return session?.user?.id ?? null;
}

/* ── Modifier un avis (useActionState dans components/dashboard) ── */
export async function majAvisAction(
  _etatPrecedent: { succes: boolean; message: string },
  formData: FormData,
): Promise<{ succes: boolean; message: string }> {
  const userId = await userIdConnecte();
  if (!userId) {
    return { succes: false, message: "Connecte-toi pour modifier ton avis." };
  }

  const analyse = z
    .object({
      avisId: z.string().min(1, "Avis introuvable."),
      note: z.coerce.number().int().min(1, "Note invalide.").max(5, "Note invalide."),
      contenu: z
        .string()
        .trim()
        .min(10, "Ton avis doit contenir au moins 10 caractères.")
        .max(2000, "Ton avis ne peut pas dépasser 2000 caractères."),
    })
    .safeParse({
      avisId: formData.get("avisId"),
      note: formData.get("note"),
      contenu: formData.get("contenu"),
    });
  if (!analyse.success) {
    return {
      succes: false,
      message: analyse.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  try {
    // Le client Prisma généré peut ne pas encore inclure le délégué `avis`.
    const prismaAvis = (prisma as any).avis;
    const avis = await prismaAvis.findUnique({
      where: { id: analyse.data.avisId },
      include: { outil: { select: { slug: true, nom: true } } },
    });
    if (!avis || avis.utilisateurId !== userId) {
      return { succes: false, message: "Avis introuvable ou non autorisé." };
    }

    await prismaAvis.update({
      where: { id: avis.id },
      data: { note: analyse.data.note, contenu: analyse.data.contenu },
    });

    await journaliser(userId, "avis", `Modifié : ${avis.outil.slug}`);
    revalidatePath("/dashboard");
    revalidatePath(`/outil/${avis.outil.slug}`);
    return { succes: true, message: "Avis mis à jour ✓" };
  } catch (error) {
    console.error("[majAvisAction] ERREUR COMPLÈTE :", error);
    return { succes: false, message: "Impossible de modifier l'avis. Réessaie." };
  }
}

/* ── Supprimer un avis (formulaire serveur + BoutonConfirmer) ───── */
export async function supprimerAvisFormulaire(formData: FormData) {
  const userId = await userIdConnecte();
  if (!userId) return;

  const avisId = z.string().min(1).safeParse(formData.get("avisId"));
  if (!avisId.success) return;

  try {
    // Le client Prisma généré peut ne pas encore inclure le délégué `avis`.
    const prismaAvis = (prisma as any).avis;
    const avis = await prismaAvis.findUnique({
      where: { id: avisId.data },
      include: { outil: { select: { slug: true } } },
    });
    if (!avis || avis.utilisateurId !== userId) return;

    await prismaAvis.delete({ where: { id: avis.id } });

    await journaliser(userId, "avis", `Supprimé : ${avis.outil.slug}`);
    revalidatePath("/dashboard");
    revalidatePath(`/outil/${avis.outil.slug}`);
  } catch (error) {
    console.error("[supprimerAvisFormulaire] ERREUR COMPLÈTE :", error);
  }
}