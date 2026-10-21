// lib/validation/profil.ts
// Schémas de validation du profil — AUCUN "use server" ici !
import { z } from "zod";

export const schemaProfil = z.object({
  nom: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(60, "Le nom ne peut pas dépasser 60 caractères."),

  bio: z
    .string()
    .trim()
    .max(300, "La bio ne peut pas dépasser 300 caractères.")
    .optional()
    .or(z.literal("")),

  siteWeb: z
    .string()
    .trim()
    .url("Adresse du site web invalide (ex: https://exemple.com).")
    .optional()
    .or(z.literal("")),
});

export type DonneesProfil = z.infer<typeof schemaProfil>;