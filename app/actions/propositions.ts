// app/actions/propositions.ts
"use server";
import { headers } from "next/headers"; // Lot 83 — IP pour l'anti spam
import { prisma } from "@/lib/prisma";
import { schemaProposition } from "@/lib/schemas";
import { autoriserRequete, ipClient } from "@/lib/limitation-debit"; // Lot 83

export async function proposerOutil(donnees: unknown): Promise<{ ok: boolean; message: string }> {
  // Lot 83 — Anti spam : 10 propositions par IP et par heure. Sans cela,
  // un script pouvait remplir la boîte de réception de l'admin (table
  // ToolSubmission) de milliers de propositions fictives.
  let ip = "inconnue";
  try {
    ip = ipClient(await headers());
  } catch {
    // hors contexte de requête : la limite par IP sera « inconnue »
  }
  if (!autoriserRequete(`proposition-ip:${ip}`, 10, 60 * 60_000)) {
    return { ok: false, message: "Trop de propositions envoyées. Réessaie dans une heure." };
  }

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