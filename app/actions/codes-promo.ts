// app/actions/codes-promo.ts
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Codes promo Chariow : créer / suivre les codes -X% et
// leurs conversions. Le code crée la réduction RÉELLE dans Chariow ;
// ici on l'enregistre pour le suivre (lien /tarifs?promo=CODE) et le
// webhook Chariow incrémente les conversions.
// ─────────────────────────────────────────────────────────────────
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function exigerAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Accès réservé aux administrateurs.");
  const moi = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (moi?.role !== "ADMIN") throw new Error("Accès réservé aux administrateurs.");
}

function lireDate(valeur: FormDataEntryValue | null): Date | null {
  if (typeof valeur !== "string" || !valeur.trim()) return null;
  const d = new Date(valeur);
  return Number.isNaN(d.getTime()) ? null : d;
}

const schemaCode = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "Code trop court (3 caractères minimum).")
    .max(40)
    .regex(/^[A-Z0-9_-]+$/, "Lettres majuscules, chiffres, tirets uniquement."),
  pourcentage: z
    .number({ coerce: true })
    .int("Pourcentage entier (ex. 20 pour -20 %).")
    .min(1, "Au moins 1 %.")
    .max(100, "100 % maximum."),
  note: z.string().trim().max(300).optional(),
  maxUtilisations: z.number({ coerce: true }).int().min(0).max(100000).optional(),
});

/** Création d'un code promo (formulaire /admin/codes-promo). */
export async function creerCodePromoFormulaire(donnees: FormData) {
  await exigerAdmin();
  const analyse = schemaCode.safeParse({
    code: donnees.get("code"),
    pourcentage: donnees.get("pourcentage"),
    note: donnees.get("note") ?? undefined,
    maxUtilisations: String(donnees.get("maxUtilisations") ?? "").trim()
      ? donnees.get("maxUtilisations")
      : undefined,
  });
  if (!analyse.success) return;

  const code = analyse.data.code;
  if (await prisma.codePromo.findUnique({ where: { code } })) return; // déjà pris

  await prisma.codePromo.create({
    data: {
      code,
      pourcentage: analyse.data.pourcentage,
      note: analyse.data.note || null,
      maxUtilisations:
        analyse.data.maxUtilisations && analyse.data.maxUtilisations > 0
          ? analyse.data.maxUtilisations
          : null,
      debutLe: lireDate(donnees.get("debutLe")),
      finLe: lireDate(donnees.get("finLe")),
    },
  });
  revalidatePath("/admin/codes-promo");
}

/** Modification d'un code (formulaire dépliable d'une ligne). */
export async function majCodePromoFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("codePromoId"));
  const analyse = schemaCode.safeParse({
    code: donnees.get("code"),
    pourcentage: donnees.get("pourcentage"),
    note: donnees.get("note") ?? undefined,
    maxUtilisations: String(donnees.get("maxUtilisations") ?? "").trim()
      ? donnees.get("maxUtilisations")
      : undefined,
  });
  if (!analyse.success) return;

  const existant = await prisma.codePromo.findUnique({ where: { id } });
  if (!existant) return;
  if (existant.code !== analyse.data.code) {
    const collision = await prisma.codePromo.findUnique({ where: { code: analyse.data.code } });
    if (collision) return;
  }

  await prisma.codePromo.update({
    where: { id },
    data: {
      code: analyse.data.code,
      pourcentage: analyse.data.pourcentage,
      note: analyse.data.note || null,
      maxUtilisations:
        analyse.data.maxUtilisations && analyse.data.maxUtilisations > 0
          ? analyse.data.maxUtilisations
          : null,
      debutLe: lireDate(donnees.get("debutLe")),
      finLe: lireDate(donnees.get("finLe")),
    },
  });
  revalidatePath("/admin/codes-promo");
}

/** Active / désactive un code sans le supprimer. */
export async function basculerCodePromoFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("codePromoId"));
  const promo = await prisma.codePromo.findUnique({ where: { id } });
  if (!promo) return;
  await prisma.codePromo.update({ where: { id }, data: { actif: !promo.actif } });
  revalidatePath("/admin/codes-promo");
}

/** Remet le compteur de conversions à zéro. */
export async function remettreStatsCodePromoFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("codePromoId"));
  await prisma.codePromo.update({
    where: { id },
    data: { utilisations: 0, chiffreAffaires: 0 },
  });
  revalidatePath("/admin/codes-promo");
}

export async function supprimerCodePromoFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("codePromoId"));
  await prisma.codePromo.delete({ where: { id } });
  revalidatePath("/admin/codes-promo");
}
