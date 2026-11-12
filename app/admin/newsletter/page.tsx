// ═══════════════════════════════════════════════════════════════
// app/admin/newsletter/page.tsx
// Administration de la newsletter : campagnes, abonnés, aperçu
// personnalisé et envoi réel — MÊME STYLE que /admin/sponsors
// (cartes blanches rounded-2xl, accent indigo, tableaux slate-50).
//
// ⚠️ UNE SEULE LIGNE À VÉRIFIER : l'import de « prisma » ci-dessous.
// Si ton projet importe le client Prisma depuis un autre chemin,
// garde TA ligne d'import actuelle à la place.
// ═══════════════════════════════════════════════════════════════

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

/* ── Utilitaires ──────────────────────────────────────────────── */

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

const formateurDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

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

/* ── Actions serveur ──────────────────────────────────────────── */

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
  const campagne = await client.campagneNewsletter?.findUnique({ where: { id } });
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
  const existant = await client.abonneNewsletter.findUnique({ where: { email } });
  if (existant) {
    await client.abonneNewsletter.update({
      where: { email },
      data: {
        prenom: prenom || existant.prenom,
        nom: nom || existant.nom,
      },
    });
  } else {
    await client.abonneNewsletter.create({
      data: { email, prenom: prenom || null, nom: nom || null },
    });
  }
  revalidatePath("/admin/newsletter");
  redirect("/admin/newsletter");
}

async function basculerAbonne(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  const client = prisma as ClientPrisma;
  const abonne = await client.abonneNewsletter?.findUnique({ where: { id } });
  if (abonne) {
    const actif = !abonne.actif;
    await client.abonneNewsletter.update({
      where: { id },
      data: { actif, desabonneLe: actif ? null : new Date() },
    });
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

/* ── Styles partagés (identiques à /admin/sponsors) ───────────── */

const styleLabel = "block text-sm font-medium text-slate-700 mb-1";
const styleInput =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";
const styleBoutonPrimaire =
  "inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700";
const styleBoutonSecondaire =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50";
const styleBoutonSupprimer =
  "rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50";

/* ── Page ─────────────────────────────────────────────────────── */

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
  let erreurChargement = "";

  if (!modeleManquant) {
    try {
      campagnes = (await client.campagneNewsletter.findMany({
        orderBy: { creeLe: "desc" },
      })) as Campagne[];
      abonnes = (await client.abonneNewsletter.findMany({
        orderBy: { creeLe: "desc" },
      })) as Abonne[];
    } catch (erreur: any) {
      erreurChargement =
        "Lecture impossible : " +
        (erreur?.message || "erreur inconnue") +
        " — si vous venez d'ajouter les modèles, exécutez « npx prisma db push » puis redémarrez le serveur.";
    }
  }

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
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* ── En-tête (même présentation que Sponsors) ─────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Newsletter</h1>
          <p className="mt-1 text-sm text-slate-500">
            {campagnes.length} campagne{campagnes.length > 1 ? "s" : ""} ·{" "}
            {actifs.length} abonné{actifs.length > 1 ? "s" : ""} actif
            {actifs.length > 1 ? "s" : ""} · {abonnes.length - actifs.length}{" "}
            désabonné{abonnes.length - actifs.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* ── Message de retour (création / ajout / envoi) ─────────── */}
      {messageEnvoi && (
        <div
          className={
            "mt-6 rounded-xl border p-4 text-sm " +
            (messageEnvoi.startsWith("Erreur")
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-emerald-300 bg-emerald-50 text-emerald-800")
          }
        >
          {messageEnvoi}
        </div>
      )}

      {/* ── Garde-fou : client Prisma pas encore régénéré ────────── */}
      {(modeleManquant || erreurChargement) && (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
          <p className="font-semibold">
            La newsletter n&apos;est pas encore opérationnelle.
          </p>
          {modeleManquant && (
            <p className="mt-2">
              Modèle(s) manquant(s) dans votre client Prisma :{" "}
              <strong>{modeleManquant}</strong>.
            </p>
          )}
          {erreurChargement && <p className="mt-2">{erreurChargement}</p>}
          <p className="mt-2">
            Arrête le serveur de développement (Ctrl+C), puis exécute :
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm leading-6 text-slate-100">
            {"npx prisma format\nnpx prisma db push"}
          </pre>
          <p className="mt-3">Puis relance le serveur :</p>
          <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm leading-6 text-slate-100">
            npm run dev
          </pre>
        </div>
      )}

      {/* ── Statistiques ─────────────────────────────────────────── */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Campagnes</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{campagnes.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Abonnés actifs</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{actifs.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Désabonnés</p>
          <p className="mt-1 text-2xl font-bold text-slate-400">
            {abonnes.length - actifs.length}
          </p>
        </div>
      </div>

      {/* ── Formulaire de création de campagne ───────────────────── */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Créer une campagne</h2>
        <form action={creerCampagne} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="titre" className={styleLabel}>
              Titre interne *
            </label>
            <input
              id="titre"
              name="titre"
              required
              placeholder="Ex. NL-2026-11"
              className={styleInput}
            />
          </div>
          <div>
            <label htmlFor="objet" className={styleLabel}>
              Objet de l&apos;e-mail *
            </label>
            <input
              id="objet"
              name="objet"
              required
              placeholder="Ex. Les nouveaux outils de novembre"
              className={styleInput}
            />
          </div>
          <div>
            <label htmlFor="lienArticle" className={styleLabel}>
              Lien de l&apos;article (pour {"{{lien_article}}"})
            </label>
            <input
              id="lienArticle"
              name="lienArticle"
              type="url"
              placeholder="https://…"
              className={styleInput}
            />
          </div>
          <div>
            <label htmlFor="nomEntreprise" className={styleLabel}>
              Nom de l&apos;entreprise (pour {"{{nom_entreprise}}"})
            </label>
            <input
              id="nomEntreprise"
              name="nomEntreprise"
              placeholder="Ex. Webgiverse"
              className={styleInput}
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="contenu" className={styleLabel}>
              Contenu de l&apos;e-mail *
            </label>
            <textarea
              id="contenu"
              name="contenu"
              required
              rows={10}
              placeholder="Collez votre texte ici — les variables {{…}} seront remplacées automatiquement pour chaque abonné."
              className={`${styleInput} font-mono`}
            />
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-slate-400">
              Variables remplacées automatiquement pour chaque abonné :{" "}
              <code>{"{{prénom}}"}</code>, <code>{"{{nom}}"}</code>,{" "}
              <code>{"{{email}}"}</code>, <code>{"{{nom_entreprise}}"}</code>,{" "}
              <code>{"{{lien_article}}"}</code>, <code>{"{{lien_desabonnement}}"}</code>,{" "}
              <code>{"{{lien_preferences}}"}</code>, <code>{"{{date}}"}</code>. Si le
              contenu ne contient pas <code>{"{{lien_desabonnement}}"}</code>, un pied
              de page avec les liens est ajouté automatiquement à l&apos;envoi.
            </p>
          </div>
          <div className="flex items-center justify-end md:col-span-2">
            <button type="submit" className={styleBoutonPrimaire}>
              Créer la campagne
            </button>
          </div>
        </form>
      </section>

      {/* ── Liste des campagnes ──────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Liste des campagnes
        </h2>

        {campagnes.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Aucune campagne pour l&apos;instant. Utilise le formulaire
            ci-dessus pour en créer une.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {campagnes.map((campagne) => (
              <article
                key={campagne.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{campagne.titre}</p>
                    <p className="text-xs text-slate-400">{campagne.objet}</p>
                  </div>
                  <span
                    className={
                      "inline-flex rounded-[7px] -skew-x-[18deg] px-2.5 py-0.5 text-xs font-medium " +
                      (campagne.statut === "ENVOYEE"
                        ? "bg-emerald-100 text-emerald-700"
                        : campagne.statut === "PRETE"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-200 text-slate-600")
                    }
                  >
                    {campagne.statut}
                  </span>
                </div>

                <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm text-slate-500">
                  {campagne.contenu.slice(0, 300)}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Créée le {formateurDate.format(new Date(campagne.creeLe))}
                  {campagne.envoyeLe
                    ? ` · Envoyée le ${formateurDate.format(new Date(campagne.envoyeLe))}`
                    : ""}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/newsletter?apercu=${campagne.id}`}
                    className="inline-flex items-center justify-center rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
                  >
                    Aperçu
                  </Link>
                  <form action={basculerStatutCampagne}>
                    <input type="hidden" name="id" value={campagne.id} />
                    <button type="submit" className={styleBoutonSecondaire}>
                      {campagne.statut === "PRETE"
                        ? "Remettre en brouillon"
                        : "Marquer comme prête"}
                    </button>
                  </form>
                  <form action={envoyerCampagne}>
                    <input type="hidden" name="id" value={campagne.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                    >
                      {campagne.statut === "ENVOYEE"
                        ? "Renvoyer"
                        : `Envoyer (${actifs.length} actif${actifs.length > 1 ? "s" : ""})`}
                    </button>
                  </form>
                  <form action={supprimerCampagne}>
                    <input type="hidden" name="id" value={campagne.id} />
                    <button type="submit" className={styleBoutonSupprimer}>
                      Supprimer
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* ── Aperçu personnalisé ────────────────────────────────── */}
        {campagneApercu && abonneApercu && (
          <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-slate-900">
                Aperçu personnalisé — {campagneApercu.titre}
              </h3>
              <Link
                href="/admin/newsletter"
                className="text-sm text-indigo-600 hover:underline"
              >
                Fermer
              </Link>
            </div>

            {abonnes.length > 0 && (
              <form
                method="get"
                action="/admin/newsletter"
                className="mt-4 flex flex-wrap items-end gap-3"
              >
                <input type="hidden" name="apercu" value={campagneApercu.id} />
                <div className="min-w-[14rem] flex-1">
                  <label htmlFor="abonne-apercu" className={styleLabel}>
                    Voir le rendu pour cet abonné
                  </label>
                  <select
                    id="abonne-apercu"
                    name="abonne"
                    defaultValue={abonneApercu.id}
                    className={styleInput}
                  >
                    {abonnes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {((a.prenom || "") + " " + (a.nom || "")).trim() || a.email}
                        {a.actif ? "" : " (désabonné)"}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className={styleBoutonPrimaire}
                >
                  Afficher l&apos;aperçu
                </button>
              </form>
            )}
            {apercuExemple && (
              <p className="mt-2 text-xs text-indigo-700">
                Aucun abonné enregistré : aperçu avec des données d&apos;exemple.
              </p>
            )}

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">
                Objet : <strong className="text-slate-900">{objetRendu}</strong>
              </p>
              <hr className="my-3 border-slate-100" />
              <div className="whitespace-pre-wrap text-sm text-slate-800">
                {contenuRendu}
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              <p className="break-all">
                Lien désabonnement :{" "}
                <span className="font-mono text-indigo-600">
                  {base}/newsletter/desabonnement/{abonneApercu.token}
                </span>
              </p>
              <p className="break-all">
                Lien préférences :{" "}
                <span className="font-mono text-indigo-600">
                  {base}/newsletter/preferences/{abonneApercu.token}
                </span>
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── Abonnés ──────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">
          Abonnés ({abonnes.length} — dont {actifs.length} actif
          {actifs.length > 1 ? "s" : ""})
        </h2>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">
            Ajouter un abonné
          </h3>
          <form action={creerAbonne} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label htmlFor="email-abonne" className={styleLabel}>
                E-mail *
              </label>
              <input
                id="email-abonne"
                name="email"
                type="email"
                required
                placeholder="Ex. abonne@exemple.com"
                className={styleInput}
              />
            </div>
            <div>
              <label htmlFor="prenom-abonne" className={styleLabel}>
                Prénom
              </label>
              <input
                id="prenom-abonne"
                name="prenom"
                placeholder="Ex. Awa"
                className={styleInput}
              />
            </div>
            <div>
              <label htmlFor="nom-abonne" className={styleLabel}>
                Nom
              </label>
              <input
                id="nom-abonne"
                name="nom"
                placeholder="Ex. Koné"
                className={styleInput}
              />
            </div>
            <div className="flex items-center justify-between gap-4 md:col-span-4">
              <p className="text-xs text-slate-400">
                Les visiteurs s&apos;inscrivent eux-mêmes via le formulaire de
                newsletter de la page d&apos;accueil.
              </p>
              <button type="submit" className={styleBoutonPrimaire}>
                Ajouter
              </button>
            </div>
          </form>
        </section>

        {abonnes.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Aucun abonné pour l&apos;instant. Les inscriptions de la page
            d&apos;accueil apparaîtront ici automatiquement.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Prénom</th>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Inscrit le</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {abonnes.map((abonne) => (
                  <tr key={abonne.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {abonne.email}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{abonne.prenom || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{abonne.nom || "—"}</td>
                    <td className="px-4 py-3">
                      <form action={basculerAbonne}>
                        <input type="hidden" name="id" value={abonne.id} />
                        <button
                          type="submit"
                          className={
                            abonne.actif
                              ? "inline-flex rounded-[7px] -skew-x-[18deg] bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                              : "inline-flex rounded-[7px] -skew-x-[18deg] bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-300"
                          }
                        >
                          {abonne.actif ? "Actif" : "Désabonné"}
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formateurDate.format(new Date(abonne.creeLe))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          href={`/newsletter/preferences/${abonne.token}`}
                          className="text-indigo-600 hover:underline"
                        >
                          Préférences
                        </Link>
                        <form action={supprimerAbonne}>
                          <input type="hidden" name="id" value={abonne.id} />
                          <button type="submit" className={styleBoutonSupprimer}>
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
    </main>
  );
}