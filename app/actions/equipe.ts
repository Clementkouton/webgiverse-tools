// app/actions/equipe.ts
// ─────────────────────────────────────────────────────────────────
// Lot 54 — gestion des sièges d'équipe du plan Entreprise.
// Un abonné Entreprise actif (le « titulaire ») attribue jusqu'à
// MAX_MEMBRES_EQUIPE sièges à des comptes Webgiverse existants ;
// chaque membre bénéficie automatiquement des avantages Entreprise
// via lib/premium.ts (planActif / premiumActif).
// Défensif : si la table MembreEntreprise n'existe pas encore
// (migration SQL lot 54 pas passée), on renvoie vers la page avec
// ?message=base au lieu de faire planter.
// ⚠️ Fichier "use server" : chaque export DOIT être une fonction async.
//
// Lot 58 — CORRECTIF COMPLET (3 changements, rien d'autre) :
//   ① quitterEquipeFormulaire : le point manquant est rétabli
//     (prisma.membreEntreprisedeleteMany → prisma.membreEntreprise
//     .deleteMany) — l'appel plantait avant d'atteindre la base et
//     faisait échouer la vérification des types du build.
//   ② L'alias local « membreEntreprise » (cast mort depuis que les
//     actions appellent prisma.membreEntreprise directement) est
//     supprimé : c'était lui qui valait undefined tant que le client
//     Prisma n'était pas régénéré — cause du TypeError d'origine
//     (« Cannot read properties of undefined (reading 'findUnique') »).
//   ③ Le succès de l'ajout redirige vers ?message=ajoute : la page
//     /dashboard/equipe affiche son message vert sous la clé
//     « ajoute », pas sous « ok » (le succès était donc invisible).
// Le modèle MembreEntreprise est déclaré dans prisma/schema.prisma :
// après « npx prisma generate », prisma.membreEntreprise est typé
// nativement — plus aucun cast nécessaire ici.
// ─────────────────────────────────────────────────────────────────
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";
import { envoyerEmail } from "@/lib/email";
import { MAX_MEMBRES_EQUIPE } from "@/lib/premium";

// Le modèle existe dans le schéma ; cette déclaration locale permet au
// fichier de compiler si les types du client Prisma n'ont pas été régénérés.
const membreEntreprise = (
  prisma as unknown as {
    membreEntreprise: {
      findUnique(args: {
        where: { membreId: string };
        select: { id: true };
      }): Promise<{ id: string } | null>;
      count(args: { where: { titulaireId: string } }): Promise<number>;
      create(args: {
        data: { titulaireId: string; membreId: string };
      }): Promise<unknown>;
      deleteMany(args: {
        where: { membreId: string; titulaireId?: string };
      }): Promise<{ count: number }>;
    };
  }
).membreEntreprise;

async function userIdConnecte() {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Titulaire valide = abonnement ENTREPRISE personnel actif
 *  (occuper un siège ne donne PAS le droit de créer une équipe). */
async function titulaireValide(userId: string): Promise<boolean> {
  try {
    const abonnement = await prisma.abonnement.findUnique({
      where: { utilisateurId: userId },
      select: { plan: true, statut: true, expireLe: true },
    });
    return Boolean(
      abonnement &&
        abonnement.plan === "ENTREPRISE" &&
        abonnement.statut === "ACTIF" &&
        abonnement.expireLe > new Date()
    );
  } catch {
    // table Abonnement absente → pas titulaire
    return false;
  }
}

/** Nom du titulaire pour l'e-mail de prévenance (jamais bloquant). */
async function nomTitulaire(userId: string): Promise<string | null> {
  try {
    const moi = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    return moi?.name ?? null;
  } catch {
    return null;
  }
}

/** E-mail de prévenance envoyé au membre invité (style des e-mails Webgiverse). */
function emailSiegeActif(nomTitulaire: string | null) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const qui = nomTitulaire
    ? `<strong>${nomTitulaire}</strong>`
    : "Le titulaire d'un abonnement";
  return `
    <h2 style="margin:0 0 16px; font-size:18px; color:#111827;">
      Ton siège Webgiverse Entreprise est actif
    </h2>
    <p style="margin:0 0 16px;">Bonjour,</p>
    <p style="margin:0 0 16px;">
      ${qui} vient de t'attribuer un siège au sein de son équipe
      <strong>Entreprise</strong> sur Webgiverse.
    </p>
    <p style="margin:0 0 8px;">Tu bénéficies désormais automatiquement :</p>
    <ul style="margin:0 0 16px; padding-left:20px;">
      <li>Favoris, listes et prompts sauvegardés illimités</li>
      <li>Assistant IA illimité</li>
      <li>Tutoriels vidéo et prompts complets débloqués</li>
      <li>Export PDF / CSV de tes favoris et de tes listes</li>
    </ul>
    <p style="margin:0 0 24px; text-align:center;">
      <a href="${base}/dashboard"
        style="display:inline-block; background-color:#7c3aed; color:#ffffff;
        text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:bold;">
        Ouvrir mon espace
      </a>
    </p>
    <p style="margin:0; color:#6b7280; font-size:13px;">
      Les avantages sont actifs dès ta prochaine visite avec ton compte habituel.
      Tu peux quitter l'équipe à tout moment depuis « Mon équipe » dans ton
      tableau de bord.
    </p>
  `;
}

/** Attribue un siège à un compte Webgiverse existant (par e-mail). */
export async function ajouterMembreFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/equipe");

  const analyse = z
    .string()
    .trim()
    .email()
    .max(160)
    .safeParse(donnees.get("email"));
  if (!analyse.success) redirect("/dashboard/equipe?message=email-invalide");
  const email = analyse.data.toLowerCase();

  if (!(await titulaireValide(userId))) {
    redirect("/dashboard/equipe?message=non-autorise");
  }

  let membre: { id: string; email: string; name: string | null } | null = null;
  try {
    membre = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });
  } catch (erreur) {
    console.error("Équipe (ajout — recherche du compte) :", erreur);
    redirect("/dashboard/equipe?message=base");
  }
  if (!membre) redirect("/dashboard/equipe?message=compte-introuvable");
  if (membre.id === userId) redirect("/dashboard/equipe?message=soi-meme");

  // Ajout du siège — aucun redirect() DANS le try (il lèverait une
  // exception interceptée par le catch).
  let verdict: "ok" | "deja-siege" | "limite" | "base" = "ok";
  try {
    const dejaSiege = await membreEntreprise.findUnique({
      where: { membreId: membre.id },
      select: { id: true },
    });
    if (dejaSiege) {
      verdict = "deja-siege";
    } else {
      const nbMembres = await membreEntreprise.count({
        where: { titulaireId: userId },
      });
      if (nbMembres >= MAX_MEMBRES_EQUIPE) {
        verdict = "limite";
      } else {
        await membreEntreprise.create({
          data: { titulaireId: userId, membreId: membre.id },
        });
      }
    }
  } catch (erreur) {
    console.error("Équipe (ajout) :", erreur);
    verdict = "base";
  }

  if (verdict === "ok") {
    await journaliser(
      userId,
      "equipe_ajout_membre",
      JSON.stringify({ membreId: membre.id })
    );
    try {
      await envoyerEmail({
        a: membre.email,
        sujet: "Ton siège Webgiverse Entreprise est actif",
        html: emailSiegeActif(await nomTitulaire(userId)),
      });
    } catch {
      // l'e-mail ne doit jamais bloquer l'ajout du siège
    }
  }

  revalidatePath("/dashboard/equipe");
  // Lot 58 ③ — la page affiche le succès sous la clé « ajoute » :
  // l'ancien ?message=ok ne correspondait à aucune carte de la page.
  redirect(`/dashboard/equipe?message=${verdict === "ok" ? "ajoute" : verdict}`);
}

/** Libère un siège de son équipe (titulaire uniquement). */
export async function retirerMembreFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/equipe");

  const membreId = z.string().min(1).safeParse(donnees.get("membreId"));
  if (!membreId.success) redirect("/dashboard/equipe?message=introuvable");

  if (!(await titulaireValide(userId))) {
    redirect("/dashboard/equipe?message=non-autorise");
  }

  let verdict: "retire" | "introuvable" | "base" = "retire";
  try {
    const resultat = await membreEntreprise.deleteMany({
      where: { membreId: membreId.data, titulaireId: userId },
    });
    if (resultat.count === 0) verdict = "introuvable";
  } catch (erreur) {
    console.error("Équipe (retrait) :", erreur);
    verdict = "base";
  }

  if (verdict === "retire") {
    await journaliser(
      userId,
      "equipe_retrait_membre",
      JSON.stringify({ membreId: membreId.data })
    );
  }

  revalidatePath("/dashboard/equipe");
  redirect(`/dashboard/equipe?message=${verdict}`);
}

/** Un membre quitte l'équipe de son plein gré. */
export async function quitterEquipeFormulaire() {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/equipe");

  let verdict: "parti" | "introuvable" | "base" = "parti";
  try {
    // Lot 58 ① — le point manquant entre membreEntreprise et
    // deleteMany est rétabli : l'appel plantait avant d'atteindre la base.
    const resultat = await membreEntreprise.deleteMany({
      where: { membreId: userId },
    });
    if (resultat.count === 0) verdict = "introuvable";
  } catch (erreur) {
    console.error("Équipe (départ) :", erreur);
    verdict = "base";
  }

  if (verdict === "parti") {
    await journaliser(userId, "equipe_depart");
  }

  revalidatePath("/dashboard/equipe");
  redirect(`/dashboard/equipe?message=${verdict}`);
}