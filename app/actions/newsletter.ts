// app/actions/newsletter.ts
"use server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type EtatAbonnement = { ok: boolean; message: string };

export async function abonnerAction(_avant: EtatAbonnement, donnees: FormData): Promise<EtatAbonnement> {
  const analyse = z.string().trim().email().safeParse(donnees.get("email"));
  if (!analyse.success) return { ok: false, message: "Adresse e-mail invalide." };
  try {
    await prisma.newsletterSubscriber.upsert({
      where: { email: analyse.data }, update: {}, create: { email: analyse.data },
    });
    return { ok: true, message: "Inscription confirmée. Bienvenue dans la galaxie Webgiverse !" };
  } catch {
    return { ok: false, message: "Impossible de t'inscrire pour l'instant. Réessaie dans un instant." };
  }
}