// lib/journal.ts
// Enregistre une action utilisateur dans ActiviteUtilisateur.
// Utilisable partout côté serveur : actions, routes API...
import { prisma } from "@/lib/prisma";

export async function journaliser(
  utilisateurId: string,
  type: string,
  details?: string
): Promise<void> {
  try {
    const activiteUtilisateur = (prisma as unknown as {
      activiteUtilisateur: typeof prisma extends { activiteUtilisateur: infer T }
        ? T
        : {
            create(args: {
              data: { utilisateurId: string; type: string; details?: string };
            }): Promise<unknown>;
          };
    }).activiteUtilisateur;

    await activiteUtilisateur.create({
      data: { utilisateurId, type, details },
    });
  } catch (error) {
    // Ne jamais faire planter une fonctionnalité à cause du journal
    console.error("Journal :", error);
  }
}