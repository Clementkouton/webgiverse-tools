// app/actions/cles-api.ts
// ─────────────────────────────────────────────────────────────────
// Lot 57 — Niveau 3 Entreprise : idée 21 (clés d'API de lecture).
// La clé n'est JAMAIS stockée en clair : on ne garde que son hash
// SHA-256. La clé complète est affichée UNE SEULE fois, juste
// après sa création, via un cookie éphémère (2 minutes) que la
// page /dashboard/entreprise lit puis n'affiche plus.
// ─────────────────────────────────────────────────────────────────
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";
import { entrepriseActif } from "@/lib/premium";

/** Nombre maximum de clés ACTIVES par compte. */
const MAX_CLES_ACTIVES = 3;

/** Nom du cookie éphémère qui porte la clé à afficher une seule fois. */
const COOKIE_CLE_NOUVELLE = "nouvelle-cle-api";

async function userIdConnecte() {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Crée une clé d'API de lecture (réservé au plan Entreprise). */
export async function creerCleApiFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/entreprise");

  const nom = z.string().trim().min(1).max(40).safeParse(donnees.get("nom"));
  if (!nom.success) redirect("/dashboard/entreprise?message=cles-nom-invalide");

  if (!(await entrepriseActif(userId))) {
    redirect("/dashboard/entreprise?message=non-autorise");
  }

  let nombreActives = 0;
  try {
    nombreActives = await prisma.cleApi.count({
      where: { userId, revoqueeLe: null },
    });
  } catch (erreur) {
    console.error("Clés API (comptage) :", erreur);
    redirect("/dashboard/entreprise?message=base");
  }
  if (nombreActives >= MAX_CLES_ACTIVES) {
    redirect("/dashboard/entreprise?message=cles-limite");
  }

  // Format : wg_ + 40 caractères hexadécimaux (160 bits d'entropie).
  const cle = `wg_${randomBytes(20).toString("hex")}`;
  const cleHash = createHash("sha256").update(cle).digest("hex");
  const prefixe = cle.slice(0, 11); // ex. « wg_1a2b3c4d » pour l'affichage

  let verdict: "cree" | "base" = "cree";
  try {
    await prisma.cleApi.create({
      data: { userId, nom: nom.data, cleHash, prefixe },
    });
  } catch (erreur) {
    console.error("Clés API (création) :", erreur);
    verdict = "base";
  }

  if (verdict === "cree") {
    await journaliser(
      userId,
      "cle_api_creee",
      JSON.stringify({ nom: nom.data, prefixe })
    );
    try {
      // Cookie éphémère (2 minutes, httpOnly) : la page l'affiche
      // une fois, puis plus jamais (la clé n'est pas stockée en clair).
      const stockage = await cookies();
      stockage.set(COOKIE_CLE_NOUVELLE, cle, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 120,
        path: "/",
      });
    } catch {
      // sans le cookie, la clé ne sera simplement pas affichée :
      // l'utilisateur pourra en créer une autre.
    }
  }

  revalidatePath("/dashboard/entreprise");
  redirect(`/dashboard/entreprise?message=${verdict}`);
}

/** Révoque une de ses clés (les appels avec cette clé renvoient 401). */
export async function revoquerCleApiFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/entreprise");

  const cleId = z.string().min(1).safeParse(donnees.get("cleId"));
  if (!cleId.success) redirect("/dashboard/entreprise?message=introuvable");

  if (!(await entrepriseActif(userId))) {
    redirect("/dashboard/entreprise?message=non-autorise");
  }

  let verdict: "revoquee" | "introuvable" | "base" = "revoquee";
  try {
    const resultat = await prisma.cleApi.updateMany({
      where: { id: cleId.data, userId, revoqueeLe: null },
      data: { revoqueeLe: new Date() },
    });
    if (resultat.count === 0) verdict = "introuvable";
  } catch (erreur) {
    console.error("Clés API (révocation) :", erreur);
    verdict = "base";
  }

  if (verdict === "revoquee") {
    await journaliser(userId, "cle_api_revoquee", JSON.stringify({ cleId: cleId.data }));
  }

  revalidatePath("/dashboard/entreprise");
  redirect(`/dashboard/entreprise?message=${verdict}`);
}
