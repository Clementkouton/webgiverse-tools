// app/actions/codes-promo.ts
// ─────────────────────────────────────────────────────────────────
// Codes promo Chariow : créer / modifier / activer / supprimer les
// codes -X% depuis /admin/codes-promo.
//
// ⚠️ Écrit sur le VRAI schéma du projet (modèle CodePromo) :
//   id, code (@unique), description?, typeRemise
//   ("POURCENTAGE" | "MONTANT" | "MOIS_OFFERTS"), valeur,
//   dateDebut?, dateFin?, maxUtilisations?, actif, creeLe, majLe,
//   conversions (relation ConversionCodePromo).
// L'ancienne version utilisait pourcentage / note / debutLe / finLe /
// utilisations — des champs qui n'existent pas : c'est elle qui faisait
// échouer le build Vercel (« 'pourcentage' does not exist »).
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

/** Convertit une valeur datetime-local en Date, sinon null. */
function lireDate(valeur: FormDataEntryValue | null): Date | null {
  if (typeof valeur !== "string" || !valeur.trim()) return null;
  const d = new Date(valeur);
  return Number.isNaN(d.getTime()) ? null : d;
}

const TYPES_REMISE = ["POURCENTAGE", "MONTANT", "MOIS_OFFERTS"] as const;
type TypeRemise = (typeof TYPES_REMISE)[number];

const schemaCode = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "Code trop court (3 caractères minimum).")
    .max(40, "Code trop long (40 caractères maximum).")
    .regex(/^[A-Z0-9_-]+$/, "Lettres majuscules, chiffres, tirets uniquement."),
  typeRemise: z.enum(TYPES_REMISE),
  // POURCENTAGE : 1-100 (20 = -20 %) · MONTANT : centimes (500 = 5 USD)
  // · MOIS_OFFERTS : nombre de mois offerts.
  valeur: z.number({ coerce: true }).int("Valeur entière requise.").min(1).max(1_000_000),
  description: z.string().trim().max(300).optional(),
  maxUtilisations: z.number({ coerce: true }).int().min(1).max(100_000).optional(),
});

/** Lit + valide les champs communs (création comme modification). */
function analyserFormulaire(donnees: FormData) {
  const typeBrut = String(donnees.get("typeRemise") ?? "POURCENTAGE").toUpperCase();
  return schemaCode.safeParse({
    code: donnees.get("code"),
    typeRemise: (TYPES_REMISE as readonly string[]).includes(typeBrut)
      ? (typeBrut as TypeRemise)
      : ("POURCENTAGE" as TypeRemise),
    valeur: donnees.get("valeur"),
    description: String(donnees.get("description") ?? "").trim() || undefined,
    maxUtilisations: String(donnees.get("maxUtilisations") ?? "").trim()
      ? donnees.get("maxUtilisations")
      : undefined,
  });
}

/** Construit les données Prisma à partir du formulaire validé. */
function construireDonnees(
  analyse: {
    data: {
      code: string;
      typeRemise: TypeRemise;
      valeur: number;
      description?: string;
      maxUtilisations?: number;
    };
  },
  donnees: FormData
) {
  return {
    code: analyse.data.code,
    typeRemise: analyse.data.typeRemise,
    valeur: analyse.data.valeur,
    description: analyse.data.description || null,
    dateDebut: lireDate(donnees.get("dateDebut")),
    dateFin: lireDate(donnees.get("dateFin")),
    maxUtilisations:
      analyse.data.maxUtilisations && analyse.data.maxUtilisations > 0
        ? analyse.data.maxUtilisations
        : null,
  };
}

/** Création d'un code promo (formulaire /admin/codes-promo). */
export async function creerCodePromoFormulaire(donnees: FormData) {
  await exigerAdmin();
  const analyse = analyserFormulaire(donnees);
  if (!analyse.success) return;

  // Déjà pris ? (le champ code est unique)
  if (await prisma.codePromo.findUnique({ where: { code: analyse.data.code } })) return;

  try {
    await prisma.codePromo.create({ data: construireDonnees(analyse, donnees) });
  } catch {
    // collision improbable (créé entre-temps) : on ignore
  }
  revalidatePath("/admin/codes-promo");
}

/** Modification d'un code (formulaire dépliable d'une ligne). */
export async function majCodePromoFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("codePromoId"));
  const analyse = analyserFormulaire(donnees);
  if (!analyse.success) return;

  const existant = await prisma.codePromo.findUnique({ where: { id } });
  if (!existant) return;
  if (existant.code !== analyse.data.code) {
    const collision = await prisma.codePromo.findUnique({ where: { code: analyse.data.code } });
    if (collision) return;
  }

  await prisma.codePromo.update({
    where: { id },
    data: construireDonnees(analyse, donnees),
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

/** Remet le compteur de conversions à zéro (supprime l'historique). */
export async function remettreStatsCodePromoFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("codePromoId"));
  const promo = await prisma.codePromo.findUnique({ where: { id } });
  if (!promo) return;
  // Les conversions sont des lignes ConversionCodePromo liées :
  // « remettre à zéro » = supprimer ces lignes de suivi.
  await prisma.conversionCodePromo.deleteMany({ where: { codeId: id } });
  revalidatePath("/admin/codes-promo");
}

export async function supprimerCodePromoFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("codePromoId"));
  // onDelete: Cascade sur ConversionCodePromo → les conversions partent avec.
  await prisma.codePromo.delete({ where: { id } }).catch(() => null);
  revalidatePath("/admin/codes-promo");
}