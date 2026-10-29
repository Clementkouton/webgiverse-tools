"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { envoyerEmail, emailBienvenue } from "@/lib/email";

export type EtatFormulaire = { erreur?: string; succes?: string; lien?: string } | null;

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Connexion (e-mail + mot de passe) ──────────────────────────
export async function connexionAction(_prec: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const motDePasse = String(formData.get("password") ?? "");
  const suite = String(formData.get("suite") ?? "/dashboard") || "/dashboard";

  if (!email || !motDePasse) return { erreur: "Renseigne ton e-mail et ton mot de passe." };

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
export async function connexionGoogleAction(formData: FormData) {
  const suite = String(formData.get("suite") ?? "/dashboard") || "/dashboard";
  await signIn("google", { redirectTo: suite });
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

  const existant = await prisma.user.findUnique({ where: { email } });
  if (existant) {
    return {
      erreur: existant.motDePasse
        ? "Un compte existe déjà avec cet e-mail — connecte-toi."
        : "Un compte Google existe déjà avec cet e-mail — connecte-toi avec Google.",
    };
  }

  const hash = await bcrypt.hash(motDePasse, 10);
  await prisma.user.create({ data: { name: nom, email, motDePasse: hash } });

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

// ── Mot de passe oublié ───────────────────────────────────────
export async function motDePasseOublieAction(_prec: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  if (!EMAIL_VALIDE.test(email)) return { erreur: "Adresse e-mail invalide." };

  const utilisateur = await prisma.user.findUnique({ where: { email } });
  if (utilisateur) {
    const token = randomBytes(32).toString("hex");
    await prisma.verificationToken.create({
      data: { identifier: email, token, expires: new Date(Date.now() + 60 * 60 * 1000) },
    });
    // ⚠️ MODE DÉVELOPPEMENT : le lien s'affiche à l'écran (pas d'e-mail envoyé).
    // La version production est la route API /api/mot-de-passe-oublie (Nodemailer).
    return {
      succes: "Lien de réinitialisation généré (valable 1 heure) :",
      lien: `/reinitialiser?token=${token}`,
    };
  }
  // Réponse volontairement générique
  return { succes: "Si un compte existe avec cet e-mail, un lien de réinitialisation vient d'être généré." };
}

// ── Réinitialisation du mot de passe ──────────────────────────
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