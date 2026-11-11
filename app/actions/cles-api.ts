// app/actions/cles-api.ts
// ─────────────────────────────────────────────────────────────────
// Lot 57 — Privilèges Entreprise Niveau 3.
// Idée 21 : clés d'API de lecture. Un compte avec l'avantage
//   Entreprise (titulaire d'un abonnement ENTREPRISE actif OU membre
//   d'une équipe) peut créer jusqu'à 5 clés actives pour lire ses
//   listes depuis un script, via GET /api/v1/listes.
// Sécurité : la clé n'est JAMAIS stockée en clair — on ne conserve
//   que son hash SHA-256 (cleHash) et son préfixe d'affichage
//   (11 premiers caractères). La clé complète n'est montrée qu'une
//   seule fois, dans l'état du composant client (jamais dans l'URL).
// Défensif : table CleApi absente → erreur propre, jamais de crash.
// ⚠️ Fichier "use server" : chaque export DOIT être une fonction async.
// ─────────────────────────────────────────────────────────────────
// LOT 66 — Deux exports supplémentaires pour la section « Clés d'API »
//   de la page /dashboard/entreprise (formulaire serveur classique) :
//   • creerCleApiFormulaire — action de <form> simple (sans
//     useActionState) : crée la clé, la place dans un cookie
//     éphémère « nouvelle-cle-api » (120 s, httpOnly, lu côté serveur
//     par la page pour l'afficher UNE fois), puis redirige vers
//     /dashboard/entreprise?message=cree ;
//   • revoquerCleApiFormulaire — révoque puis redirige avec
//     ?message=revoquee|introuvable|base.
//   Règle du projet : JAMAIS de redirect() dans un try (il lève une
//   exception qui serait attrapée par le catch) — même structure que
//   app/actions/collaborations.ts.
// ─────────────────────────────────────────────────────────────────
"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";

/** Nombre maximum de clés ACTIVES par compte (les clés révoquées
 *  ne comptent pas). */
const MAX_CLES_ACTIVES = 5;

/** État du formulaire de création (useActionState côté client).
 *  Le composant components/dashboard/formulaire-cle-api.tsx lit cet
 *  état pour afficher la clé une seule fois ou l'erreur exacte. */
export type EtatCle =
  | { ok: true; cle: string; nom: string }
  | { ok: false; erreur: string }
  | null;

async function userIdConnecte() {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Avantage Entreprise = titulaire d'un abonnement ENTREPRISE actif
 *  OU membre d'une équipe (le siège occupe l'avantage, comme pour
 *  les autres bénéfices du plan — voir lib/premium.ts). */
async function avantageEntreprise(userId: string): Promise<boolean> {
  try {
    const abonnement = await prisma.abonnement.findUnique({
      where: { utilisateurId: userId },
      select: { plan: true, statut: true, expireLe: true },
    });
    if (
      abonnement &&
      abonnement.plan === "ENTREPRISE" &&
      abonnement.statut === "ACTIF" &&
      abonnement.expireLe > new Date()
    ) {
      return true;
    }
    const siege = await prisma.membreEntreprise.findFirst({
      where: { membreId: userId },
      select: { id: true },
    });
    return Boolean(siege);
  } catch {
    // table absente → pas d'avantage
    return false;
  }
}

/** Génère la clé : « wg_ » + 32 caractères hexadécimaux aléatoires. */
function genererCle(): string {
  return `wg_${randomBytes(16).toString("hex")}`;
}

/** Idée 21 — Crée une clé d'API de lecture. Action de formulaire
 *  (useActionState) : elle RENVOIE l'état au composant client au
 *  lieu de rediriger, pour que la clé complète s'affiche une seule
 *  fois sans jamais transiter par l'URL. */
export async function creerCleFormulaire(
  _etatPrecedent: EtatCle,
  donnees: FormData
): Promise<EtatCle> {
  const userId = await userIdConnecte();
  if (!userId) return { ok: false, erreur: "connexion" };

  const nom = z.string().trim().min(1).max(50).safeParse(donnees.get("nom"));
  if (!nom.success) return { ok: false, erreur: "nom-invalide" };

  if (!(await avantageEntreprise(userId))) {
    return { ok: false, erreur: "non-autorise" };
  }

  try {
    const nbActives = await prisma.cleApi.count({
      where: { userId, revoqueeLe: null },
    });
    if (nbActives >= MAX_CLES_ACTIVES) {
      return { ok: false, erreur: "limite" };
    }

    const cle = genererCle();
    const cleHash = createHash("sha256").update(cle).digest("hex");
    const prefixe = cle.slice(0, 11); // ex. « wg_1a2b3c4d »

    await prisma.cleApi.create({
      data: { userId, nom: nom.data, cleHash, prefixe },
    });

    try {
      await journaliser(userId, "cle_api_creee", JSON.stringify({ nom: nom.data }));
    } catch {
      // le journal ne doit jamais bloquer la création
    }

    revalidatePath("/dashboard/cles-api");
    return { ok: true, cle, nom: nom.data };
  } catch (erreur) {
    console.error("Clés d'API (création) :", erreur);
    return { ok: false, erreur: "base" };
  }
}

/** LOT 66 — Création d'une clé depuis la page /dashboard/entreprise.
 *  Action de <form> simple : reçoit le FormData, redirige avec un
 *  message. La clé complète transite par le cookie éphémère
 *  « nouvelle-cle-api » (httpOnly : illisible en JavaScript, lu par
 *  la page côté serveur), expiré après 120 s — jamais dans l'URL. */
export async function creerCleApiFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/entreprise");

  // Même validité que le champ de la page (maxLength=40) et que le
  // message « cles-nom-invalide » : 1 à 40 caractères.
  const nom = z.string().trim().min(1).max(40).safeParse(donnees.get("nom"));
  if (!nom.success) redirect("/dashboard/entreprise?message=cles-nom-invalide");

  if (!(await avantageEntreprise(userId))) {
    redirect("/dashboard/entreprise?message=non-autorise");
  }

  // Nombre de clés actives (lecture défensive : table absente → base)
  let nbActives = 0;
  let baseOk = true;
  try {
    nbActives = await prisma.cleApi.count({
      where: { userId, revoqueeLe: null },
    });
  } catch (erreur) {
    console.error("Clés d'API (comptage) :", erreur);
    baseOk = false;
  }
  if (!baseOk) redirect("/dashboard/entreprise?message=base");
  if (nbActives >= MAX_CLES_ACTIVES) {
    redirect("/dashboard/entreprise?message=cles-limite");
  }

  const cle = genererCle();
  const cleHash = createHash("sha256").update(cle).digest("hex");
  const prefixe = cle.slice(0, 11); // ex. « wg_1a2b3c4d »

  let creeOk = true;
  try {
    await prisma.cleApi.create({
      data: { userId, nom: nom.data, cleHash, prefixe },
    });
    try {
      await journaliser(userId, "cle_api_creee", JSON.stringify({ nom: nom.data }));
    } catch {
      // le journal ne doit jamais bloquer la création
    }
  } catch (erreur) {
    console.error("Clés d'API (création) :", erreur);
    creeOk = false;
  }
  if (!creeOk) redirect("/dashboard/entreprise?message=base");

  // Cookie éphémère (120 s) lu par la page pour afficher la clé une
  // seule fois. httpOnly : jamais accessible en JavaScript.
  const jar = await cookies();
  jar.set("nouvelle-cle-api", cle, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 120,
  });

  revalidatePath("/dashboard/entreprise");
  redirect("/dashboard/entreprise?message=cree");
}

/** LOT 66 — Révocation depuis la page /dashboard/entreprise (la clé
 *  révoquée est refusée immédiatement par la route /api/v1/listes). */
export async function revoquerCleApiFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/entreprise");

  const cleId = z.string().min(1).safeParse(donnees.get("cleId"));
  if (!cleId.success) redirect("/dashboard/entreprise?message=introuvable");

  let verdict: "revoquee" | "introuvable" | "base" = "revoquee";
  try {
    const resultat = await prisma.cleApi.updateMany({
      where: { id: cleId.data, userId, revoqueeLe: null },
      data: { revoqueeLe: new Date() },
    });
    if (resultat.count === 0) verdict = "introuvable";
  } catch (erreur) {
    console.error("Clés d'API (révocation) :", erreur);
    verdict = "base";
  }

  if (verdict === "revoquee") {
    try {
      await journaliser(userId, "cle_api_revoquee", JSON.stringify({ cleId: cleId.data }));
    } catch {
      // le journal ne doit jamais bloquer la révocation
    }
  }

  revalidatePath("/dashboard/entreprise");
  redirect(`/dashboard/entreprise?message=${verdict}`);
}

/** Idée 21 — Révoque une de ses clés (la clé révoquée est refusée
 *  immédiatement par la route /api/v1/listes). */
export async function revoquerCleFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/cles-api");

  const cleId = z.string().min(1).safeParse(donnees.get("cleId"));
  if (!cleId.success) redirect("/dashboard/cles-api?message=introuvable");

  let verdict: "revoquee" | "introuvable" | "base" = "revoquee";
  try {
    const resultat = await prisma.cleApi.updateMany({
      where: { id: cleId.data, userId, revoqueeLe: null },
      data: { revoqueeLe: new Date() },
    });
    if (resultat.count === 0) verdict = "introuvable";
  } catch (erreur) {
    console.error("Clés d'API (révocation) :", erreur);
    verdict = "base";
  }

  if (verdict === "revoquee") {
    try {
      await journaliser(userId, "cle_api_revoquee", JSON.stringify({ cleId: cleId.data }));
    } catch {
      // le journal ne doit jamais bloquer la révocation
    }
  }

  revalidatePath("/dashboard/cles-api");
  redirect(`/dashboard/cles-api?message=${verdict}`);
}