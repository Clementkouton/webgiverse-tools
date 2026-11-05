// ============================================================
// WEBGIVERSE TOOLS — Admin / Newsletter (VERSION 2)
// Chemin : app/admin/newsletter/page.tsx
// Remplace INTÉGRALEMENT l'ancien fichier du même nom.
//
// Nouveautés de cette version :
//   - Les requêtes campagnes et abonnés sont testées SÉPARÉMENT :
//     si une table n'est pas à jour, l'autre s'affiche quand même
//     et un encadré orange explique exactement quoi faire.
//   - Détection précise du cas « colonne absente de la base »
//     (ex. AbonneNewsletter.statut) avec la marche à suivre.
//   - Les abonnés sont créés/modifiés en synchronisant actif ET
//     statut (compatibilité avec votre formulaire de la landing
//     page existant).
//   - L'ancien statut « PRETA » (coquille) s'affiche « PRETE » et
//     se corrige en un clic.
//   - Plus aucun lien vers /newsletter/inscription (supprimée :
//     votre landing page a déjà son formulaire).
//
// Prérequis :
//   - Modèle AbonneNewsletter version 2 (avec statut) dans
//     prisma/schema.prisma (voir prisma/modele-abonne-newsletter.prisma)
//     + npx prisma db push
//   - Pour l'envoi réel : npm install nodemailer + variables SMTP
//     dans .env.local (voir LISEZ-MOI)
// ============================================================

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

type ClientPrisma = Record<string, any>;

type Campagne = {
  id: string;
  titre: string;
  objet: string;
  contenu: string;
  lienArticle: string | null;
  nomEntreprise: string | null;
  statut: string;
  envoyeLe: Date | null;
  creeLe: Date;
};

type Abonne = {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  token: string;
  statut: string | null;
  actif: boolean;
  desabonneLe: Date | null;
  creeLe: Date;
};

type AbonneTemplate = {
  email: string;
  prenom?: string | null;
  nom?: string | null;
  token?: string | null;
};

const NOM_ENTREPRISE_DEFAUT = process.env.NOM_ENTREPRISE || "Webgiverse";

/* ------------------------- Utilitaires ------------------------- */

/** URL absolue du site : variable NEXT_PUBLIC_URL_SITE si elle est
 *  définie, sinon détection automatique (tunnel dev, localhost, prod). */
async function baseUrlDuSite(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_URL_SITE;
  if (env && env.trim()) return env.trim().replace(/\/+$/, "");
  try {
    const h = await headers();
    const host = h.get("host") || "localhost:3000";
    const proto =
      h.get("x-forwarded-proto") ||
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");
    return `${proto}://${host}`;
  } catch {
    return "http://localhost:3000";
  }
}

/** Remplace toutes les variables {{...}} par les valeurs réelles de
 *  l'abonné et de la campagne. Les variables inconnues sont retirées. */
function remplacerVariables(
  texte: string,
  abonne: AbonneTemplate,
  campagne: { nomEntreprise?: string | null; lienArticle?: string | null },
  baseUrl: string
): string {
  const base = (baseUrl || "").replace(/\/+$/, "");
  const prenom =
    (abonne.prenom || "").trim() ||
    (abonne.nom || "").trim() ||
    (abonne.email || "").split("@")[0] ||
    "";
  const nom = (abonne.nom || "").trim();
  const entreprise =
    (campagne.nomEntreprise || "").trim() || NOM_ENTREPRISE_DEFAUT;
  const article = (campagne.lienArticle || "").trim() || base;
  const token = (abonne.token || "").trim();
  const lienDesabonnement = token
    ? `${base}/newsletter/desabonnement/${token}`
    : `${base}/newsletter`;
  const lienPreferences = token
    ? `${base}/newsletter/preferences/${token}`
    : `${base}/newsletter`;
  const dateDuJour = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const valeurs: Record<string, string> = {
    "prénom": prenom,
    prenom: prenom,
    "PRÉNOM": prenom.toUpperCase(),
    PRENOM: prenom.toUpperCase(),
    nom: nom,
    NOM: nom.toUpperCase(),
    email: abonne.email,
    EMAIL: abonne.email,
    nom_entreprise: entreprise,
    nomEntreprise: entreprise,
    NOM_ENTREPRISE: entreprise,
    lien_article: article,
    lienArticle: article,
    LIEN_ARTICLE: article,
    lien_desabonnement: lienDesabonnement,
    lienDesabonnement: lienDesabonnement,
    LIEN_DESABONNEMENT: lienDesabonnement,
    lien_preferences: lienPreferences,
    lienPreferences: lienPreferences,
    LIEN_PREFERENCES: lienPreferences,
    date: dateDuJour,
    date_du_jour: dateDuJour,
  };

  return (texte || "").replace(
    /\{\{\s*([^{}]+?)\s*\}\}/g,
    (entier: string, cle: string) => {
      const valeur =
        valeurs[cle] ?? valeurs[cle.toLowerCase()] ?? valeurs[cle.toUpperCase()];
      return valeur !== undefined ? valeur : "";
    }
  );
}

/** Ajoute le pied de page (liens désabonnement / préférences) s'il est absent. */
function completerPiedDePage(contenu: string): string {
  if (!contenu || contenu.includes("lien_desabonnement")) return contenu;
  return (
    contenu +
    "\n\n——————————————————\n" +
    "Vous recevez cet e-mail car vous êtes inscrit à la newsletter.\n" +
    "Se désabonner : {{lien_desabonnement}}\n" +
    "Mettre à jour vos préférences : {{lien_preferences}}"
  );
}

/** HTML simple et lisible pour les boîtes mail (à partir du texte). */
function contenuEnHtml(contenu: string): string {
  const echappe = (contenu || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1f2937;white-space:pre-wrap;">${echappe}</div>`;
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Affiche le statut en corrigeant l'ancienne coquille « PRETA ». */
function afficherStatut(statut: string): string {
  if (statut === "PRETA") return "PRETE";
  return statut;
}

/** Charge nodemailer sans casser la compilation si le package
 *  n'est pas installé (l'envoi affichera alors un message clair). */
function chargerNodemailer(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const requis = eval("require") as (module: string) => any;
    return requis("nodemailer");
  } catch {
    return null;
  }
}

/** Met à jour un abonné en synchronisant actif ET statut (l'ancien
 *  système utilise statut, le nouveau actif). Retente sans statut
 *  si la colonne n'existe pas encore dans la base. */
async function majAbonneAvecStatut(
  where: Record<string, any>,
  data: Record<string, any>
) {
  const client = prisma as ClientPrisma;
  const donnees = { ...data };
  if (data.actif !== undefined) {
    donnees.statut = data.actif === false ? "DESABONNE" : "ACTIF";
  }
  try {
    await client.abonneNewsletter.update({ where, data: donnees });
  } catch {
    const sansStatut: Record<string, any> = { ...donnees };
    delete sansStatut.statut;
    await client.abonneNewsletter.update({ where, data: sansStatut });
  }
}

/* ---------------------- Actions serveur ------------------------ */

async function creerCampagne(formData: FormData) {
  "use server";
  const titre = String(formData.get("titre") || "").trim();
  const objet = String(formData.get("objet") || "").trim();
  const contenu = String(formData.get("contenu") || "").trim();
  const lienArticle = String(formData.get("lienArticle") || "").trim();
  const nomEntreprise = String(formData.get("nomEntreprise") || "").trim();

  if (!titre || !objet || !contenu) {
    redirect(
      "/admin/newsletter?envoi=" +
        encodeURIComponent("Erreur : titre, objet et contenu sont obligatoires.")
    );
  }

  const client = prisma as ClientPrisma;
  try {
    await client.campagneNewsletter.create({
      data: {
        titre,
        objet,
        contenu,
        lienArticle: lienArticle || null,
        nomEntreprise: nomEntreprise || null,
      },
    });
  } catch {
    // Champs lienArticle / nomEntreprise absents du schéma -> création sans eux
    await client.campagneNewsletter.create({ data: { titre, objet, contenu } });
  }
  revalidatePath("/admin/newsletter");
  redirect("/admin/newsletter");
}

async function basculerStatutCampagne(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  const client = prisma as ClientPrisma;
  const campagne = await client.campagneNewsletter
    ?.findUnique({ where: { id } })
    .catch(() => null);
  if (campagne) {
    const nouveau = campagne.statut === "PRETE" ? "BROUILLON" : "PRETE";
    await client.campagneNewsletter.update({
      where: { id },
      data: { statut: nouveau },
    });
  }
  revalidatePath("/admin/newsletter");
}

async function supprimerCampagne(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  const client = prisma as ClientPrisma;
  await client.campagneNewsletter?.delete({ where: { id } }).catch(() => null);
  revalidatePath("/admin/newsletter");
}

async function envoyerCampagne(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  let message = "";
  try {
    const client = prisma as ClientPrisma;
    const campagne = await client.campagneNewsletter.findUnique({ where: { id } });
    if (!campagne) throw new Error("Campagne introuvable.");

    const abonnes = await client.abonneNewsletter.findMany({
      where: { actif: true },
    });
    if (!abonnes.length) {
      throw new Error("Aucun abonné actif : ajoutez d'abord des abonnés.");
    }

    const nodemailer = chargerNodemailer();
    if (!nodemailer) {
      throw new Error(
        "Le package nodemailer est manquant. Exécutez : npm install nodemailer (puis redémarrez le serveur)."
      );
    }

    const hote = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const utilisateur = process.env.SMTP_USER;
    const motDePasse = process.env.SMTP_PASS;
    if (!hote || !utilisateur || !motDePasse) {
      throw new Error(
        "SMTP non configuré : ajoutez SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS dans .env.local puis redémarrez le serveur."
      );
    }
    const expediteur = process.env.NEWSLETTER_FROM || utilisateur;
    const transport = nodemailer.createTransport({
      host: hote,
      port,
      secure: port === 465,
      auth: { user: utilisateur, pass: motDePasse },
    });

    const base = await baseUrlDuSite();
    const contenuBrut = completerPiedDePage(campagne.contenu);
    let envoyes = 0;
    let echecs = 0;

    for (const abonne of abonnes) {
      try {
        const objet = remplacerVariables(campagne.objet, abonne, campagne, base);
        const texte = remplacerVariables(contenuBrut, abonne, campagne, base);
        await transport.sendMail({
          from: expediteur,
          to: abonne.email,
          subject: objet,
          text: texte,
          html: contenuEnHtml(texte),
        });
        envoyes++;
      } catch {
        echecs++;
      }
    }

    await client.campagneNewsletter.update({
      where: { id },
      data: { statut: "ENVOYEE", envoyeLe: new Date() },
    });

    message =
      `Envoi terminé : ${envoyes} e-mail(s) envoyé(s)` +
      (echecs ? `, ${echecs} échec(s)` : "") +
      ".";
  } catch (erreur: any) {
    message = "Erreur : " + (erreur?.message || "envoi impossible");
  }
  revalidatePath("/admin/newsletter");
  redirect("/admin/newsletter?envoi=" + encodeURIComponent(message));
}

async function creerAbonne(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const prenom = String(formData.get("prenom") || "").trim();
  const nom = String(formData.get("nom") || "").trim();

  if (!email || !email.includes("@")) {
    redirect(
      "/admin/newsletter?envoi=" + encodeURIComponent("Erreur : e-mail invalide.")
    );
  }

  const client = prisma as ClientPrisma;
  const existant = await client.abonneNewsletter
    .findUnique({ where: { email } })
    .catch(() => null);
  if (existant) {
    await majAbonneAvecStatut(
      { email },
      { prenom: prenom || existant.prenom, nom: nom || existant.nom }
    );
  } else {
    try {
      await client.abonneNewsletter.create({
        data: {
          email,
          prenom: prenom || null,
          nom: nom || null,
          actif: true,
          statut: "ACTIF",
        },
      });
    } catch {
      // Colonne statut absente de la base -> création sans statut
      await client.abonneNewsletter.create({
        data: { email, prenom: prenom || null, nom: nom || null },
      });
    }
  }
  revalidatePath("/admin/newsletter");
  redirect("/admin/newsletter");
}

async function basculerAbonne(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  const client = prisma as ClientPrisma;
  const abonne = await client.abonneNewsletter
    ?.findUnique({ where: { id } })
    .catch(() => null);
  if (abonne) {
    const actif = !abonne.actif;
    await majAbonneAvecStatut(
      { id },
      { actif, desabonneLe: actif ? null : new Date() }
    );
  }
  revalidatePath("/admin/newsletter");
}

async function supprimerAbonne(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  const client = prisma as ClientPrisma;
  await client.abonneNewsletter?.delete({ where: { id } }).catch(() => null);
  revalidatePath("/admin/newsletter");
}

/* --------------------------- Page ------------------------------ */

export default async function PageAdminNewsletter({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const messageEnvoi = typeof params.envoi === "string" ? params.envoi : "";
  const idApercu = typeof params.apercu === "string" ? params.apercu : "";
  const idAbonneApercu = typeof params.abonne === "string" ? params.abonne : "";

  const client = prisma as ClientPrisma;

  let modeleManquant = "";
  if (!client.campagneNewsletter) modeleManquant = "CampagneNewsletter";
  if (!client.abonneNewsletter) {
    modeleManquant = modeleManquant
      ? "CampagneNewsletter et AbonneNewsletter"
      : "AbonneNewsletter";
  }

  let campagnes: Campagne[] = [];
  let abonnes: Abonne[] = [];
  let erreurs: string[] = [];

  if (!modeleManquant) {
    try {
      campagnes = (await client.campagneNewsletter.findMany({
        orderBy: { creeLe: "desc" },
      })) as Campagne[];
    } catch (erreur: any) {
      erreurs.push("Campagnes : " + (erreur?.message || "erreur inconnue"));
    }
    try {
      abonnes = (await client.abonneNewsletter.findMany({
        orderBy: { creeLe: "desc" },
      })) as Abonne[];
    } catch (erreur: any) {
      erreurs.push("Abonnés : " + (erreur?.message || "erreur inconnue"));
    }
  }

  const erreurChargement = erreurs.join(" — ");
  const baseDesynchronisee = erreurChargement
    .toLowerCase()
    .includes("does not exist");

  const base = await baseUrlDuSite();
  const actifs = abonnes.filter((a) => a.actif);

  // Aperçu personnalisé
  const campagneApercu = idApercu
    ? campagnes.find((c) => c.id === idApercu) || null
    : null;
  let abonneApercu: Abonne | null = null;
  let apercuExemple = false;
  if (campagneApercu) {
    if (idAbonneApercu) {
      abonneApercu = abonnes.find((a) => a.id === idAbonneApercu) || null;
    }
    if (!abonneApercu) {
      abonneApercu = actifs[0] || abonnes[0] || null;
    }
    if (!abonneApercu) {
      apercuExemple = true;
      abonneApercu = {
        id: "exemple",
        email: "exemple@domaine.fr",
        prenom: "Aperçu",
        nom: "Exemple",
        token: "TOKEN_EXEMPLE_123",
        statut: "ACTIF",
        actif: true,
        desabonneLe: null,
        creeLe: new Date(),
      };
    }
  }

  const objetRendu =
    campagneApercu && abonneApercu
      ? remplacerVariables(campagneApercu.objet, abonneApercu, campagneApercu, base)
      : "";
  const contenuRendu =
    campagneApercu && abonneApercu
      ? remplacerVariables(
          completerPiedDePage(campagneApercu.contenu),
          abonneApercu,
          campagneApercu,
          base
        )
      : "";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">Newsletter</h1>
          <p className="mt-1 text-sm text-gray-500">
            Campagnes, abonnés, aperçu personnalisé et envoi.
          </p>
        </header>

        {(modeleManquant || erreurChargement) && (
          <div className="rounded-xl border border-orange-300 bg-orange-50 p-4 text-sm text-orange-900">
            <p className="font-semibold">La newsletter n'est pas encore opérationnelle.</p>
            {modeleManquant && (
              <p className="mt-1">
                Modèle(s) manquant(s) dans votre client Prisma :{" "}
                <strong>{modeleManquant}</strong>.
              </p>
            )}
            {erreurChargement && <p className="mt-1 break-words">{erreurChargement}</p>}
            {baseDesynchronisee && (
              <p className="mt-2 rounded-lg bg-orange-100 p-2">
                <strong>Cause la plus probable :</strong> votre schéma Prisma et votre base
                ne sont pas synchronisés (le client attend une colonne absente de la base,
                par exemple <code>AbonneNewsletter.statut</code>). Remplacez le modèle
                AbonneNewsletter dans <code>prisma/schema.prisma</code> par celui du fichier{" "}
                <code>prisma/modele-abonne-newsletter.prisma</code> fourni (il contient
                désormais le champ <code>statut</code>), puis relancez{" "}
                <code>npx prisma format</code>, <code>npx prisma db push</code>, et
                redémarrez le serveur.
              </p>
            )}
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>
                Copiez le modèle AbonneNewsletter du fichier{" "}
                <code className="bg-orange-100 px-1">prisma/modele-abonne-newsletter.prisma</code>{" "}
                dans votre <code className="bg-orange-100 px-1">prisma/schema.prisma</code>{" "}
                À LA PLACE de l'ancien (ne touchez pas à CampagneNewsletter).
              </li>
              <li>
                Exécutez <code className="bg-orange-100 px-1">npx prisma format</code> puis{" "}
                <code className="bg-orange-100 px-1">npx prisma db push</code>
              </li>
              <li>
                Arrêtez le serveur, supprimez le dossier{" "}
                <code className="bg-orange-100 px-1">.next</code>, relancez{" "}
                <code className="bg-orange-100 px-1">npm run dev</code>
              </li>
            </ol>
          </div>
        )}

        {messageEnvoi && (
          <div
            className={
              "rounded-xl border p-4 text-sm " +
              (messageEnvoi.startsWith("Erreur")
                ? "border-red-300 bg-red-50 text-red-800"
                : "border-green-300 bg-green-50 text-green-800")
            }
          >
            {messageEnvoi}
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Campagnes</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{campagnes.length}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Abonnés actifs</p>
            <p className="mt-1 text-2xl font-bold text-green-700">{actifs.length}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Désabonnés</p>
            <p className="mt-1 text-2xl font-bold text-gray-400">
              {abonnes.length - actifs.length}
            </p>
          </div>
        </div>

        {/* Campagnes */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Campagnes ({campagnes.length})
          </h2>

          <form action={creerCampagne} className="space-y-3 rounded-xl border bg-white p-4">
            <p className="text-sm font-semibold text-gray-700">Nouvelle campagne</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                name="titre"
                required
                placeholder="Titre interne *"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                name="objet"
                required
                placeholder="Objet de l'e-mail *"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                name="lienArticle"
                placeholder="Lien de l'article (pour {{lien_article}})"
                className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
              />
              <input
                name="nomEntreprise"
                placeholder="Nom de l'entreprise (pour {{nom_entreprise}})"
                className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
              />
            </div>
            <textarea
              name="contenu"
              required
              rows={12}
              placeholder="Contenu de l'e-mail * — collez votre texte ici, les variables seront remplacées automatiquement."
              className="w-full rounded-lg border px-3 py-2 font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Variables remplacées automatiquement pour chaque abonné :{" "}
              <code>{"{{prénom}}"}</code>, <code>{"{{nom}}"}</code>,{" "}
              <code>{"{{email}}"}</code>, <code>{"{{nom_entreprise}}"}</code>,{" "}
              <code>{"{{lien_article}}"}</code>, <code>{"{{lien_desabonnement}}"}</code>,{" "}
              <code>{"{{lien_preferences}}"}</code>. Si le contenu ne contient pas{" "}
              <code>{"{{lien_desabonnement}}"}</code>, un pied de page avec les liens est
              ajouté automatiquement à l'envoi.
            </p>
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Créer la campagne
            </button>
          </form>

          {campagnes.length === 0 && !erreurChargement && (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
              Aucune campagne pour l'instant. Créez-en une ci-dessus.
            </p>
          )}

          <div className="space-y-3">
            {campagnes.map((campagne) => (
              <div key={campagne.id} className="rounded-xl border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{campagne.titre}</p>
                    <p className="text-sm text-gray-500">{campagne.objet}</p>
                  </div>
                  <span
                    className={
                      "rounded-full px-3 py-1 text-xs font-semibold " +
                      (campagne.statut === "ENVOYEE"
                        ? "bg-green-100 text-green-800"
                        : afficherStatut(campagne.statut) === "PRETE"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-600")
                    }
                  >
                    {afficherStatut(campagne.statut)}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-gray-500">
                  {campagne.contenu.slice(0, 300)}
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  Créée le {formatDate(campagne.creeLe)}
                  {campagne.envoyeLe ? ` · Envoyée le ${formatDate(campagne.envoyeLe)}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/newsletter?apercu=${campagne.id}`}
                    className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                  >
                    Aperçu
                  </Link>
                  <form action={basculerStatutCampagne}>
                    <input type="hidden" name="id" value={campagne.id} />
                    <button
                      type="submit"
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {afficherStatut(campagne.statut) === "PRETE"
                        ? "Remettre en brouillon"
                        : "Marquer comme prête"}
                    </button>
                  </form>
                  <form action={envoyerCampagne}>
                    <input type="hidden" name="id" value={campagne.id} />
                    <button
                      type="submit"
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500"
                    >
                      {campagne.statut === "ENVOYEE"
                        ? "Renvoyer"
                        : `Envoyer (${actifs.length} actifs)`}
                    </button>
                  </form>
                  <form action={supprimerCampagne}>
                    <input type="hidden" name="id" value={campagne.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      Supprimer
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>

          {/* Aperçu personnalisé */}
          {campagneApercu && abonneApercu && (
            <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-indigo-900">
                  Aperçu personnalisé — {campagneApercu.titre}
                </h3>
                <Link href="/admin/newsletter" className="text-sm text-indigo-700 underline">
                  Fermer
                </Link>
              </div>

              {abonnes.length > 0 && (
                <form method="get" action="/admin/newsletter" className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="apercu" value={campagneApercu.id} />
                  <select
                    name="abonne"
                    defaultValue={abonneApercu.id}
                    className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm"
                  >
                    {abonnes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {((a.prenom || "") + " " + (a.nom || "")).trim() || a.email}
                        {a.actif ? "" : " (désabonné)"}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                  >
                    Voir pour cet abonné
                  </button>
                </form>
              )}
              {apercuExemple && (
                <p className="text-xs text-indigo-700">
                  Aucun abonné enregistré : aperçu avec des données d'exemple. Ajoutez des
                  abonnés ci-dessous pour un aperçu réel.
                </p>
              )}

              <div className="rounded-lg border bg-white p-4">
                <p className="text-sm text-gray-500">
                  Objet : <strong className="text-gray-900">{objetRendu}</strong>
                </p>
                <hr className="my-3" />
                <div className="whitespace-pre-wrap text-sm text-gray-800">{contenuRendu}</div>
              </div>

              <div className="text-xs text-indigo-700">
                <p className="break-all">
                  Lien désabonnement : {base}/newsletter/desabonnement/{abonneApercu.token}
                </p>
                <p className="break-all">
                  Lien préférences : {base}/newsletter/preferences/{abonneApercu.token}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Abonnés */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Abonnés ({abonnes.length} — dont {actifs.length} actifs)
          </h2>

          <form action={creerAbonne} className="rounded-xl border bg-white p-4">
            <p className="text-sm font-semibold text-gray-700">Ajouter un abonné</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <input
                name="email"
                type="email"
                required
                placeholder="E-mail *"
                className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
              />
              <input
                name="prenom"
                placeholder="Prénom"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                name="nom"
                placeholder="Nom"
                className="rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                Ajouter
              </button>
              <p className="text-xs text-gray-500">
                Les inscriptions du formulaire de la page d'accueil arrivent
                automatiquement dans cette liste (avec leur token de désabonnement).
              </p>
            </div>
          </form>

          {abonnes.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
              Aucun abonné pour l'instant : ajoutez-en un ci-dessus. Les personnes
              inscrites via le formulaire de la page d'accueil apparaîtront ici
              automatiquement.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">E-mail</th>
                    <th className="px-4 py-3">Prénom</th>
                    <th className="px-4 py-3">Nom</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Inscrit le</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {abonnes.map((abonne) => (
                    <tr key={abonne.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium text-gray-900">{abonne.email}</td>
                      <td className="px-4 py-3 text-gray-600">{abonne.prenom || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{abonne.nom || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            "rounded-full px-2.5 py-1 text-xs font-semibold " +
                            (abonne.actif
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-500")
                          }
                        >
                          {abonne.actif ? "Actif" : "Désabonné"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDate(abonne.creeLe)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={basculerAbonne}>
                            <input type="hidden" name="id" value={abonne.id} />
                            <button
                              type="submit"
                              className="rounded-lg border px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                            >
                              {abonne.actif ? "Désactiver" : "Réactiver"}
                            </button>
                          </form>
                          <Link
                            href={`/newsletter/preferences/${abonne.token}`}
                            className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 hover:bg-indigo-100"
                          >
                            Préférences
                          </Link>
                          <form action={supprimerAbonne}>
                            <input type="hidden" name="id" value={abonne.id} />
                            <button
                              type="submit"
                              className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700 hover:bg-red-100"
                            >
                              Supprimer
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
