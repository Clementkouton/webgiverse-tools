// ═══════════════════════════════════════════════════════════════
// app/admin/sponsors/page.tsx
// Administration des sponsors : liste, création, activation,
// suppression + gestion des catégories.
//
// ⚠️ UNE SEULE LIGNE À VÉRIFIER : l'import de « prismaClient »
// ci-dessous. Si ton projet importe le client Prisma depuis un
// autre chemin (par ex.  import prismaClient from "@/lib/prisma"),
// garde TA ligne d'import actuelle à la place.
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/* ── Types locaux ───────────────────────────────────────────────
   Volontairement indépendants du client Prisma généré : la page
   compile et affiche des instructions claires tant que la commande
   « npx prisma db push » n'a pas été relancée après modification
   du schéma. Plus jamais de TypeError « undefined » à l'écran.
   ─────────────────────────────────────────────────────────────── */

type CategorieAffichee = {
  id: string;
  nom: string;
  slug: string;
  _count?: { sponsors: number };
};

type SponsorAffiche = {
  id: string;
  nom: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  siteWeb: string | null;
  actif: boolean;
  ordre: number;
  creeLe: Date;
  categorie: { nom: string; slug: string } | null;
};

// Accès « souple » au client Prisma (évite les erreurs de
// compilation quand les types générés ne sont pas à jour).
type ClientPrisma = Record<string, any>;

/* ── Utilitaires ──────────────────────────────────────────────── */

const formateurDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function slugifier(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function slugUnique(slug: string, modele: any): Promise<string> {
  let candidat = slug.length > 0 ? slug : "element";
  let compteur = 2;
  // Tant que le slug existe déjà en base, on ajoute -2, -3, …
  while (true) {
    const existant = await modele.findFirst({
      where: { slug: candidat },
      select: { id: true },
    });
    if (!existant) {
      return candidat;
    }
    candidat = `${slug}-${compteur}`;
    compteur += 1;
  }
}

/* ── Actions serveur ──────────────────────────────────────────── */

async function creerCategorie(formData: FormData) {
  "use server";

  const nom = String(formData.get("nom") ?? "").trim();
  if (nom.length === 0) return;

  const client = prisma as unknown as ClientPrisma;
  if (!client.sponsorCategorie) return;

  const slug = await slugUnique(slugifier(nom), client.sponsorCategorie);
  try {
    await client.sponsorCategorie.create({ data: { nom, slug } });
  } catch {
    return; // nom déjà pris : on ne crée pas de doublon
  }
  revalidatePath("/admin/sponsors");
}

async function supprimerCategorie(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  if (id.length === 0) return;

  const client = prisma as unknown as ClientPrisma;
  if (!client.sponsorCategorie) return;

  // Les sponsors de cette catégorie ne sont pas supprimés :
  // ils passent simplement « sans catégorie » (onDelete: SetNull).
  await client.sponsorCategorie.delete({ where: { id } }).catch(() => null);
  revalidatePath("/admin/sponsors");
}

async function creerSponsor(formData: FormData) {
  "use server";

  const nom = String(formData.get("nom") ?? "").trim();
  if (nom.length === 0) return;

  const siteWeb = String(formData.get("siteWeb") ?? "").trim() || null;
  const logoUrl = String(formData.get("logoUrl") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const categorieId = String(formData.get("categorieId") ?? "").trim() || null;
  const actif = formData.get("actif") === "on";

  const client = prisma as unknown as ClientPrisma;
  if (!client.sponsor) return;

  const slug = await slugUnique(slugifier(nom), client.sponsor);
  try {
    await client.sponsor.create({
      data: { nom, slug, description, logoUrl, siteWeb, categorieId, actif },
    });
  } catch {
    return;
  }
  revalidatePath("/admin/sponsors");
}

async function basculerActivation(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  const actifActuel = String(formData.get("actif") ?? "") === "true";
  if (id.length === 0) return;

  const client = prisma as unknown as ClientPrisma;
  if (!client.sponsor) return;

  await client.sponsor
    .update({ where: { id }, data: { actif: !actifActuel } })
    .catch(() => null);
  revalidatePath("/admin/sponsors");
}

async function supprimerSponsor(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  if (id.length === 0) return;

  const client = prisma as unknown as ClientPrisma;
  if (!client.sponsor) return;

  await client.sponsor.delete({ where: { id } }).catch(() => null);
  revalidatePath("/admin/sponsors");
}

/* ── Styles partagés ──────────────────────────────────────────── */

const styleLabel = "block text-sm font-medium text-slate-700 mb-1";
const styleInput =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";
const styleBoutonPrimaire =
  "inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700";

/* ── Page ─────────────────────────────────────────────────────── */

export default async function PageSponsorsAdmin() {
  const client = prisma as unknown as ClientPrisma;

  // ── Garde-fou : client Prisma pas encore régénéré ─────────────
  // Si les modèles sponsors n'existent pas dans le client généré,
  // on affiche les instructions au lieu de laisser planter la page.
  if (!client.sponsor || !client.sponsorCategorie) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-bold text-slate-900">Sponsors</h1>
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
          <p className="font-semibold">
            Le client Prisma ne connaît pas encore les modèles « Sponsor » et
            « SponsorCategorie ».
          </p>
          <p className="mt-2">
            Le schéma a été modifié mais le client n&apos;a pas été régénéré.
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
      </main>
    );
  }

  // ── Données ───────────────────────────────────────────────────
  const [sponsorsBruts, categoriesBrutes] = await Promise.all([
    client.sponsor.findMany({
      include: { categorie: { select: { nom: true, slug: true } } },
      orderBy: [{ ordre: "asc" }, { creeLe: "desc" }],
    }),
    client.sponsorCategorie.findMany({
      include: { _count: { select: { sponsors: true } } },
      orderBy: { nom: "asc" },
    }),
  ]);

  const sponsors = sponsorsBruts as SponsorAffiche[];
  const categories = categoriesBrutes as CategorieAffichee[];

  // ── Rendu ─────────────────────────────────────────────────────
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sponsors</h1>
          <p className="mt-1 text-sm text-slate-500">
            {sponsors.length} sponsor{sponsors.length > 1 ? "s" : ""} ·{" "}
            {categories.length} catégorie{categories.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Formulaire de création */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Ajouter un sponsor
        </h2>
        <form
          action={creerSponsor}
          className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <div>
            <label htmlFor="nom" className={styleLabel}>
              Nom *
            </label>
            <input
              id="nom"
              name="nom"
              required
              placeholder="Ex. TechCorp"
              className={styleInput}
            />
          </div>
          <div>
            <label htmlFor="categorieId" className={styleLabel}>
              Catégorie
            </label>
            <select
              id="categorieId"
              name="categorieId"
              className={styleInput}
              defaultValue=""
            >
              <option value="">— Aucune —</option>
              {categories.map((categorie) => (
                <option key={categorie.id} value={categorie.id}>
                  {categorie.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="siteWeb" className={styleLabel}>
              Site web
            </label>
            <input
              id="siteWeb"
              name="siteWeb"
              type="url"
              placeholder="https://exemple.com"
              className={styleInput}
            />
          </div>
          <div>
            <label htmlFor="logoUrl" className={styleLabel}>
              Logo (URL de l&apos;image)
            </label>
            <input
              id="logoUrl"
              name="logoUrl"
              type="url"
              placeholder="https://exemple.com/logo.png"
              className={styleInput}
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="description" className={styleLabel}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Quelques mots sur ce sponsor…"
              className={styleInput}
            />
          </div>
          <div className="flex items-center justify-between gap-4 md:col-span-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="actif"
                defaultChecked
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              Sponsor actif (visible publiquement)
            </label>
            <button type="submit" className={styleBoutonPrimaire}>
              Ajouter le sponsor
            </button>
          </div>
        </form>
      </section>

      {/* Liste des sponsors */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Liste des sponsors
        </h2>
        {sponsors.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Aucun sponsor pour l&apos;instant. Utilise le formulaire
            ci-dessus pour en ajouter un.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Sponsor</th>
                  <th className="px-4 py-3">Catégorie</th>
                  <th className="px-4 py-3">Site web</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Ajouté le</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sponsors.map((sponsor) => (
                  <tr key={sponsor.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {sponsor.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={sponsor.logoUrl}
                            alt={`Logo de ${sponsor.nom}`}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-700">
                            {sponsor.nom.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div>
                          <p className="font-medium text-slate-900">
                            {sponsor.nom}
                          </p>
                          <p className="text-xs text-slate-400">
                            /{sponsor.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {sponsor.categorie ? (
                        <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                          {sponsor.categorie.nom}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {sponsor.siteWeb ? (
                        <a
                          href={sponsor.siteWeb}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline"
                        >
                          {sponsor.siteWeb.replace(/^https?:\/\//, "")}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <form action={basculerActivation}>
                        <input type="hidden" name="id" value={sponsor.id} />
                        <input
                          type="hidden"
                          name="actif"
                          value={sponsor.actif ? "true" : "false"}
                        />
                        <button
                          type="submit"
                          className={
                            sponsor.actif
                              ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                              : "inline-flex rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-300"
                          }
                        >
                          {sponsor.actif ? "Actif" : "Inactif"}
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formateurDate.format(new Date(sponsor.creeLe))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={supprimerSponsor}>
                        <input type="hidden" name="id" value={sponsor.id} />
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
      </section>

      {/* Catégories */}
      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Catégories de sponsors
        </h2>
        <form action={creerCategorie} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1">
            <label htmlFor="categorie-nom" className={styleLabel}>
              Nom de la catégorie
            </label>
            <input
              id="categorie-nom"
              name="nom"
              required
              placeholder="Ex. Partenaires Or"
              className={styleInput}
            />
          </div>
          <button type="submit" className={styleBoutonPrimaire}>
            Ajouter la catégorie
          </button>
        </form>

        {categories.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Aucune catégorie pour l&apos;instant.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100">
            {categories.map((categorie) => (
              <li
                key={categorie.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{categorie.nom}</p>
                  <p className="text-xs text-slate-400">
                    /{categorie.slug} · {categorie._count?.sponsors ?? 0}{" "}
                    sponsor(s)
                  </p>
                </div>
                <form action={supprimerCategorie}>
                  <input type="hidden" name="id" value={categorie.id} />
                  <button
                    type="submit"
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Supprimer
                  </button>
                </form>
              </li>
            ))}
            </ul>
        )}
        <p className="mt-3 text-xs text-slate-400">
          Supprimer une catégorie ne supprime pas ses sponsors : ils passent
          simplement « sans catégorie ».
        </p>
      </section>
    </main>
  );
}