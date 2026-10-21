// app/actions/propositions.ts
"use server";
import { prisma } from "@/lib/prisma";
import { schemaProposition } from "@/lib/schemas";

export async function proposerOutil(donnees: unknown): Promise<{ ok: boolean; message: string }> {
  const analyse = schemaProposition.safeParse(donnees);
  if (!analyse.success) {
    return { ok: false, message: analyse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const d = analyse.data;
  await prisma.toolSubmission.create({
    data: {
      nom: d.nom, url: d.url, description: d.description,
      tarif: d.tarif, categorieId: d.categorieId, contact: d.contact || null,
    },
  });
  return { ok: true, message: "Merci ! L'équipe vérifie ta proposition et te publie la fiche sous quelques jours." };
}