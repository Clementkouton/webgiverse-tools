// app/actions/sponsors.ts
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Slots sponsorisés : création, modification, activation,
// suppression. Le bandeau public (accueil / catégorie) affiche le
// sponsor actif dont les dates de diffusion sont en cours.
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

function lireDate(valeur: FormDataEntryValue | null, defaut?: Date): Date | null {
  if (typeof valeur !== "string" || !valeur.trim()) return defaut ?? null;
  const d = new Date(valeur);
  return Number.isNaN(d.getTime()) ? (defaut ?? null) : d;
}

const schemaSponsor = z.object({
  titre: z.string().trim().min(3).max(80),
  description: z.string().trim().max(200).default(""),
  url: z.string().trim().url("URL invalide (https://…)").max(500),
  imageUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  emplacement: z.enum(["ACCUEIL", "CATEGORIE"]),
  categorieId: z.string().optional(),
  note: z.string().trim().max(300).optional(),
});

/** Création d'un slot (formulaire /admin/sponsors). */
export async function creerSponsorFormulaire(donnees: FormData) {
  await exigerAdmin();
  const analyse = schemaSponsor.safeParse({
    titre: donnees.get("titre"),
    description: donnees.get("description") ?? "",
    url: donnees.get("url"),
    imageUrl: donnees.get("imageUrl") ?? "",
    emplacement: donnees.get("emplacement"),
    categorieId: donnees.get("categorieId") ?? undefined,
    note: donnees.get("note") ?? undefined,
  });
  if (!analyse.success) return;

  const champ = analyse.data;
  const emplacementCategorie = champ.emplacement === "CATEGORIE" && champ.categorieId;
  if (champ.emplacement === "CATEGORIE" && !emplacementCategorie) return;

  await prisma.sponsor.create({
    data: {
      titre: champ.titre,
      description: champ.description,
      url: champ.url,
      imageUrl: champ.imageUrl || null,
      emplacement: champ.emplacement,
      categorieId: champ.emplacement === "CATEGORIE" ? champ.categorieId : null,
      debutLe: lireDate(donnees.get("debutLe"), new Date())!,
      finLe: lireDate(donnees.get("finLe"), new Date(Date.now() + 30 * 86_400_000))!,
      note: champ.note || null,
    },
  });
  revalidatePath("/admin/sponsors");
  revalidatePath("/");
  revalidatePath("/categorie/[slug]", "page");
}

/** Modification d'un slot existant (formulaire dépliable d'une ligne). */
export async function majSponsorFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("sponsorId"));
  const analyse = schemaSponsor.safeParse({
    titre: donnees.get("titre"),
    description: donnees.get("description") ?? "",
    url: donnees.get("url"),
    imageUrl: donnees.get("imageUrl") ?? "",
    emplacement: donnees.get("emplacement"),
    categorieId: donnees.get("categorieId") ?? undefined,
    note: donnees.get("note") ?? undefined,
  });
  if (!analyse.success) return;

  const champ = analyse.data;
  await prisma.sponsor.update({
    where: { id },
    data: {
      titre: champ.titre,
      description: champ.description,
      url: champ.url,
      imageUrl: champ.imageUrl || null,
      emplacement: champ.emplacement,
      categorieId: champ.emplacement === "CATEGORIE" ? champ.categorieId : null,
      debutLe: lireDate(donnees.get("debutLe"), new Date())!,
      finLe: lireDate(donnees.get("finLe"), new Date(Date.now() + 30 * 86_400_000))!,
      note: champ.note || null,
    },
  });
  revalidatePath("/admin/sponsors");
  revalidatePath("/");
  revalidatePath("/categorie/[slug]", "page");
}

/** Active / met en pause un slot (sans toucher aux dates). */
export async function basculerSponsorFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("sponsorId"));
  const sponsor = await prisma.sponsor.findUnique({ where: { id } });
  if (!sponsor) return;
  await prisma.sponsor.update({ where: { id }, data: { actif: !sponsor.actif } });
  revalidatePath("/admin/sponsors");
  revalidatePath("/");
  revalidatePath("/categorie/[slug]", "page");
}

/** Remet les compteurs impressions / clics à zéro. */
export async function remettreStatsSponsorFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("sponsorId"));
  await prisma.sponsor.update({ where: { id }, data: { impressions: 0, clics: 0 } });
  revalidatePath("/admin/sponsors");
}

export async function supprimerSponsorFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("sponsorId"));
  await prisma.sponsor.delete({ where: { id } });
  revalidatePath("/admin/sponsors");
  revalidatePath("/");
  revalidatePath("/categorie/[slug]", "page");
}
