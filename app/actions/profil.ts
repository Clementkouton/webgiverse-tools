// app/actions/profil.ts
"use server";

// Un fichier "use server" ne peut exporter QUE des fonctions async.
// Le schéma Zod vit dans lib/validation/profil.ts (jamais ici !)
import { schemaProfil } from "@/lib/validation/profil";
import { prisma } from "@/lib/prisma"; // ⚠️ adaptez si votre client Prisma est ailleurs (ex: "@/lib/db")
import { auth } from "@/auth";         // ⚠️ adaptez si votre config NextAuth est ailleurs
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
        bio: analyse.data.bio || null,
        siteWeb: analyse.data.siteWeb || null,
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