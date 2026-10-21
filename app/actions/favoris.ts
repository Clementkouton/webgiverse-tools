// app/actions/favoris.ts
"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function userIdConnecte() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function basculerFavori(outilId: string): Promise<{
  [x: string]: any; ok: boolean; favori?: boolean; raison?: string 
}> {
  const userId = await userIdConnecte();
  if (!userId) return { ok: false, raison: "non-connecte" };
  const outilIdValide = z.string().cuid().or(z.string().uuid()).or(z.string().min(1)).safeParse(outilId);
  if (!outilIdValide.success) return { ok: false, raison: "invalide" };

  const existant = await prisma.favorite.findUnique({
    where: { userId_toolId: { userId, toolId: outilId } },
  });
  if (existant) {
    await prisma.favorite.delete({ where: { id: existant.id } });
    revalidatePath("/dashboard");
    return { ok: true, favori: false };
  }
  await prisma.favorite.create({ data: { userId, toolId: outilId } });
  revalidatePath("/dashboard");
  return { ok: true, favori: true };
}

const schemaStatut = z.object({
  favoriId: z.string().min(1),
  statut: z.enum(["A_TESTER", "EN_COURS", "ADOPTE"]),
});

export async function majStatutFavori(favoriId: string, statut: string) {
  const userId = await userIdConnecte();
  if (!userId) return { ok: false };
  const analyse = schemaStatut.safeParse({ favoriId, statut });
  if (!analyse.success) return { ok: false };
  await prisma.favorite.updateMany({ where: { id: favoriId, userId }, data: { statut: analyse.data.statut } });
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function majNote(favoriId: string, note: string) {
  const userId = await userIdConnecte();
  if (!userId) return { ok: false };
  const analyse = z.object({ favoriId: z.string().min(1), note: z.string().max(2000) }).safeParse({ favoriId, note });
  if (!analyse.success) return { ok: false };
  await prisma.favorite.updateMany({ where: { id: favoriId, userId }, data: { note: analyse.data.note } });
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function supprimerFavoriFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) return;
  const favoriId = z.string().min(1).parse(donnees.get("favoriId"));
  await prisma.favorite.deleteMany({ where: { id: favoriId, userId } });
  revalidatePath("/dashboard");
}