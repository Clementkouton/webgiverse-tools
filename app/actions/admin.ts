// app/actions/admin.ts
"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugifier } from "@/lib/utils";

async function exigerAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Accès réservé aux administrateurs.");
  return session.user.id;
}

export async function approuverPropositionFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("propositionId"));
  const proposition = await prisma.toolSubmission.findUnique({ where: { id }, include: { category: true } });
  if (!proposition || proposition.statut !== "EN_ATTENTE") return;

  let slug = slugifier(proposition.nom);
  if (await prisma.tool.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;

  const outil = await prisma.tool.create({
    data: {
      nom: proposition.nom, slug, url: proposition.url,
      logo: `https://www.google.com/s2/favicons?domain=${new URL(proposition.url).hostname}&sz=128`,
      description: proposition.description,
      tarif: proposition.tarif ?? "À vérifier",
      gratuit: proposition.tarif === "Gratuit" || proposition.tarif === "Freemium",
      verifieLe: new Date(), statut: "PUBLIE",
      ...(proposition.categorieId && {
        categories: { create: [{ categorieId: proposition.categorieId }] },
      }),
    },
  });
  await prisma.toolSubmission.update({ where: { id }, data: { statut: "APPROUVE", toolId: outil.id } });
  revalidatePath("/admin"); revalidatePath("/outils"); revalidatePath("/");
}

export async function refuserPropositionFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("propositionId"));
  await prisma.toolSubmission.update({ where: { id }, data: { statut: "REFUSE" } });
  revalidatePath("/admin");
}

export async function basculerPublicationFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("outilId"));
  const outil = await prisma.tool.findUnique({ where: { id } });
  if (!outil) return;
  await prisma.tool.update({
    where: { id },
    data: { statut: outil.statut === "PUBLIE" ? "ARCHIVE" : "PUBLIE" },
  });
  revalidatePath("/admin"); revalidatePath("/outils");
}

export async function basculerMiseEnAvantFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("outilId"));
  const outil = await prisma.tool.findUnique({ where: { id } });
  if (!outil) return;
  await prisma.tool.update({ where: { id }, data: { misEnAvant: !outil.misEnAvant } });
  revalidatePath("/admin"); revalidatePath("/");
}