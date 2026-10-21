// lib/schemas.ts
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

// ── Espace admin : création / modification d'un outil ────────────────
export const schemaOutilAdmin = z.object({
  nom: z.string().trim().min(2, "Nom trop court").max(80, "Nom trop long (80 caractères max)"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug trop court")
    .max(80, "Slug trop long (80 caractères max)")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide : minuscules, chiffres et tirets seulement"),
  url: z.string().trim().url("URL invalide (commence par https://…)").max(200),
  logo: z.string().trim().url("URL du logo invalide").max(300).optional().or(z.literal("")),
  description: z.string().trim().min(30, "Décris l'outil en au moins 30 caractères").max(600, "Description trop longue (600 caractères max)"),
  type: z.enum(["OUTIL", "AGENT"], { message: "Choisis le type : outil ou agent" }),
  tarif: z.string().trim().min(2, "Indique le tarif (ex : Freemium — Pro à 20 $/mois)").max(120),
  statut: z.enum(["BROUILLON", "PUBLIE", "ARCHIVE"], { message: "Statut invalide" }),
});