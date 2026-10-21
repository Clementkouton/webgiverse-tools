// app/actions/admin.ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugifier } from "@/lib/utils";
import { schemaOutilAdmin, schemaArticleAdmin } from "@/lib/schemas";

async function exigerAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Accès réservé aux administrateurs.");
  // Vérifie le rôle directement en base : prend effet immédiatement,
  // même si le jeton de session a été créé avant la promotion en admin.
  const moi = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (moi?.role !== "ADMIN") throw new Error("Accès réservé aux administrateurs.");
  return session.user.id;
}

// ─────────────────────────────────────────────────────────────────────
//  Propositions d'outils (boîte de réception du tableau de bord)
// ─────────────────────────────────────────────────────────────────────

export async function approuverPropositionFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("propositionId"));
  const proposition = await prisma.toolSubmission.findUnique({ where: { id }, include: { category: true } });
  if (!proposition || proposition.statut !== "EN_ATTENTE") return;

  let slug = slugifier(proposition.nom);
  if (await prisma.tool.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;

  const outil = await prisma.tool.create({
    data: {
      nom: proposition.nom, slug, url: proposition.url,
      logo: `https://www.google.com/s2/favicons?domain=${new URL(proposition.url).hostname}&sz=128`,
      description: proposition.description,
      tarif: proposition.tarif ?? "À vérifier",
      gratuit: proposition.tarif === "Gratuit" || proposition.tarif === "Freemium",
      verifieLe: new Date(), statut: "PUBLIE",
      ...(proposition.categorieId && {
        categories: { create: [{ categorieId: proposition.categorieId }] },
      }),
    },
  });
  await prisma.toolSubmission.update({ where: { id }, data: { statut: "APPROUVE", toolId: outil.id } });
  revalidatePath("/admin"); revalidatePath("/outils"); revalidatePath("/");
}

export async function refuserPropositionFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("propositionId"));
  await prisma.toolSubmission.update({ where: { id }, data: { statut: "REFUSE" } });
  revalidatePath("/admin");
}

// ─────────────────────────────────────────────────────────────────────
//  Outils : création, modification, suppression, bascules
// ─────────────────────────────────────────────────────────────────────

export type EtatOutil = { ok: boolean; message: string; erreurs?: Record<string, string> } | null;

/** Découpe un textarea « une ligne = un élément » en tableau propre (20 max). */
function lireLignes(valeur: FormDataEntryValue | null): string[] {
  if (typeof valeur !== "string") return [];
  return valeur.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 20);
}

/** Coche la case si la valeur vaut « on » (case cochée dans le formulaire). */
function lireBooleen(valeur: FormDataEntryValue | null): boolean {
  return valeur === "on" || valeur === "true";
}

/** Lit un nombre depuis le formulaire ; vide / invalide → null. */
function lireNombre(valeur: FormDataEntryValue | null): number | null {
  if (typeof valeur !== "string" || valeur.trim() === "") return null;
  const n = Number(valeur.replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n <= 100000 ? n : null;
}

/** Valide les champs texte du formulaire outil avec le schéma zod. */
function validerChampsOutil(donnees: FormData) {
  const brut = {
    nom: String(donnees.get("nom") ?? ""),
    slug: String(donnees.get("slug") ?? ""),
    url: String(donnees.get("url") ?? ""),
    logo: String(donnees.get("logo") ?? ""),
    description: String(donnees.get("description") ?? ""),
    type: String(donnees.get("type") ?? ""),
    tarif: String(donnees.get("tarif") ?? ""),
    statut: String(donnees.get("statut") ?? ""),
  };
  const analyse = schemaOutilAdmin.safeParse(brut);
  if (analyse.success) return { ok: true as const, donnees: analyse.data };

  const erreurs: Record<string, string> = {};
  for (const probleme of analyse.error.issues) {
    const champ = String(probleme.path[0] ?? "global");
    if (!erreurs[champ]) erreurs[champ] = probleme.message;
  }
  return { ok: false as const, erreurs };
}

type ChampsOutil = z.infer<typeof schemaOutilAdmin>;

/** Construit les données Prisma communes à la création et à la modification. */
function construireDonneesOutil(donnees: FormData, champs: ChampsOutil) {
  const categorieIds = donnees
    .getAll("categories")
    .map((v) => String(v))
    .filter(Boolean)
    .slice(0, 6);

  return {
    nom: champs.nom,
    slug: champs.slug,
    url: champs.url,
    logo:
      champs.logo && champs.logo.length > 0
        ? champs.logo
        : `https://www.google.com/s2/favicons?domain=${new URL(champs.url).hostname}&sz=128`,
    description: champs.description,
    type: champs.type as "OUTIL" | "AGENT",
    tarif: champs.tarif,
    tarifMin: lireNombre(donnees.get("tarifMin")),
    gratuit: lireBooleen(donnees.get("gratuit")),
    openSource: lireBooleen(donnees.get("openSource")),
    misEnAvant: lireBooleen(donnees.get("misEnAvant")),
    niveau: (String(donnees.get("niveau") ?? "Débutant") || "Débutant") as string,
    langues: lireLignes(donnees.get("langues")),
    objectifs: lireLignes(donnees.get("objectifs")),
    fonctions: lireLignes(donnees.get("fonctions")),
    casUsage: lireLignes(donnees.get("casUsage")),
    statut: champs.statut as "BROUILLON" | "PUBLIE" | "ARCHIVE",
    verifieLe: lireBooleen(donnees.get("verifie")) ? new Date() : null,
    ...(categorieIds.length > 0
      ? { categories: { deleteMany: {}, create: categorieIds.map((categorieId) => ({ categorieId })) } }
      : { categories: { deleteMany: {} } }),
  };
}

/** Création d'un outil (formulaire /admin/outils/nouveau). */
export async function creerOutilAction(_etatPrecedent: EtatOutil, donnees: FormData): Promise<EtatOutil> {
  await exigerAdmin();

  const validation = validerChampsOutil(donnees);
  if (!validation.ok) {
    return { ok: false, message: "Corrige les champs signalés en rouge, puis réessaie.", erreurs: validation.erreurs };
  }

  let slug = validation.donnees.slug;
  if (await prisma.tool.findUnique({ where: { slug } })) {
    return { ok: false, message: "Ce slug est déjà utilisé par un autre outil.", erreurs: { slug: "Slug déjà pris, change-le." } };
  }

  const donneesOutil = construireDonneesOutil(donnees, validation.donnees);
  await prisma.tool.create({ data: { ...donneesOutil, slug } });

  revalidatePath("/admin"); revalidatePath("/admin/outils"); revalidatePath("/outils"); revalidatePath("/");
  redirect("/admin/outils?cree=1");
}

/** Modification d'un outil (formulaire /admin/outils/[id]). */
export async function majOutilAction(_etatPrecedent: EtatOutil, donnees: FormData): Promise<EtatOutil> {
  await exigerAdmin();

  const outilId = String(donnees.get("outilId") ?? "");
  if (!outilId) return { ok: false, message: "Outil introuvable." };

  const validation = validerChampsOutil(donnees);
  if (!validation.ok) {
    return { ok: false, message: "Corrige les champs signalés en rouge, puis réessaie.", erreurs: validation.erreurs };
  }

  const existant = await prisma.tool.findUnique({ where: { slug: validation.donnees.slug } });
  if (existant && existant.id !== outilId) {
    return { ok: false, message: "Ce slug est déjà utilisé par un autre outil.", erreurs: { slug: "Slug déjà pris, change-le." } };
  }

  const donneesOutil = construireDonneesOutil(donnees, validation.donnees);
  await prisma.tool.update({ where: { id: outilId }, data: donneesOutil });

  revalidatePath("/admin"); revalidatePath("/admin/outils"); revalidatePath("/outils"); revalidatePath("/");
  revalidatePath(`/outil/${validation.donnees.slug}`);
  redirect("/admin/outils?maj=1");
}

/** Suppression d'un outil (détache d'abord les propositions qui le référencent). */
export async function supprimerOutilFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("outilId"));
  await prisma.toolSubmission.updateMany({ where: { toolId: id }, data: { toolId: null } });
  await prisma.tool.delete({ where: { id } });
  revalidatePath("/admin"); revalidatePath("/admin/outils"); revalidatePath("/outils"); revalidatePath("/");
}

export async function basculerPublicationFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("outilId"));
  const outil = await prisma.tool.findUnique({ where: { id } });
  if (!outil) return;
  await prisma.tool.update({
    where: { id },
    data: { statut: outil.statut === "PUBLIE" ? "ARCHIVE" : "PUBLIE" },
  });
  revalidatePath("/admin"); revalidatePath("/admin/outils"); revalidatePath("/outils");
}

export async function basculerMiseEnAvantFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("outilId"));
  const outil = await prisma.tool.findUnique({ where: { id } });
  if (!outil) return;
  await prisma.tool.update({ where: { id }, data: { misEnAvant: !outil.misEnAvant } });
  revalidatePath("/admin"); revalidatePath("/admin/outils"); revalidatePath("/");
}

// ─────────────────────────────────────────────────────────────────────
//  Articles : actualités + blog
// ─────────────────────────────────────────────────────────────────────

export type EtatArticle = { ok: boolean; message: string; erreurs?: Record<string, string> } | null;

/** Valide les champs texte du formulaire article avec le schéma zod. */
function validerChampsArticle(donnees: FormData) {
  const brut = {
    titre: String(donnees.get("titre") ?? ""),
    slug: String(donnees.get("slug") ?? ""),
    type: String(donnees.get("type") ?? ""),
    statut: String(donnees.get("statut") ?? ""),
    extrait: String(donnees.get("extrait") ?? ""),
    image: String(donnees.get("image") ?? ""),
    auteur: String(donnees.get("auteur") ?? ""),
    contenu: String(donnees.get("contenu") ?? ""),
  };
  const analyse = schemaArticleAdmin.safeParse(brut);
  if (analyse.success) return { ok: true as const, donnees: analyse.data };

  const erreurs: Record<string, string> = {};
  for (const probleme of analyse.error.issues) {
    const champ = String(probleme.path[0] ?? "global");
    if (!erreurs[champ]) erreurs[champ] = probleme.message;
  }
  return { ok: false as const, erreurs };
}

type ChampsArticle = z.infer<typeof schemaArticleAdmin>;

/** Construit les données Prisma du formulaire article. */
function construireDonneesArticle(champs: ChampsArticle) {
  return {
    titre: champs.titre,
    slug: champs.slug,
    type: champs.type as "ACTUALITE" | "BLOG",
    statut: champs.statut as "BROUILLON" | "PUBLIE",
    extrait: champs.extrait,
    image: champs.image && champs.image.length > 0 ? champs.image : null,
    auteur: champs.auteur && champs.auteur.length > 0 ? champs.auteur : "L'équipe Webgiverse",
    contenu: champs.contenu,
  };
}

/** Création d'un article (formulaire /admin/articles/nouveau). */
export async function creerArticleAction(_etatPrecedent: EtatArticle, donnees: FormData): Promise<EtatArticle> {
  await exigerAdmin();

  const validation = validerChampsArticle(donnees);
  if (!validation.ok) {
    return { ok: false, message: "Corrige les champs signalés en rouge, puis réessaie.", erreurs: validation.erreurs };
  }

  const donneesArticle = construireDonneesArticle(validation.donnees);
  if (await prisma.article.findUnique({ where: { slug: donneesArticle.slug } })) {
    return { ok: false, message: "Ce slug est déjà utilisé par un autre article.", erreurs: { slug: "Slug déjà pris, change-le." } };
  }

  await prisma.article.create({
    data: { ...donneesArticle, publieLe: donneesArticle.statut === "PUBLIE" ? new Date() : null },
  });

  revalidatePath("/admin/articles"); revalidatePath("/actualites"); revalidatePath("/blog");
  redirect("/admin/articles?cree=1");
}

/** Modification d'un article (formulaire /admin/articles/[id]). */
export async function majArticleAction(_etatPrecedent: EtatArticle, donnees: FormData): Promise<EtatArticle> {
  await exigerAdmin();

  const articleId = String(donnees.get("articleId") ?? "");
  if (!articleId) return { ok: false, message: "Article introuvable." };

  const validation = validerChampsArticle(donnees);
  if (!validation.ok) {
    return { ok: false, message: "Corrige les champs signalés en rouge, puis réessaie.", erreurs: validation.erreurs };
  }

  const existant = await prisma.article.findUnique({ where: { id: articleId } });
  if (!existant) return { ok: false, message: "Article introuvable." };

  const donneesArticle = construireDonneesArticle(validation.donnees);
  const collision = await prisma.article.findUnique({ where: { slug: donneesArticle.slug } });
  if (collision && collision.id !== articleId) {
    return { ok: false, message: "Ce slug est déjà utilisé par un autre article.", erreurs: { slug: "Slug déjà pris, change-le." } };
  }

  // Ne réinitialise pas la date de publication si l'article était déjà publié.
  await prisma.article.update({
    where: { id: articleId },
    data: {
      ...donneesArticle,
      publieLe:
        donneesArticle.statut === "PUBLIE" ? (existant.publieLe ?? new Date()) : null,
    },
  });

  revalidatePath("/admin/articles"); revalidatePath("/actualites"); revalidatePath("/blog");
  revalidatePath(`/articles/${donneesArticle.slug}`);
  redirect("/admin/articles?maj=1");
}

/** Suppression d'un article. */
export async function supprimerArticleFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("articleId"));
  await prisma.article.delete({ where: { id } });
  revalidatePath("/admin/articles"); revalidatePath("/actualites"); revalidatePath("/blog");
}

/** Publier / remettre en brouillon un article depuis la liste. */
export async function basculerPublicationArticleFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("articleId"));
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return;

  const nouveauStatut = article.statut === "PUBLIE" ? "BROUILLON" : "PUBLIE";
  await prisma.article.update({
    where: { id },
    data: {
      statut: nouveauStatut,
      publieLe: nouveauStatut === "PUBLIE" ? (article.publieLe ?? new Date()) : null,
    },
  });
  revalidatePath("/admin/articles"); revalidatePath("/actualites"); revalidatePath("/blog");
}

// ─────────────────────────────────────────────────────────────────────
//  Modération des avis
// ─────────────────────────────────────────────────────────────────────

export async function supprimerAvisAdminFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("avisId"));
  await prisma.avis.delete({ where: { id } });
  revalidatePath("/admin/avis"); revalidatePath("/admin"); revalidatePath("/outils");
}

// ─────────────────────────────────────────────────────────────────────
//  Utilisateurs : bascule du rôle (USER ↔ ADMIN)
// ─────────────────────────────────────────────────────────────────────

export async function basculerRoleFormulaire(donnees: FormData) {
  const adminId = await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("utilisateurId"));
  if (id === adminId) return; // Sécurité : on ne peut pas modifier son propre rôle.

  const cible = await prisma.user.findUnique({ where: { id } });
  if (!cible) return;

  await prisma.user.update({
    where: { id },
    data: { role: cible.role === "ADMIN" ? "USER" : "ADMIN" },
  });
  revalidatePath("/admin/utilisateurs");
}