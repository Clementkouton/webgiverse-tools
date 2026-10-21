"use server";

import { randomBytes, scryptSync } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schemaInscription = z.object({
  nom: z.string().trim().min(2, "Indique ton nom (2 caractères minimum).").max(60, "Nom trop long."),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  motDePasse: z.string().min(8, "Choisis un mot de passe de 8 caractères minimum.").max(100),
});

// Même format que le seed : « sel:hash » — compatible avec le fournisseur Credentials
function hacher(motDePasse: string) {
  const sel = randomBytes(16).toString("hex");
  return `${sel}:${scryptSync(motDePasse, sel, 64).toString("hex")}`;
}

export async function inscrireAction(
  _avant: { ok: boolean; message: string },
  donnees: FormData
): Promise<{ ok: boolean; message: string }> {
  const analyse = schemaInscription.safeParse({
    nom: donnees.get("nom"),
    email: donnees.get("email"),
    motDePasse: donnees.get("motDePasse"),
  });
  if (!analyse.success) {
    return { ok: false, message: analyse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const { nom, email, motDePasse } = analyse.data;

  const existant = await prisma.user.findUnique({ where: { email } });
  if (existant) {
    return { ok: false, message: "Un compte existe déjà avec cette adresse — connecte-toi plutôt." };
  }

  await prisma.user.create({
    data: { name: nom, email, motDePasse: hacher(motDePasse) },
  });

  return { ok: true, message: "Compte créé — connexion en cours…" };
}