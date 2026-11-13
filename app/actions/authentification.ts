"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { envoyerEmail, emailBienvenue } from "@/lib/email";
import { creerParrainage } from "@/lib/parrainages";
import { autoriserRequete, ipClient } from "@/lib/limitation-debit"; // Lot 82

export type EtatFormulaire = { erreur?: string; succes?: string; lien?: string } | null;

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Lot 82 — Destination interne garantie (anti open-redirect) ────
// « //evil.com » commence par un slash mais est une URL protocol-relative
// qui sort du site ; « /\evil.com » aussi après normalisation navigateur.
// On n'accepte donc qu'un chemin relatif à UN seul slash initial.
function suiteSure(valeur: string): string {
  const brute = (valeur || "").trim();
  if (
    brute.startsWith("/") &&
    !brute.startsWith("//") &&
    !brute.startsWith("/\\") &&
    !brute.includes("\\")
  ) {
    return brute;
  }
  return "/dashboard";
}

// ── Lot 82 — IP du visiteur (hors contexte de requête → « inconnue ») ──
async function ipDeLaRequete(): Promise<string> {
  try {
    return ipClient(await headers());
  } catch {
    return "inconnue";
  }
}

// ── Connexion (e-mail + mot de passe) ──────────────────────────
export async function connexionAction(_prec: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const motDePasse = String(formData.get("password") ?? "");
  const suite = suiteSure(String(formData.get("suite") ?? "/dashboard"));

  if (!email || !motDePasse) return { erreur: "Renseigne ton e-mail et ton mot de passe." };

  // Lot 82 — anti brute force : 12 tentatives par e-mail et par
  // 15 minutes, 30 par adresse IP (voir lib/limitation-debit.ts).
  const ip = await ipDeLaRequete();
  if (
    !autoriserRequete(`connexion:${email}`, 12, 15 * 60_000) ||
    !autoriserRequete(`connexion-ip:${ip}`, 30, 15 * 60_000)
  ) {
    return { erreur: "Trop de tentatives de connexion. Réessaie dans quelques minutes." };
  }

  try {
    await signIn("credentials", { email, password: motDePasse, redirectTo: suite });
  } catch (erreur) {
    if (erreur instanceof AuthError) {
      return { erreur: "E-mail ou mot de passe incorrect. (Si tu t'es inscrit avec Google, utilise le bouton Google.)" };
    }
    throw erreur; // laisse passer la redirection
  }
  return null;
}

// ── Bouton Google (connexion ET inscription) ──────────────────
// Lot 35 : si un code de parrainage (?ref=CODE) accompagne l'inscription,
// la redirection passe par /api/parrainage/capture qui relie le nouveau
// compte à son parrain après l'authentification Google.
export async function connexionGoogleAction(formData: FormData) {
  const suite = suiteSure(String(formData.get("suite") ?? "/dashboard"));
  const ref = String(formData.get("ref") ?? "").trim().toUpperCase();
  const destination = ref
    ? `/api/parrainage/capture?ref=${encodeURIComponent(ref)}&suite=${encodeURIComponent(suite)}`
    : suite;
  await signIn("google", { redirectTo: destination });
}

// ── Inscription (nom complet + e-mail + mot de passe) ─────────
export async function inscriptionAction(_prec: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const nom = String(formData.get("nom") ?? "").trim();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (nom.length < 2) return { erreur: "Indique ton nom complet." };
  if (!EMAIL_VALIDE.test(email)) return { erreur: "Adresse e-mail invalide." };
  if (motDePasse.length < 8) return { erreur: "Le mot de passe doit contenir au moins 8 caractères." };
  if (motDePasse !== confirmation) return { erreur: "Les deux mots de passe ne correspondent pas." };

  // Lot 82 — anti création en masse : 5 inscriptions par IP et par heure.
  const ip = await ipDeLaRequete();
  if (!autoriserRequete(`inscription-ip:${ip}`, 5, 60 * 60_000)) {
    return { erreur: "Trop d'inscriptions depuis cette connexion. Réessaie plus tard." };
  }

  const existant = await prisma.user.findUnique({ where: { email } });
  if (existant) {
    return {
      erreur: existant.motDePasse
        ? "Un compte existe déjà avec cet e-mail — connecte-toi."
        : "Un compte Google existe déjà avec cet e-mail — connecte-toi avec Google.",
    };
  }

  const hash = await bcrypt.hash(motDePasse, 10);
  const nouveau = await prisma.user.create({ data: { name: nom, email, motDePasse: hash } });

  // Lot 35 — parrainage : le formulaire peut transmettre ?ref=CODE
  // (champ caché « ref »). Silencieux en cas de code invalide.
  const codeParrain = String(formData.get("ref") ?? "").trim().toUpperCase();
  if (codeParrain) {
    await creerParrainage(codeParrain, nouveau.id).catch(() => null);
  }

  // Email de bienvenue : envoyé AVANT la connexion automatique, car signIn
  // avec redirectTo interrompt l'exécution (redirection) — tout code placé
  // après ne serait jamais exécuté. envoyerEmail ne lève jamais d'exception :
  // même si le SMTP est mal configuré ou en panne, l'inscription continue
  // normalement et l'utilisateur est connecté sans erreur.
  await envoyerEmail({
    a: email,
    sujet: "Bienvenue sur Webgiverse !",
    html: emailBienvenue(nom),
  });

  // Connexion automatique après l'inscription
  try {
    await signIn("credentials", { email, password: motDePasse, redirectTo: "/dashboard" });
  } catch (erreur) {
    if (erreur instanceof AuthError) return { erreur: "Compte créé ! Connecte-toi manuellement." };
    throw erreur;
  }
  return null;
}

// ── Réinitialisation du mot de passe ──────────────────────────
// Lot 82 — L'ancienne action « motDePasseOublieAction » a été SUPPRIMÉE :
// elle renvoyait le lien de réinitialisation directement dans la réponse,
// sans condition de production — n'importe qui pouvait l'appeler avec
// l'e-mail de n'importe quel compte (admin compris) et récupérer un lien
// valable 1 heure → prise de contrôle du compte. La page
// /mot-de-passe-oublie utilise déjà la route sécurisée
// /api/mot-de-passe-oublie (lien envoyé UNIQUEMENT par e-mail, jamais
// affiché en production) : rien d'autre à changer côté interface.
export async function reinitialisationAction(_prec: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const token = String(formData.get("token") ?? "");
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (motDePasse.length < 8) return { erreur: "Le mot de passe doit contenir au moins 8 caractères." };
  if (motDePasse !== confirmation) return { erreur: "Les deux mots de passe ne correspondent pas." };

  const enregistrement = await prisma.verificationToken.findFirst({ where: { token } });
  if (!enregistrement) return { erreur: "Lien invalide ou déjà utilisé." };
  if (enregistrement.expires < new Date()) return { erreur: "Lien expiré — demande un nouveau lien." };

  await prisma.user.update({
    where: { email: enregistrement.identifier },
    data: { motDePasse: await bcrypt.hash(motDePasse, 10) },
  });
  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: enregistrement.identifier, token: enregistrement.token } },
  });

  redirect("/connexion?reinitialise=1");
}