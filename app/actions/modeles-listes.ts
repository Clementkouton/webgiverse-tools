// app/actions/modeles-listes.ts
// ─────────────────────────────────────────────────────────────────
// Lot 57 — Privilèges Entreprise Niveau 3.
// Idée 22 : modèles de listes. Le propriétaire d'une liste PUBLIQUE
//   la « publie comme modèle » (table ModeleListe) ; les utilisateurs
//   avec l'avantage Entreprise (titulaire ENTREPRISE actif OU membre
//   d'une équipe) clonent le modèle en un clic : une copie de la
//   liste est créée dans leur propre dashboard (estPublique = false),
//   avec tous ses outils. La liste source ne bouge pas.
// Défensif : table ModeleListe absente → ?message=base, jamais de crash.
// ⚠️ Fichier "use server" : chaque export DOIT être une fonction async.
// ─────────────────────────────────────────────────────────────────
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";

async function userIdConnecte() {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** La table Prisma n'existe pas dans certains schémas : on la traite
 *  de manière défensive pour éviter les crashes TypeScript/runtime. */
async function modeleListePrisma() {
  return (prisma as any).modeleListe ?? null;
}

/** Avantage Entreprise = titulaire d'un abonnement ENTREPRISE actif
 *  OU membre d'une équipe (le siège occupe l'avantage). */
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
    const tablesPossibles = [
      "MembreEntreprise",
      "membreEntreprise",
      "membre_entreprise",
      "membreentreprise",
    ];

    for (const table of tablesPossibles) {
      try {
        const siege = await prisma.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM "${table}" WHERE "membreId" = $1 LIMIT 1`,
          userId,
        );
        if (siege.length > 0) return true;
      } catch {
        // table absente ou colonne différente → on continue
      }
    }

    return false;
  } catch {
    // table absente → pas d'avantage
    return false;
  }
}

/** Idée 22 — Publie une de ses listes PUBLIQUES comme modèle du
 *  catalogue (le champ listId est unique : une liste = un modèle). */
export async function publierModeleFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/modeles-listes");

  const listeId = z.string().min(1).safeParse(donnees.get("listeId"));
  if (!listeId.success) redirect("/dashboard/modeles-listes?message=introuvable");

  // La liste doit appartenir à l'utilisateur et être publique
  // (on ne publie que du contenu déjà visible par tous).
  let listeValide = false;
  try {
    const liste = await prisma.list.findFirst({
      where: { id: listeId.data, userId, estPublique: true },
      select: { id: true },
    });
    listeValide = Boolean(liste);
  } catch (erreur) {
    console.error("Modèles (lecture de la liste) :", erreur);
    redirect("/dashboard/modeles-listes?message=base");
  }
  if (!listeValide) redirect("/dashboard/modeles-listes?message=liste-privee");

  const modeleListe = await modeleListePrisma();
  if (!modeleListe) redirect("/dashboard/modeles-listes?message=base");

  let verdict: "publie" | "deja-publie" | "base" = "publie";
  try {
    const dejaModele = await modeleListe.findUnique({
      where: { listId: listeId.data },
      select: { id: true },
    });
    if (dejaModele) {
      verdict = "deja-publie";
    } else {
      await modeleListe.create({ data: { listId: listeId.data } });
    }
  } catch (erreur) {
    console.error("Modèles (publication) :", erreur);
    verdict = "base";
  }

  if (verdict === "publie") {
    try {
      await journaliser(userId, "modele_publie", JSON.stringify({ listId: listeId.data }));
    } catch {
      // le journal ne doit jamais bloquer la publication
    }
  }

  revalidatePath("/dashboard/modeles-listes");
  redirect(`/dashboard/modeles-listes?message=${verdict}`);
}

/** Idée 22 — Retire une de ses listes du catalogue des modèles
 *  (la liste elle-même reste intacte et publique). */
export async function retirerModeleFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/modeles-listes");

  const listeId = z.string().min(1).safeParse(donnees.get("listeId"));
  if (!listeId.success) redirect("/dashboard/modeles-listes?message=introuvable");

  // On ne retire que le modèle d'une liste qui nous appartient.
  let listeValide = false;
  try {
    const liste = await prisma.list.findFirst({
      where: { id: listeId.data, userId },
      select: { id: true },
    });
    listeValide = Boolean(liste);
  } catch (erreur) {
    console.error("Modèles (lecture de la liste) :", erreur);
    redirect("/dashboard/modeles-listes?message=base");
  }
  if (!listeValide) redirect("/dashboard/modeles-listes?message=introuvable");

  const modeleListe = await modeleListePrisma();
  if (!modeleListe) redirect("/dashboard/modeles-listes?message=base");

  let verdict: "retire" | "introuvable" | "base" = "retire";
  try {
    const resultat = await modeleListe.deleteMany({
      where: { listId: listeId.data },
    });
    if (resultat.count === 0) verdict = "introuvable";
  } catch (erreur) {
    console.error("Modèles (retrait) :", erreur);
    verdict = "base";
  }

  if (verdict === "retire") {
    try {
      await journaliser(userId, "modele_retire", JSON.stringify({ listId: listeId.data }));
    } catch {
      // le journal ne doit jamais bloquer le retrait
    }
  }

  revalidatePath("/dashboard/modeles-listes");
  redirect(`/dashboard/modeles-listes?message=${verdict}`);
}

/** Idée 22 — Clone un modèle du catalogue : crée une copie de la
 *  liste dans le dashboard de l'utilisateur (avec tous ses outils).
 *  Réservé aux comptes avec l'avantage Entreprise. */
export async function clonerModeleFormulaire(donnees: FormData) {
  const userId = await userIdConnecte();
  if (!userId) redirect("/connexion?suite=/dashboard/modeles-listes");

  const modeleId = z.string().min(1).safeParse(donnees.get("modeleId"));
  if (!modeleId.success) redirect("/dashboard/modeles-listes?message=introuvable");

  if (!(await avantageEntreprise(userId))) {
    redirect("/dashboard/modeles-listes?message=non-autorise");
  }

  // Le modèle et sa liste source doivent exister et rester publics.
  const modeleListe = await modeleListePrisma();
  if (!modeleListe) redirect("/dashboard/modeles-listes?message=base");

  let source: { id: string; nom: string; outils: { toolId: string }[] } | null = null;
  try {
    const modele = await modeleListe.findUnique({
      where: { id: modeleId.data },
      select: { id: true, listId: true },
    });
    if (modele) {
      const listeSource = await prisma.list.findUnique({
        where: { id: modele.listId },
        select: {
          id: true,
          nom: true,
          estPublique: true,
          items: { select: { toolId: true } },
        },
      });
      if (listeSource && listeSource.estPublique) {
        source = {
          id: listeSource.id,
          nom: listeSource.nom,
          outils: listeSource.items,
        };
      }
    }
  } catch (erreur) {
    console.error("Modèles (lecture du modèle) :", erreur);
    redirect("/dashboard/modeles-listes?message=base");
  }
  if (!source) redirect("/dashboard/modeles-listes?message=indisponible");

  // Création de la copie — aucun redirect() DANS le try.
  let verdict: "clone" | "base" = "clone";
  try {
    const nouvelleListe = await prisma.list.create({
      data: { userId, nom: source.nom },
      select: { id: true },
    });
    if (source.outils.length > 0) {
      await prisma.listItem.createMany({
        data: source.outils.map((item) => ({
          listId: nouvelleListe.id,
          toolId: item.toolId,
        })),
        skipDuplicates: true,
      });
    }
  } catch (erreur) {
    console.error("Modèles (clonage) :", erreur);
    verdict = "base";
  }

  if (verdict === "clone") {
    try {
      await journaliser(userId, "modele_clone", JSON.stringify({ modeleId: modeleId.data }));
    } catch {
      // le journal ne doit jamais bloquer le clonage
    }
  }

  revalidatePath("/dashboard/modeles-listes");
  redirect(`/dashboard/modeles-listes?message=${verdict}`);
}