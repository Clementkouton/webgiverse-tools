import { z } from "zod";

export const schemaMessages = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), contenu: z.string().min(1).max(4000) }))
    .min(1).max(30),
});

export const schemaProposition = z.object({
  nom: z.string().trim().min(2, "Nom trop court").max(80),
  url: z.string().url("URL invalide").max(200),
  description: z.string().trim().min(30, "Décris l'outil en au moins 30 caractères").max(600),
  tarif: z.enum(["Gratuit", "Freemium", "Payant"]),
  categorieId: z.string().min(1, "Choisis une catégorie"),
  contact: z.string().trim().email("E-mail invalide").max(150).optional().or(z.literal("")),
});
export type DonneesProposition = z.infer<typeof schemaProposition>;