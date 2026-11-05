// ═══════════════════════════════════════════════════════════════
// app/admin/newsletter/page.tsx
// Administration de la newsletter : liste des campagnes, création,
// changement de statut, suppression.
//
// ⚠️ UNE SEULE LIGNE À VÉRIFIER : l'import de « prisma » ci-dessous.
// Si ton projet importe le client Prisma depuis un autre chemin,
// garde TA ligne d'import actuelle à la place.
//
// Nécessite le modèle « CampagneNewsletter » dans le schéma (voir
// prisma/ajout-campagne-newsletter.prisma) puis « npx prisma db push ».
// Tant que ce n'est pas fait, cette page affiche les instructions
// au lieu de planter.
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
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

type ClientPrisma = Record<string, any>;

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

/* ── Actions serveur ──────────────────────────────────────────── */

async function creerCampagne(formData: FormData) {
  "use server";

  const titre = String(formData.get("titre") ?? "").trim();
  const objet = String(formData.get("objet") ?? "").trim();
  const contenu = String(formData.get("contenu") ?? "").trim();
  if (titre.length === 0 || objet.length === 0 || contenu.length === 0) return;

  const client = prisma as unknown as ClientPrisma;
  if (!client.campagneNewsletter) return;

  await client.campagneNewsletter
    .create({ data: { titre, objet, contenu, statut: "BROUILLON" } })
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

/* ── Styles partagés ──────────────────────────────────────────── */

const styleLabel = "block text-sm font-medium text-slate-700 mb-1";
const styleInput =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";
const styleBoutonPrimaire =
  "inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700";

/* ── Page ─────────────────────────────────────────────────────── */

export default async function PageNewsletterAdmin() {
  const client = prisma as unknown as ClientPrisma;

  // ── Garde-fou : modèle absent du client Prisma ────────────────
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
            1. Ajoute le modèle dans <strong>prisma/schema.prisma</strong>{" "}
            (fourni dans le dossier reçu). S&apos;il existe déjà sous un autre
            nom, envoie-le-moi.
          </p>
          <p className="mt-2">
            2. Arrête le serveur (Ctrl+C), puis exécute :
          </p>
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

  // ── Rendu ─────────────────────────────────────────────────────
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Newsletter</h1>
      <p className="mt-1 text-sm text-slate-500">
        {campagnes.length} campagne{campagnes.length > 1 ? "s" : ""}
      </p>

      {/* Formulaire de création */}
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
              placeholder="Texte de la newsletter…"
              className={styleInput}
            />
          </div>
          <div className="flex justify-end">
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
                  <div className="flex shrink-0 items-center gap-2">
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
                <div className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
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
    </main>
  );
}