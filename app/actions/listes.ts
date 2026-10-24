// app/actions/listes.ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LIMITES_DECOUVERTE, premiumActif } from "@/lib/premium";

async function userIdConnecte() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function creerListeFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) return;
  const nom = z.string().trim().min(2).max(60).safeParse(donnees.get("nom"));
  if (!nom.success) return;

  // Application du plan : Découverte = 10 listes max, Premium = illimité
  if (!(await premiumActif(userId))) {
    const nbListes = await prisma.list.count({ where: { userId } });
    if (nbListes >= LIMITES_DECOUVERTE.listes) {
      redirect("/dashboard?onglet=listes&message=limite-listes");
    }
  }

  await prisma.list.create({ data: { userId, nom: nom.data } });
  revalidatePath("/dashboard");
}

export async function renommerListeFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) return;
  const analyse = z.object({ listeId: z.string().min(1), nom: z.string().trim().min(2).max(60) })
    .safeParse({ listeId: donnees.get("listeId"), nom: donnees.get("nom") });
  if (!analyse.success) return;
  const liste = await prisma.list.findFirst({ where: { id: analyse.data.listeId, userId } });
  if (!liste) return;
  await prisma.list.update({ where: { id: liste.id }, data: { nom: analyse.data.nom } });
  revalidatePath("/dashboard");
}

export async function supprimerListeFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) return;
  const listeId = z.string().min(1).parse(donnees.get("listeId"));
  await prisma.list.deleteMany({ where: { id: listeId, userId } }); // cascade sur ListItem
  revalidatePath("/dashboard");
}

export async function ajouterDansListeFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) return;
  const analyse = z.object({ listeId: z.string().min(1), toolId: z.string().min(1) })
    .safeParse({ listeId: donnees.get("listeId"), toolId: donnees.get("toolId") });
  if (!analyse.success) return;
  const liste = await prisma.list.findFirst({ where: { id: analyse.data.listeId, userId } });
  if (!liste) return;
  await prisma.listItem.upsert({
    where: { listId_toolId: { listId: liste.id, toolId: analyse.data.toolId } },
    update: {}, create: { listId: liste.id, toolId: analyse.data.toolId },
  });
  revalidatePath("/dashboard");
}

export async function retirerDeListeFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) return;
  const itemId = z.string().min(1).parse(donnees.get("itemId"));
  const item = await prisma.listItem.findFirst({ where: { id: itemId, list: { userId } } });
  if (!item) return;
  await prisma.listItem.delete({ where: { id: item.id } });
  revalidatePath("/dashboard");
}