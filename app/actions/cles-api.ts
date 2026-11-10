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
"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
