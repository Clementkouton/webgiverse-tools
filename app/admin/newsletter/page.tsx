// ═══════════════════════════════════════════════════════════════
// app/admin/newsletter/page.tsx
// Administration de la newsletter :
//  - liste des campagnes, création (avec pied de page
//    {{lien_desabonnement}} / {{lien_preferences}} automatique),
//  - changement de statut, suppression,
//  - liste des abonnés avec lien personnel de désabonnement,
//    ajout, désabonnement/réabonnement, suppression.
//
// ⚠️ UNE SEULE LIGNE À VÉRIFIER : l'import de « prisma » ci-dessous.
// Si ton projet importe le client Prisma depuis un autre chemin,
// garde TA ligne d'import actuelle à la place.
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/* ── Types locaux ─────────────────────────────────────────────── */

type CampagneAffichee = {
  id: string;
  titre: string;
  objet: string;
  contenu: string;
  statut: string;
  envoyeLe: Date | null;
  creeLe: Date;
};

type AbonneAffiche = {
  id: string;
  email: string;
  nom: string | null;
  token: string;
  statut: string;
  creeLe: Date;
};

type ClientPrisma = Record<string, any>;

/* ── Pied de page type des e-mails ────────────────────────────── */

const PIED_DE_PAGE = [
  "——————————————————",
  "Vous recevez cet e-mail car vous êtes inscrit à la newsletter.",
  "Se désabonner : {{lien_desabonnement}}",
  "Mettre à jour vos préférences : {{lien_preferences}}",
].join("\n");

function contientPiedDePage(contenu: string): boolean {
  return contenu.includes("{{lien_desabonnement}}");
}

/* ── Utilitaires ──────────────────────────────────────────────── */

const formateurDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function classeDuStatut(statut: string): string {
  if (statut === "PRETA") {
    return "inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700";
  }
  if (statut === "ENVOYEE") {
    return "inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700";
  }
  return "inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700";
}

function libelleDuStatut(statut: string): string {
  if (statut === "PRETA") return "Prête";
  if (statut === "ENVOYEE") return "Envoyée";
  return "Brouillon";
}

function estEmailValide(email: string): boolean {
  return /.+@.+\..+/.test(email);
}

/* ── Actions serveur : campagnes ──────────────────────────────── */

async function creerCampagne(formData: FormData) {
  "use server";

  const titre = String(formData.get("titre") ?? "").trim();
  const objet = String(formData.get("objet") ?? "").trim();
  const contenu = String(formData.get("contenu") ?? "").trim();
  if (titre.length === 0 || objet.length === 0 || contenu.length === 0) return;

  const avecPiedDePage = formData.get("piedDePage") === "on";
  const contenuFinal = avecPiedDePage
    ? `${contenu}\n\n${PIED_DE_PAGE}`
    : contenu;

  const client = prisma as unknown as ClientPrisma;
  if (!client.campagneNewsletter) return;

  await client.campagneNewsletter
    .create({ data: { titre, objet, contenu: contenuFinal, statut: "BROUILLON" } })
    .catch(() => null);
  revalidatePath("/admin/newsletter");
}

async function ajouterPiedDePage(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  if (id.length === 0) return;

  const client = prisma as unknown as ClientPrisma;
  if (!client.campagneNewsletter) return;

  const campagne = await client.campagneNewsletter
    .findUnique({ where: { id }, select: { contenu: true } })
    .catch(() => null);
  if (!campagne || contientPiedDePage(String(campagne.contenu))) return;

  await client.campagneNewsletter
    .update({
      where: { id },
      data: { contenu: `${String(campagne.contenu)}\n\n${PIED_DE_PAGE}` },
    })
    .catch(() => null);
  revalidatePath("/admin/newsletter");
}

async function basculerStatutCampagne(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  const statutActuel = String(formData.get("statut") ?? "");
  if (id.length === 0) return;

  const client = prisma as unknown as ClientPrisma;
  if (!client.campagneNewsletter) return;

  const nouveauStatut = statutActuel === "PRETA" ? "BROUILLON" : "PRETA";
  await client.campagneNewsletter
    .update({ where: { id }, data: { statut: nouveauStatut } })
    .catch(() => null);
  revalidatePath("/admin/newsletter");
}

async function supprimerCampagne(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  if (id.length === 0) return;

  const client = prisma as unknown as ClientPrisma;
  if (!client.campagneNewsletter) return;

  await client.campagneNewsletter.delete({ where: { id } }).catch(() => null);
  revalidatePath("/admin/newsletter");
}

/* ── Actions serveur : abonnés ────────────────────────────────── */

async function creerAbonne(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nom = String(formData.get("nom") ?? "").trim() || null;
  if (!estEmailValide(email)) return;

  const client = prisma as unknown as ClientPrisma;
  if (!client.abonneNewsletter) return;

  const existant = await client.abonneNewsletter
    .findUnique({ where: { email } })
    .catch(() => null);
  if (existant) return;

  await client.abonneNewsletter
    .create({ data: { email, nom, statut: "ABONNE" } })
    .catch(() => null);
  revalidatePath("/admin/newsletter");
}

async function basculerStatutAbonne(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  const statutActuel = String(formData.get("statut") ?? "");
  if (id.length === 0) return;

  const client = prisma as unknown as ClientPrisma;
  if (!client.abonneNewsletter) return;

  const nouveauStatut = statutActuel === "DESABONNE" ? "ABONNE" : "DESABONNE";
  await client.abonneNewsletter
    .update({ where: { id }, data: { statut: nouveauStatut } })
    .catch(() => null);
  revalidatePath("/admin/newsletter");
}

async function supprimerAbonne(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  if (id.length === 0) return;

  const client = prisma as unknown as ClientPrisma;
  if (!client.abonneNewsletter) return;

  await client.abonneNewsletter.delete({ where: { id } }).catch(() => null);
  revalidatePath("/admin/newsletter");
}

/* ── Styles partagés ──────────────────────────────────────────── */

const styleLabel = "block text-sm font-medium text-slate-700 mb-1";
const styleInput =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";
const styleBoutonPrimaire =
  "inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700";

/* ── Page ─────────────────────────────────────────────────────── */

export default async function PageNewsletterAdmin() {
  const client = prisma as unknown as ClientPrisma;

  // ── Garde-fou : modèle des campagnes absent ───────────────────
  if (!client.campagneNewsletter) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-bold text-slate-900">Newsletter</h1>
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
          <p className="font-semibold">
            Le client Prisma ne connaît pas encore le modèle
            « CampagneNewsletter ».
          </p>
          <p className="mt-2">
            1. Ajoute les modèles dans <strong>prisma/schema.prisma</strong>{" "}
            (blocs fournis dans le dossier reçu).
          </p>
          <p className="mt-2">2. Arrête le serveur (Ctrl+C), puis exécute :</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm leading-6 text-slate-100">
            {"npx prisma format\nnpx prisma db push"}
          </pre>
          <p className="mt-3">3. Relance le serveur :</p>
          <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm leading-6 text-slate-100">
            npm run dev
          </pre>
        </div>
      </main>
    );
  }

  // ── Données ───────────────────────────────────────────────────
  const campagnesBrutes = await client.campagneNewsletter.findMany({
    orderBy: { creeLe: "desc" },
    take: 50,
  });
  const campagnes = campagnesBrutes as CampagneAffichee[];

  // Les abonnés sont optionnels : la page fonctionne même si le
  // modèle AbonneNewsletter n'est pas encore dans le schéma.
  const abonnesDisponibles = Boolean(client.abonneNewsletter);
  let abonnes: AbonneAffiche[] = [];
  if (abonnesDisponibles) {
    const abonnesBruts = await client.abonneNewsletter.findMany({
      orderBy: { creeLe: "desc" },
      take: 200,
    });
    abonnes = abonnesBruts as AbonneAffiche[];
  }

  // URL du site, pour afficher le lien personnel de chaque abonné
  const entetes = await headers();
  const hote = entetes.get("host") ?? "localhost:3000";
  const protocole =
    hote.startsWith("localhost") || hote.startsWith("127.0.0.1")
      ? "http"
      : "https";
  const urlSite = `${protocole}://${hote}`;

  const abonnesActifs = abonnes.filter((a) => a.statut === "ABONNE").length;

  // ── Rendu ─────────────────────────────────────────────────────
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Newsletter</h1>
      <p className="mt-1 text-sm text-slate-500">
        {campagnes.length} campagne{campagnes.length > 1 ? "s" : ""} ·{" "}
        {abonnes.length} abonné{abonnes.length > 1 ? "s" : ""} (
        {abonnesActifs} actif{abonnesActifs > 1 ? "s" : ""})
      </p>

      {/* Variables disponibles */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">
          Variables à placer dans le contenu d&apos;une campagne
        </p>
        <ul className="mt-2 space-y-1">
          <li>
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-indigo-700">
              {"{{lien_desabonnement}}"}
            </code>{" "}
            — lien personnel de désabonnement de chaque abonné.
          </li>
          <li>
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-indigo-700">
              {"{{lien_preferences}}"}
            </code>{" "}
            — lien pour gérer son abonnement (préférences, réabonnement).
          </li>
        </ul>
        <p className="mt-2 text-xs text-slate-400">
          Les deux liens mènent à la page publique <code>/desabonnement</code>{" "}
          de ton site, identifiée par le jeton unique de l&apos;abonné.
        </p>
      </div>

      {/* Nouvelle campagne */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Nouvelle campagne
        </h2>
        <form action={creerCampagne} className="mt-4 space-y-4">
          <div>
            <label htmlFor="titre" className={styleLabel}>
              Titre interne *
            </label>
            <input
              id="titre"
              name="titre"
              required
              placeholder="Ex. Nouveautés de novembre"
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
              placeholder="Ex. Découvrez nos nouveautés"
              className={styleInput}
            />
          </div>
          <div>
            <label htmlFor="contenu" className={styleLabel}>
              Contenu *
            </label>
            <textarea
              id="contenu"
              name="contenu"
              rows={6}
              required
              placeholder="Texte de la newsletter… Tu peux y placer les variables {{lien_desabonnement}} et {{lien_preferences}}."
              className={styleInput}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="piedDePage"
                defaultChecked
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              Ajouter automatiquement le pied de page avec les liens de
              désabonnement et de préférences
            </label>
            <button type="submit" className={styleBoutonPrimaire}>
              Créer la campagne
            </button>
          </div>
        </form>
      </section>

      {/* Liste des campagnes */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Campagnes récentes
        </h2>
        {campagnes.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Aucune campagne pour l&apos;instant. Crée ta première campagne
            avec le formulaire ci-dessus.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {campagnes.map((campagne) => (
              <li
                key={campagne.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {campagne.titre}
                      </h3>
                      <span className={classeDuStatut(campagne.statut)}>
                        {libelleDuStatut(campagne.statut)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      Objet : {campagne.objet}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {!contientPiedDePage(campagne.contenu) && (
                      <form action={ajouterPiedDePage}>
                        <input type="hidden" name="id" value={campagne.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
                        >
                          Ajouter le pied de page
                        </button>
                      </form>
                    )}
                    {campagne.statut !== "ENVOYEE" && (
                      <form action={basculerStatutCampagne}>
                        <input type="hidden" name="id" value={campagne.id} />
                        <input
                          type="hidden"
                          name="statut"
                          value={campagne.statut}
                        />
                        <button
                          type="submit"
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          {campagne.statut === "PRETA"
                            ? "Remettre en brouillon"
                            : "Marquer prête"}
                        </button>
                      </form>
                    )}
                    <form action={supprimerCampagne}>
                      <input type="hidden" name="id" value={campagne.id} />
                      <button
                        type="submit"
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        Supprimer
                      </button>
                    </form>
                  </div>
                </div>
                <div className="mt-3 max-h-40 overflow-y-auto whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  {campagne.contenu}
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Créée le {formateurDate.format(new Date(campagne.creeLe))}
                  {campagne.envoyeLe
                    ? ` · Envoyée le ${formateurDate.format(
                        new Date(campagne.envoyeLe)
                      )}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Abonnés */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">
          Abonnés ({abonnes.length})
        </h2>

        {!abonnesDisponibles ? (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
            <p className="font-semibold">
              Le modèle « AbonneNewsletter » n&apos;est pas encore dans ton
              schéma.
            </p>
            <p className="mt-2">
              Pour gérer les désabonnements et les préférences, ajoute le
              bloc <code>model AbonneNewsletter</code> (fourni dans le
              dossier reçu) puis exécute{" "}
              <code>npx prisma db push</code> et redémarre le serveur.
            </p>
          </div>
        ) : (
          <>
            {/* Ajout manuel d'un abonné */}
            <form
              action={creerAbonne}
              className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="min-w-[14rem] flex-1">
                <label htmlFor="abonne-email" className={styleLabel}>
                  E-mail *
                </label>
                <input
                  id="abonne-email"
                  name="email"
                  type="email"
                  required
                  placeholder="Ex. abonne@exemple.com"
                  className={styleInput}
                />
              </div>
              <div className="min-w-[10rem] flex-1">
                <label htmlFor="abonne-nom" className={styleLabel}>
                  Nom
                </label>
                <input
                  id="abonne-nom"
                  name="nom"
                  placeholder="Ex. Claire Dupont"
                  className={styleInput}
                />
              </div>
              <button type="submit" className={styleBoutonPrimaire}>
                Ajouter l&apos;abonné
              </button>
            </form>

            {abonnes.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                Aucun abonné pour l&apos;instant.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Abonné</th>
                      <th className="px-4 py-3">Lien personnel</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3">Inscrit le</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {abonnes.map((abonne) => (
                      <tr key={abonne.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">
                            {abonne.email}
                          </p>
                          <p className="text-xs text-slate-400">
                            {abonne.nom ?? "—"}
                          </p>
                        </td>
                        <td className="max-w-56 px-4 py-3">
                          <code className="block truncate rounded bg-slate-50 px-2 py-1 text-xs text-slate-500">
                            {urlSite}/desabonnement?token={abonne.token}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <form action={basculerStatutAbonne}>
                            <input type="hidden" name="id" value={abonne.id} />
                            <input
                              type="hidden"
                              name="statut"
                              value={abonne.statut}
                            />
                            <button
                              type="submit"
                              className={
                                abonne.statut === "ABONNE"
                                  ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                                  : "inline-flex rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-300"
                              }
                            >
                              {abonne.statut === "ABONNE"
                                ? "Abonné"
                                : "Désabonné"}
                            </button>
                          </form>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {formateurDate.format(new Date(abonne.creeLe))}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <form action={supprimerAbonne}>
                            <input type="hidden" name="id" value={abonne.id} />
                            <button
                              type="submit"
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                            >
                              Supprimer
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}