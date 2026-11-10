// app/actions/partage-listes.ts
// ─────────────────────────────────────────────────────────────────
// Lot 57 — Privilèges Entreprise Niveau 3.
// Idée 19 : le titulaire Entreprise partage une de SES listes avec
//   un membre de SON équipe (rôle « LECTEUR » : consultation depuis
//   « Listes partagées avec moi » /dashboard/listes-partagees).
// Idée 20 : le rôle « EDITEUR » permet en plus d'ajouter / retirer
//   des outils dans la liste partagée.
// Les invitations et les droits vivent dans la table MembreListe
// (créée par la migration du lot 58 — aucune nouvelle migration ici).
// Défensif : si la table n'existe pas encore (migration pas passée),
// on renvoie vers la page avec ?message=base au lieu de faire planter.
// ⚠️ Fichier "use server" : chaque export DOIT être une fonction async.
// ─────────────────────────────────────────────────────────────────
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";
import { envoyerEmail } from "@/lib/email";

const ROLE_VALIDE = z.enum(["LECTEUR", "EDITEUR"]);

function membreListeModel() {
  const model = (prisma as any).membreListe;
  if (!model) {
    throw new Error("Le modèle Prisma 'membreListe' n'existe pas dans ce schéma");
  }
  return model;
}

function membreEntrepriseModel() {
  const model = (prisma as any).membreEntreprise;
  if (!model) {
    throw new Error("Le modèle Prisma 'membreEntreprise' n'existe pas dans ce schéma");
  }
  return model;
}

async function userIdConnecte() {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Titulaire valide = abonnement ENTREPRISE personnel actif
 *  (occuper un siège ne donne PAS le droit de partager ses listes). */
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

/** E-mail de prévenance envoyé au collaborateur (style des e-mails Webgiverse). */
function emailPartageListe(nomTitulaire: string | null, nomListe: string, role: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const qui = nomTitulaire ? `<strong>${nomTitulaire}</strong>` : "Le titulaire de ton équipe";
  const droits =
    role === "EDITEUR"
      ? "<strong>la consulter</strong> et <strong>y ajouter / retirer des outils</strong>"
      : "la <strong>consulter</strong>";
  return `
    <h2 style="margin:0 0 16px; font-size:18px; color:#111827;">
      Une liste Webgiverse est partagée avec toi
    </h2>
    <p style="margin:0 0 16px;">Bonjour,</p>
    <p style="margin:0 0 16px;">
      ${qui} vient de partager la liste
      <strong>« ${nomListe} »</strong> avec toi (droit
      ${role === "EDITEUR" ? "EDITEUR" : "LECTEUR"}).
    </p>
    <p style="margin:0 0 8px;">Tu peux désormais :</p>
    <ul style="margin:0 0 16px; padding-left:20px;">
      <li>Retrouver la liste dans « Listes partagées avec moi » de ton tableau de bord</li>
      <li>${droits.charAt(0).toUpperCase() + droits.slice(1)}</li>
    </ul>
    <p style="margin:0 0 24px; text-align:center;">
      <a href="${base}/dashboard/listes-partagees"
        style="display:inline-block; background-color:#0ea5e9; color:#ffffff;
        text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:bold;">
        Ouvrir mes listes partagées
      </a>
    </p>
    <p style="margin:0; color:#6b7280; font-size:13px;">
      Ce partage peut être retiré à tout moment par le titulaire.
    </p>
  `;
}

/** Le partage demandé appartient-il à l'utilisateur connecté ?
 *  Le partageId arrive du navigateur : on ne lui fait JAMAIS
 *  confiance — on revérifie que la liste partagée appartient bien
 *  à l'utilisateur connecté (tables liées en SQL pur, sans relation
 *  Prisma : deux requêtes successives, comme prévu par le modèle). */
async function partageDuTitulaire(partageId: string, userId: string) {
  const membreListe = membreListeModel();
  const partage = await membreListe.findUnique({
    where: { id: partageId },
    select: { id: true, role: true, listId: true },
  });
  if (!partage) return null;
  const liste = await prisma.list.findUnique({
    where: { id: partage.listId },
    select: { id: true, userId: true, nom: true },
  });
  if (!liste || liste.userId !== userId) return null;
  return partage;
}

/** Peut modifier le contenu de la liste : le propriétaire OU un
 *  collaborateur avec le rôle EDITEUR (idée 20). */
async function peutModifierListe(listId: string, userId: string): Promise<boolean> {
  const liste = await prisma.list.findUnique({
    where: { id: listId },
    select: { userId: true },
  });
  if (!liste) return false;
  if (liste.userId === userId) return true;
  const membreListe = membreListeModel();
  const partage = await membreListe.findUnique({
    where: { listId_userId: { listId, userId } },
    select: { role: true },
  });
  return partage?.role === "EDITEUR";
}

/** Idée 19 — Partage une de ses listes avec un membre de son équipe
 *  (champs du formulaire de /dashboard/partages : listeId, email,
 *  role). */
export async function partagerListeFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/partages");

  const email = z.string().trim().email().max(160).safeParse(donnees.get("email"));
  if (!email.success) redirect("/dashboard/partages?message=email-invalide");
  const emailMembre = email.data.toLowerCase();

  const listeId = z.string().min(1).safeParse(donnees.get("listeId"));
  if (!listeId.success) redirect("/dashboard/partages?message=liste-introuvable");

  const role = ROLE_VALIDE.safeParse(donnees.get("role"));
  const roleFinal = role.success ? role.data : "LECTEUR";

  if (!(await titulaireValide(userId))) {
    redirect("/dashboard/partages?message=non-autorise");
  }

  // La liste à partager doit appartenir au titulaire.
  let liste: { id: string; nom: string } | null = null;
  try {
    const trouvee = await prisma.list.findUnique({
      where: { id: listeId.data },
      select: { id: true, nom: true, userId: true },
    });
    liste = trouvee && trouvee.userId === userId ? { id: trouvee.id, nom: trouvee.nom } : null;
  } catch (erreur) {
    console.error("Partage (lecture de la liste) :", erreur);
    redirect("/dashboard/partages?message=base");
  }
  if (!liste) redirect("/dashboard/partages?message=liste-introuvable");

  // Le destinataire doit être un compte Webgiverse existant.
  let membre: { id: string; email: string; name: string | null } | null = null;
  try {
    membre = await prisma.user.findUnique({
      where: { email: emailMembre },
      select: { id: true, email: true, name: true },
    });
  } catch (erreur) {
    console.error("Partage (recherche du compte) :", erreur);
    redirect("/dashboard/partages?message=base");
  }
  if (!membre) redirect("/dashboard/partages?message=compte-introuvable");
  if (membre.id === userId) redirect("/dashboard/partages?message=soi-meme");

  // Ajout du partage — aucun redirect() DANS le try (il lèverait une
  // exception interceptée par le catch).
  let verdict: "partage" | "pas-membre" | "deja-partage" | "base" = "partage";
  const membreListe = membreListeModel();
  try {
    const sieges = await membreEntrepriseModel().findFirst({
      where: { titulaireId: userId, membreId: membre.id },
      select: { id: true },
    });
    if (!sieges) {
      verdict = "pas-membre";
    } else {
      const dejaPartage = await membreListe.findUnique({
        where: { listId_userId: { listId: liste.id, userId: membre.id } },
        select: { id: true },
      });
      if (dejaPartage) {
        verdict = "deja-partage";
      } else {
        await membreListe.create({
          data: { listId: liste.id, userId: membre.id, role: roleFinal },
        });
      }
    }
  } catch (erreur) {
    console.error("Partage (invitation) :", erreur);
    verdict = "base";
  }

  if (verdict === "partage") {
    await journaliser(
      userId,
      "equipe_partage_liste",
      JSON.stringify({ listId: liste.id, membreId: membre.id, role: roleFinal })
    );
    try {
      await envoyerEmail({
        a: membre.email,
        sujet: `Une liste Webgiverse est partagée avec toi : ${liste.nom}`,
        html: emailPartageListe(await nomTitulaire(userId), liste.nom, roleFinal),
      });
    } catch {
      // l'e-mail ne doit jamais bloquer le partage
    }
  }

  revalidatePath("/dashboard/partages");
  revalidatePath("/dashboard/listes-partagees");
  redirect(`/dashboard/partages?message=${verdict}`);
}

/** Idée 20 — Passe un partage de LECTEUR à EDITEUR (ou l'inverse). */
export async function changerRolePartageFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/partages");

  const partageId = z.string().min(1).safeParse(donnees.get("partageId"));
  if (!partageId.success) redirect("/dashboard/partages?message=introuvable");

  const role = ROLE_VALIDE.safeParse(donnees.get("role"));
  if (!role.success) redirect("/dashboard/partages?message=introuvable");

  if (!(await titulaireValide(userId))) {
    redirect("/dashboard/partages?message=non-autorise");
  }

  let verdict: "role" | "introuvable" | "base" = "role";
  const membreListe = membreListeModel();
  try {
    const partage = await partageDuTitulaire(partageId.data, userId);
    if (!partage) {
      verdict = "introuvable";
    } else {
      await membreListe.update({
        where: { id: partage.id },
        data: { role: role.data },
      });
    }
  } catch (erreur) {
    console.error("Partage (changement de rôle) :", erreur);
    verdict = "base";
  }

  if (verdict === "role") {
    await journaliser(
      userId,
      "equipe_partage_role",
      JSON.stringify({ partageId: partageId.data, role: role.data })
    );
  }

  revalidatePath("/dashboard/partages");
  revalidatePath("/dashboard/listes-partagees");
  redirect(`/dashboard/partages?message=${verdict}`);
}

/** Retire un partage : la liste disparaît du tableau du collaborateur. */
export async function retirerPartageFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/partages");

  const partageId = z.string().min(1).safeParse(donnees.get("partageId"));
  if (!partageId.success) redirect("/dashboard/partages?message=introuvable");

  if (!(await titulaireValide(userId))) {
    redirect("/dashboard/partages?message=non-autorise");
  }

  let verdict: "retire" | "introuvable" | "base" = "retire";
  const membreListe = membreListeModel();
  try {
    const partage = await partageDuTitulaire(partageId.data, userId);
    if (!partage) {
      verdict = "introuvable";
    } else {
      await membreListe.delete({ where: { id: partage.id } });
    }
  } catch (erreur) {
    console.error("Partage (retrait) :", erreur);
    verdict = "base";
  }

  if (verdict === "retire") {
    await journaliser(
      userId,
      "equipe_partage_retire",
      JSON.stringify({ partageId: partageId.data })
    );
  }

  revalidatePath("/dashboard/partages");
  revalidatePath("/dashboard/listes-partagees");
  redirect(`/dashboard/partages?message=${verdict}`);
}

/** Idée 20 — Ajoute un outil dans une liste partagée (propriétaire
 *  ou collaborateur EDITEUR). Action du côté membre : appelée depuis
 *  « Listes partagées avec moi ». */
export async function ajouterOutilListePartageeFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/listes-partagees");

  const listeId = z.string().min(1).safeParse(donnees.get("listeId"));
  if (!listeId.success) redirect("/dashboard/listes-partagees?message=introuvable");
  const toolId = z.string().min(1).safeParse(donnees.get("toolId"));
  if (!toolId.success) redirect("/dashboard/listes-partagees?message=introuvable");

  let autorise = false;
  let outilExiste = false;
  try {
    autorise = await peutModifierListe(listeId.data, userId);
    if (autorise) {
      const outil = await prisma.tool.findUnique({
        where: { id: toolId.data },
        select: { id: true, statut: true },
      });
      outilExiste = Boolean(outil && outil.statut === "PUBLIE");
    }
  } catch (erreur) {
    console.error("Partage (ajout d'outil) :", erreur);
    redirect("/dashboard/listes-partagees?message=base");
  }
  if (!autorise) redirect("/dashboard/listes-partagees?message=non-autorise");
  if (!outilExiste) redirect("/dashboard/listes-partagees?message=outil-introuvable");

  let verdict: "ajoute" | "deja-present" | "base" = "ajoute";
  try {
    await prisma.listItem.create({
      data: { listId: listeId.data, toolId: toolId.data },
    });
  } catch (erreur) {
    // Contrainte unique (listId, toolId) → l'outil est déjà dans la liste
    if (
      typeof erreur === "object" &&
      erreur !== null &&
      "code" in erreur &&
      (erreur as { code?: string }).code === "P2002"
    ) {
      verdict = "deja-present";
    } else {
      console.error("Partage (ajout d'outil) :", erreur);
      verdict = "base";
    }
  }

  if (verdict === "ajoute") {
    await journaliser(
      userId,
      "liste_partagee_ajout",
      JSON.stringify({ listId: listeId.data, toolId: toolId.data })
    );
  }

  revalidatePath("/dashboard/listes-partagees");
  redirect(`/dashboard/listes-partagees?message=${verdict}`);
}

/** Idée 20 — Retire un outil d'une liste partagée (propriétaire ou
 *  collaborateur EDITEUR). */
export async function retirerOutilListePartageeFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/listes-partagees");

  const listeId = z.string().min(1).safeParse(donnees.get("listeId"));
  if (!listeId.success) redirect("/dashboard/listes-partagees?message=introuvable");
  const itemId = z.string().min(1).safeParse(donnees.get("itemId"));
  if (!itemId.success) redirect("/dashboard/listes-partagees?message=introuvable");

  let autorise = false;
  try {
    autorise = await peutModifierListe(listeId.data, userId);
  } catch (erreur) {
    console.error("Partage (retrait d'outil) :", erreur);
    redirect("/dashboard/listes-partagees?message=base");
  }
  if (!autorise) redirect("/dashboard/listes-partagees?message=non-autorise");

  let verdict: "retire" | "introuvable" | "base" = "retire";
  try {
    const resultat = await prisma.listItem.deleteMany({
      where: { id: itemId.data, listId: listeId.data },
    });
    if (resultat.count === 0) verdict = "introuvable";
  } catch (erreur) {
    console.error("Partage (retrait d'outil) :", erreur);
    verdict = "base";
  }

  if (verdict === "retire") {
    await journaliser(
      userId,
      "liste_partagee_retrait",
      JSON.stringify({ listId: listeId.data, itemId: itemId.data })
    );
  }

  revalidatePath("/dashboard/listes-partagees");
  redirect(`/dashboard/listes-partagees?message=${verdict}`);
}