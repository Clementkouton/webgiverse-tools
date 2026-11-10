// app/actions/collaborations.ts
// ─────────────────────────────────────────────────────────────────
// Lot 57 — Niveau 3 Entreprise : idées 19 et 22.
//  - Idée 19 : listes d'équipe (collaborateurs LECTEUR / EDITEUR) ;
//  - Idée 22 : modèles de listes (publier / retirer / cloner).
// Mêmes règles que le lot 54 (sièges) :
//  - "use server" : chaque export DOIT être une fonction async ;
//  - aucun redirect() DANS un try (il lèverait une exception
//    interceptée par le catch) → on note un verdict, on redirige
//    après le try/catch ;
//  - défensif : si les tables du lot 57 n'existent pas encore
//    (migration Neon pas passée) → verdict "base", jamais de crash.
// ─────────────────────────────────────────────────────────────────
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";
import { envoyerEmail } from "@/lib/email";
import { entrepriseActif } from "@/lib/premium";

/** Nombre maximum de collaborateurs sur une même liste. */
const MAX_COLLABORATEURS_PAR_LISTE = 10;

async function userIdConnecte() {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** La liste appartient bien à l'utilisateur connecté ? */
async function listeAppartientA(
  listId: string,
  userId: string
): Promise<{ id: string; nom: string } | null> {
  try {
    return await prisma.list.findFirst({
      where: { id: listId, userId },
      select: { id: true, nom: true },
    });
  } catch {
    return null;
  }
}

/** E-mail de prévenance pour une invitation de collaboration. */
function emailInvitationCollaborateur(
  nomListe: string,
  nomTitulaire: string | null,
  role: string
) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const qui = nomTitulaire ? `<strong>${nomTitulaire}</strong>` : "Un abonné";
  const quelRole =
    role === "EDITEUR"
      ? "Tu pourras <strong>ajouter et retirer des outils</strong> de cette liste."
      : "Tu pourras <strong>consulter</strong> cette liste depuis ton tableau de bord.";
  return `
    <h2 style="margin:0 0 16px; font-size:18px; color:#111827;">
      On partage une liste Webgiverse avec toi
    </h2>
    <p style="margin:0 0 16px;">Bonjour,</p>
    <p style="margin:0 0 16px;">
      ${qui} vient de t'inviter sur sa liste
      <strong>« ${nomListe} »</strong> (plan Entreprise).
    </p>
    <p style="margin:0 0 16px;">${quelRole}</p>
    <p style="margin:0 0 24px; text-align:center;">
      <a href="${base}/dashboard/listes-partagees"
        style="display:inline-block; background-color:#7c3aed; color:#ffffff;
        text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:bold;">
        Voir les listes partagées
      </a>
    </p>
    <p style="margin:0; color:#6b7280; font-size:13px;">
      Tu peux quitter cette liste à tout moment depuis
      « Listes partagées avec moi » dans ton tableau de bord.
    </p>
  `;
}

/* ────────────────────────────────────────────────────────────────
   IDÉE 19 — INVITER UN COLLABORATEUR SUR UNE LISTE
   ──────────────────────────────────────────────────────────────── */
export async function inviterCollaborateurFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/entreprise");

  const listId = z.string().min(1).safeParse(donnees.get("listId"));
  const emailBrut = z.string().trim().email().max(160).safeParse(donnees.get("email"));
  const roleBrut = z
    .enum(["LECTEUR", "EDITEUR"])
    .safeParse(donnees.get("role") ?? "LECTEUR");
  if (!listId.success) redirect("/dashboard/entreprise?message=introuvable");
  if (!emailBrut.success) redirect("/dashboard/entreprise?message=email-invalide");
  if (!roleBrut.success) redirect("/dashboard/entreprise?message=email-invalide");

  // Réservé au titulaire d'un abonnement Entreprise actif (comme
  // les sièges du lot 54 : un siège reçu ne suffit pas).
  if (!(await entrepriseActif(userId))) {
    redirect("/dashboard/entreprise?message=non-autorise");
  }

  const liste = await listeAppartientA(listId.data, userId);
  if (!liste) redirect("/dashboard/entreprise?message=introuvable");

  // Le compte invité doit exister (par e-mail, comme les sièges).
  let invite: { id: string; email: string; name: string | null } | null = null;
  try {
    invite = await prisma.user.findUnique({
      where: { email: emailBrut.data.toLowerCase() },
      select: { id: true, email: true, name: true },
    });
  } catch (erreur) {
    console.error("Collaborations (recherche du compte) :", erreur);
    redirect("/dashboard/entreprise?message=base");
  }
  if (!invite) redirect("/dashboard/entreprise?message=compte-introuvable");
  if (invite.id === userId) redirect("/dashboard/entreprise?message=soi-meme");

  let verdict: "invite" | "role-maj" | "limite" | "base" = "invite";
  try {
    const existant = await prisma.membreListe.findUnique({
      where: { listId_userId: { listId: listId.data, userId: invite.id } },
      select: { id: true, role: true },
    });
    if (existant) {
      if (existant.role !== roleBrut.data) {
        await prisma.membreListe.update({
          where: { id: existant.id },
          data: { role: roleBrut.data },
        });
        verdict = "role-maj";
      } else {
        verdict = "role-maj"; // déjà invité avec ce rôle : rien à faire
      }
    } else {
      const nbCollaborateurs = await prisma.membreListe.count({
        where: { listId: listId.data },
      });
      if (nbCollaborateurs >= MAX_COLLABORATEURS_PAR_LISTE) {
        verdict = "limite";
      } else {
        await prisma.membreListe.create({
          data: {
            listId: listId.data,
            userId: invite.id,
            role: roleBrut.data,
          },
        });
      }
    }
  } catch (erreur) {
    console.error("Collaborations (invitation) :", erreur);
    verdict = "base";
  }

  if (verdict === "invite") {
    await journaliser(
      userId,
      "collaboration_invitation",
      JSON.stringify({ listId: listId.data, inviteId: invite.id, role: roleBrut.data })
    );
    try {
      const moi = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      await envoyerEmail({
        a: invite.email,
        sujet: `${moi?.name ?? "Un abonné"} partage sa liste « ${liste.nom} » avec toi`,
        html: emailInvitationCollaborateur(liste.nom, moi?.name ?? null, roleBrut.data),
      });
    } catch {
      // l'e-mail ne doit jamais bloquer l'invitation
    }
  }

  revalidatePath("/dashboard/entreprise");
  redirect(`/dashboard/entreprise?message=${verdict}`);
}

/* ────────────────────────────────────────────────────────────────
   IDÉE 19 — RETIRER UN COLLABORATEUR
   ──────────────────────────────────────────────────────────────── */
export async function retirerCollaborateurFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/entreprise");

  const listId = z.string().min(1).safeParse(donnees.get("listId"));
  const collaborateurId = z
    .string()
    .min(1)
    .safeParse(donnees.get("collaborateurId"));
  if (!listId.success || !collaborateurId.success) {
    redirect("/dashboard/entreprise?message=introuvable");
  }

  if (!(await entrepriseActif(userId))) {
    redirect("/dashboard/entreprise?message=non-autorise");
  }

  let verdict: "retire" | "introuvable" | "base" = "retire";
  try {
    const resultat = await prisma.membreListe.deleteMany({
      where: { listId: listId.data, userId: collaborateurId.data },
    });
    if (resultat.count === 0) verdict = "introuvable";
  } catch (erreur) {
    console.error("Collaborations (retrait) :", erreur);
    verdict = "base";
  }

  if (verdict === "retire") {
    await journaliser(
      userId,
      "collaboration_retrait",
      JSON.stringify({ listId: listId.data, collaborateurId: collaborateurId.data })
    );
  }

  revalidatePath("/dashboard/entreprise");
  redirect(`/dashboard/entreprise?message=${verdict}`);
}

/* ────────────────────────────────────────────────────────────────
   IDÉE 19 — AJOUTER UN OUTIL DANS UNE LISTE PARTAGÉE (éditeur)
   Saisie par le slug de l'outil (celui de son URL publique,
   ex. /outil/chatgpt → chatgpt).
   ──────────────────────────────────────────────────────────────── */
export async function ajouterOutilPartageFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/listes-partagees");

  const listId = z.string().min(1).safeParse(donnees.get("listId"));
  const slugBrut = z
    .string()
    .trim()
    .min(1)
    .max(120)
    .transform((valeur) => valeur.toLowerCase())
    .safeParse(donnees.get("slug"));
  if (!listId.success || !slugBrut.success) {
    redirect("/dashboard/listes-partagees?message=introuvable");
  }

  let autorise = false;
  try {
    const lien = await prisma.membreListe.findUnique({
      where: { listId_userId: { listId: listId.data, userId } },
      select: { role: true },
    });
    if (lien?.role === "EDITEUR") {
      autorise = true;
    } else {
      // le propriétaire passe aussi par cette page
      autorise = Boolean(await listeAppartientA(listId.data, userId));
    }
  } catch (erreur) {
    console.error("Collaborations (autorisation d'édition) :", erreur);
    redirect("/dashboard/listes-partagees?message=base");
  }
  if (!autorise) redirect("/dashboard/listes-partagees?message=non-autorise");

  let outil: { id: string } | null = null;
  try {
    outil = await prisma.tool.findFirst({
      where: { slug: slugBrut.data, statut: "PUBLIE" },
      select: { id: true },
    });
  } catch (erreur) {
    console.error("Collaborations (recherche de l'outil) :", erreur);
    redirect("/dashboard/listes-partagees?message=base");
  }
  if (!outil) redirect("/dashboard/listes-partagees?message=outil-introuvable");

  let verdict: "ajoute" | "deja-present" | "base" = "ajoute";
  try {
    await prisma.listItem.create({
      data: { listId: listId.data, toolId: outil.id },
    });
  } catch (erreur) {
    if (
      typeof erreur === "object" &&
      erreur !== null &&
      "code" in erreur &&
      (erreur as { code?: string }).code === "P2002"
    ) {
      verdict = "deja-present";
    } else {
      console.error("Collaborations (ajout d'outil) :", erreur);
      verdict = "base";
    }
  }

  revalidatePath("/dashboard/listes-partagees");
  redirect(`/dashboard/listes-partagees?message=${verdict}`);
}

/* ────────────────────────────────────────────────────────────────
   IDÉE 19 — RETIRER UN OUTIL D'UNE LISTE PARTAGÉE (éditeur)
   ──────────────────────────────────────────────────────────────── */
export async function retirerOutilPartageFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/listes-partagees");

  const itemId = z.string().min(1).safeParse(donnees.get("itemId"));
  if (!itemId.success) {
    redirect("/dashboard/listes-partagees?message=introuvable");
  }

  let listId: string | null = null;
  try {
    const item = await prisma.listItem.findFirst({
      where: { id: itemId.data },
      select: { listId: true },
    });
    if (!item) redirect("/dashboard/listes-partagees?message=introuvable");
    listId = item.listId;
  } catch (erreur) {
    console.error("Collaborations (lecture de l'outil) :", erreur);
    redirect("/dashboard/listes-partagees?message=base");
  }

  let autorise = false;
  try {
    const lien = await prisma.membreListe.findUnique({
      where: { listId_userId: { listId, userId } },
      select: { role: true },
    });
    if (lien?.role === "EDITEUR") {
      autorise = true;
    } else {
      autorise = Boolean(await listeAppartientA(listId, userId));
    }
  } catch (erreur) {
    console.error("Collaborations (autorisation d'édition) :", erreur);
    redirect("/dashboard/listes-partagees?message=base");
  }
  if (!autorise) redirect("/dashboard/listes-partagees?message=non-autorise");

  let verdict: "retire" | "introuvable" | "base" = "retire";
  try {
    const resultat = await prisma.listItem.deleteMany({
      where: { id: itemId.data, listId },
    });
    if (resultat.count === 0) verdict = "introuvable";
  } catch (erreur) {
    console.error("Collaborations (retrait d'outil) :", erreur);
    verdict = "base";
  }

  revalidatePath("/dashboard/listes-partagees");
  redirect(`/dashboard/listes-partagees?message=${verdict}`);
}

/* ────────────────────────────────────────────────────────────────
   IDÉE 19 — QUITTER UNE LISTE PARTAGÉE (collaborateur)
   ──────────────────────────────────────────────────────────────── */
export async function quitterCollaborationFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/listes-partagees");

  const listId = z.string().min(1).safeParse(donnees.get("listId"));
  if (!listId.success) {
    redirect("/dashboard/listes-partagees?message=introuvable");
  }

  let verdict: "parti" | "introuvable" | "base" = "parti";
  try {
    const resultat = await prisma.membreListe.deleteMany({
      where: { listId: listId.data, userId },
    });
    if (resultat.count === 0) verdict = "introuvable";
  } catch (erreur) {
    console.error("Collaborations (départ) :", erreur);
    verdict = "base";
  }

  if (verdict === "parti") {
    await journaliser(
      userId,
      "collaboration_depart",
      JSON.stringify({ listId: listId.data })
    );
  }

  revalidatePath("/dashboard/listes-partagees");
  redirect(`/dashboard/listes-partagees?message=${verdict}`);
}

/* ────────────────────────────────────────────────────────────────
   IDÉE 22 — PROPOSER SA LISTE PUBLIQUE COMME MODÈLE
   ──────────────────────────────────────────────────────────────── */
export async function publierCommeModeleFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/entreprise");

  const listId = z.string().min(1).safeParse(donnees.get("listId"));
  if (!listId.success) redirect("/dashboard/entreprise?message=introuvable");

  if (!(await entrepriseActif(userId))) {
    redirect("/dashboard/entreprise?message=non-autorise");
  }

  const liste = await listeAppartientA(listId.data, userId);
  if (!liste) redirect("/dashboard/entreprise?message=introuvable");

  // Un modèle doit être consultable : la liste doit être partagée
  // publiquement d'abord (bloc partage du dashboard).
  let publique = false;
  try {
    const verif = await prisma.list.findFirst({
      where: { id: listId.data, userId, estPublique: true },
      select: { id: true },
    });
    publique = Boolean(verif);
  } catch (erreur) {
    console.error("Collaborations (vérification du partage) :", erreur);
    redirect("/dashboard/entreprise?message=base");
  }
  if (!publique) redirect("/dashboard/entreprise?message=non-publique");

  let verdict: "modele-publie" | "base" = "modele-publie";
  try {
    await prisma.modeleListe.upsert({
      where: { listId: listId.data },
      update: {},
      create: { listId: listId.data },
    });
  } catch (erreur) {
    console.error("Collaborations (modèle) :", erreur);
    verdict = "base";
  }

  if (verdict === "modele-publie") {
    await journaliser(
      userId,
      "modele_publie",
      JSON.stringify({ listId: listId.data })
    );
  }

  revalidatePath("/dashboard/entreprise");
  revalidatePath("/modeles");
  redirect(`/dashboard/entreprise?message=${verdict}`);
}

/* ────────────────────────────────────────────────────────────────
   IDÉE 22 — RETIRER UNE LISTE DES MODÈLES
   ──────────────────────────────────────────────────────────────── */
export async function retirerModeleFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/entreprise");

  const listId = z.string().min(1).safeParse(donnees.get("listId"));
  if (!listId.success) redirect("/dashboard/entreprise?message=introuvable");

  if (!(await entrepriseActif(userId))) {
    redirect("/dashboard/entreprise?message=non-autorise");
  }

  const liste = await listeAppartientA(listId.data, userId);
  if (!liste) redirect("/dashboard/entreprise?message=introuvable");

  let verdict: "modele-retire" | "base" = "modele-retire";
  try {
    await prisma.modeleListe.deleteMany({ where: { listId: listId.data } });
  } catch (erreur) {
    console.error("Collaborations (retrait du modèle) :", erreur);
    verdict = "base";
  }

  if (verdict === "modele-retire") {
    await journaliser(
      userId,
      "modele_retire",
      JSON.stringify({ listId: listId.data })
    );
  }

  revalidatePath("/dashboard/entreprise");
  revalidatePath("/modeles");
  redirect(`/dashboard/entreprise?message=${verdict}`);
}

/* ────────────────────────────────────────────────────────────────
   IDÉE 22 — CLONER UN MODÈLE DANS SON PROPRE DASHBOARD
   (réservé au plan Entreprise, comme tout le Niveau 3)
   ──────────────────────────────────────────────────────────────── */
export async function dupliquerModeleFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/modeles");

  const listId = z.string().min(1).safeParse(donnees.get("listId"));
  if (!listId.success) redirect("/modeles?message=introuvable");

  if (!(await entrepriseActif(userId))) {
    redirect("/modeles?message=non-autorise");
  }

  // Le modèle doit exister ET rester public.
  let nomSource: string | null = null;
  let toolIds: string[] = [];
  try {
    const modele = await prisma.modeleListe.findUnique({
      where: { listId: listId.data },
      select: { listId: true },
    });
    if (!modele) redirect("/modeles?message=introuvable");

    const liste = await prisma.list.findFirst({
      where: { id: listId.data, estPublique: true },
      select: {
        nom: true,
        items: { select: { toolId: true }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!liste) redirect("/modeles?message=introuvable");
    nomSource = liste.nom;
    toolIds = liste.items.map((item) => item.toolId);
  } catch (erreur) {
    console.error("Collaborations (lecture du modèle) :", erreur);
    redirect("/modeles?message=base");
  }

  let verdict: "duplique" | "base" = "duplique";
  try {
    // Transaction interactive : liste + outils créés ensemble,
    // ou rien du tout (pas de copie à moitié vide).
    const copieId = await prisma.$transaction(async (tx) => {
      const copie = await tx.list.create({
        data: { userId, nom: `${nomSource ?? "Modèle"} (copie)` },
        select: { id: true },
      });
      if (toolIds.length > 0) {
        await tx.listItem.createMany({
          data: toolIds.map((toolId) => ({ listId: copie.id, toolId })),
        });
      }
      return copie.id;
    });
    await journaliser(
      userId,
      "modele_duplique",
      JSON.stringify({ listId: listId.data, copieId, outils: toolIds.length })
    );
  } catch (erreur) {
    console.error("Collaborations (duplication) :", erreur);
    verdict = "base";
  }

  revalidatePath("/dashboard/entreprise");
  redirect(`/dashboard/entreprise?message=${verdict}`);
}
