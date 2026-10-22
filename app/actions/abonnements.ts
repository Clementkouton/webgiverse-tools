// app/actions/abonnements.ts
"use server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Vérifie la session et renvoie l'identifiant de l'utilisateur connecté. */
async function exigerConnecte(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Tu dois être connecté(e).");
  return session.user.id;
}

/**
 * Arrête le renouvellement : l'abonnement reste actif jusqu'à sa date
 * d'expiration (les jours déjà payés sont conservés), mais ne sera plus
 * considéré comme renouvelable. Le plan n'est jamais perdu avant l'échéance.
 */
export async function annulerAbonnementFormulaire(): Promise<void> {
  const utilisateurId = await exigerConnecte();
  const abonnement = await prisma.abonnement.findUnique({ where: { utilisateurId } });
  if (!abonnement || abonnement.statut !== "ACTIF") return;

  await prisma.abonnement.update({
    where: { id: abonnement.id },
    data: { annuleLe: abonnement.annuleLe ?? new Date() },
  });
  revalidatePath("/dashboard/abonnement");
  revalidatePath("/tarifs");
}

/** Change d'avis avant l'échéance : remet le renouvellement en route. */
export async function reactiverAbonnementFormulaire(): Promise<void> {
  const utilisateurId = await exigerConnecte();
  const abonnement = await prisma.abonnement.findUnique({ where: { utilisateurId } });
  if (!abonnement) return;

  await prisma.abonnement.update({
    where: { id: abonnement.id },
    data: { annuleLe: null },
  });
  revalidatePath("/dashboard/abonnement");
  revalidatePath("/tarifs");
}