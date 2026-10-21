// app/actions/profil.ts
"use server";

// Un fichier "use server" ne peut exporter QUE des fonctions async.
// Le schéma Zod vit dans lib/validation/profil.ts (jamais ici !)
import { schemaProfil } from "@/lib/validation/profil";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// Met à jour le profil de l'utilisateur connecté (formulaire dashboard)
export async function majProfil(donnees: unknown) {
  // 1. Vérifier la session
  const session = await auth();
  if (!session?.user?.id) {
    return { succes: false, erreur: "Vous devez être connecté." };
  }

  // 2. Valider les données
  const analyse = schemaProfil.safeParse(donnees);
  if (!analyse.success) {
    const premier = analyse.error.issues[0];
    return { succes: false, erreur: premier?.message ?? "Données invalides." };
  }

  // 3. Mettre à jour en base
  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: analyse.data.nom,
        // ⚠️ CORRIGÉ : les champs « bio » et « siteWeb » n'existent pas dans
        // le model User de prisma/schema.prisma — écrire dessus faisait
        // échouer TOUTE la mise à jour. On ne met à jour que « name ».
        // Pour les activer plus tard : ajouter `bio String?` et
        // `siteWeb String?` dans model User, puis `npx prisma db push`.
      },
    });

    revalidatePath("/dashboard");
    return { succes: true };
  } catch (error) {
    console.error("Erreur majProfil :", error);
    return {
      succes: false,
      erreur: "Impossible de mettre à jour le profil. Réessayez.",
    };
  }
}

// Alias utilisé par le mode guidé de l'assistant
// (components/assistant/mode-guide.tsx importe "enregistrerProfil")
export async function enregistrerProfil(donnees: unknown, p0: string, p1: string) {
  return majProfil(donnees);
}