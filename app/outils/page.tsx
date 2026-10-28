import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import CarteOutilView from "@/components/outil/carte-outil";

/* ===================================================================== */
/*  MÉTADONNÉES                                                          */
/* ===================================================================== */

export const metadata = {
  title: "Tous les outils IA — Webgiverse",
  description:
    "Explore tout le catalogue d'outils et d'agents IA : filtre par type, prix, catégorie ou licence open source.",
};

/* ===================================================================== */
/*  TYPES ET HELPERS                                                     */
/* ===================================================================== */

type ParametresRecherche = Promise<Record<string, string | string[] | undefined>>;

type CategorieFiltre = { id: string; nom: string; slug: string };

type OutilCarte = {
  id: string;
  nom: string;
  slug: string;
  logo: string | null;
  description: string;
  tarif: string | null;
  gratuit: boolean;
  openSource: boolean;
  type: string;
  verifieLe?: Date | string | null;
};

type ClientCategories = {
  category?: { findMany: (args: { orderBy: { nom: "asc" } }) => Promise<CategorieFiltre[]> };
  categorie?: { findMany: (args: { orderBy: { nom: "asc" } }) => Promise<CategorieFiltre[]> };
};

function texte(valeur: string | string[] | undefined): string {
  return typeof valeur === "string" ? valeur.trim() : "";
}

/* ===================================================================== */
/*  PAGE                                                                 */
/* ===================================================================== */

export default async function PageOutils({ searchParams }: { searchParams: ParametresRecherche }) {
  const params = await searchParams;

  const q = texte(params.q);
  const typeBrut = texte(params.type);
  const type = typeBrut === "OUTIL" || typeBrut === "AGENT" ? typeBrut : undefined;
  const categorie = texte(params.categorie);
  const gratuit = texte(params.gratuit) === "1";
  const openSource = texte(params.openSource) === "1";

  /* ---------- Filtres scalaires ---------- */

  const whereScalaires: Prisma.ToolWhereInput = { statut: "PUBLIE" };

  if (q) {
    whereScalaires.OR = [
      { nom: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (type) whereScalaires.type = type;
  if (gratuit) whereScalaires.gratuit = true;
  if (openSource) whereScalaires.openSource = true;

  /* ---------- Filtre par catégorie (Tool → categorie → Category) ---------- */

  const whereComplet: Prisma.ToolWhereInput = { ...whereScalaires };
  if (categorie) {
    whereComplet.categories = { some: { categorie: { slug: categorie } } };
  }

  /* ---------- Requête principale ---------- */

  type OutilBrut = {
    id: string;
    nom: string;
    slug: string;
    logo: string | null;
    description: string | null;
    tarif: string | null;
    gratuit: boolean;
    openSource: boolean;
    type: string;
    verifieLe: Date | null;
  };

  let outilsBruts: OutilBrut[] = [];

  try {
    outilsBruts = (await prisma.tool.findMany({
      where: whereComplet,
      orderBy: { nom: "asc" },
    })) as unknown as OutilBrut[];
  } catch {
    // Repli : si la relation « categories » porte un autre nom dans ton schéma
    outilsBruts = (await prisma.tool.findMany({
      where: whereScalaires,
      orderBy: { nom: "asc" },
    })) as unknown as OutilBrut[];
  }

  /* ---------- Liste des catégories pour le menu déroulant ---------- */

  let categories: CategorieFiltre[] = [];
  try {
    // Le modèle peut s'appeler « Category » ou « Categorie » selon le schéma
    const client = prisma as unknown as ClientCategories;
    const modeleCategories = client.category ?? client.categorie;
    if (modeleCategories) {
      categories = await modeleCategories.findMany({ orderBy: { nom: "asc" } });
    }
  } catch {
    categories = [];
  }

  /* ---------- Transformation pour les cartes ---------- */

  const outils: OutilCarte[] = outilsBruts.map((outil) => ({
    id: outil.id,
    nom: outil.nom,
    slug: outil.slug,
    logo: outil.logo,
    description: outil.description ?? "",
    tarif: outil.tarif ?? null,
    gratuit: outil.gratuit,
    openSource: outil.openSource,
    type: outil.type,
    verifieLe: outil.verifieLe ?? null,
  }));

  const filtreActif = Boolean(q || type || categorie || gratuit || openSource);

  const classeChamp =
    "mt-1 w-full rounded-champ border border-bordure bg-gris px-3 py-2 text-sm text-encre outline-none transition focus:border-violet focus:bg-white";
  const classeEtiquette =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 lg:py-14">
      {/* ---------- En-tête ---------- */}
      <header className="max-w-2xl">
        <h1 className="font-titre text-[28px] font-semibold text-encre sm:text-h2">
          Tous les outils IA
        </h1>
        <p className="mesure mt-3 text-[17px] leading-7 text-encre/70">
          Explore le catalogue complet d’outils et d’agents IA sélectionnés par Webgiverse.
          Filtre par type, prix ou licence, puis enregistre tes coups de cœur dans tes favoris.
        </p>
      </header>

      {/* ---------- Barre de filtres ---------- */}
      <form
        method="get"
        action="/outils"
        className="mt-8 rounded-carte border border-bordure bg-white p-4 shadow-carte sm:p-5"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label htmlFor="q" className={classeEtiquette}>
              Recherche
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="ChatGPT, générateur d’images…"
              className={classeChamp}
            />
          </div>

          <div>
            <label htmlFor="type" className={classeEtiquette}>
              Type
            </label>
            <select id="type" name="type" defaultValue={type ?? ""} className={classeChamp}>
              <option value="">Tous</option>
              <option value="OUTIL">Outils IA</option>
              <option value="AGENT">Agents IA</option>
            </select>
          </div>

          <div>
            <label htmlFor="categorie" className={classeEtiquette}>
              Catégorie
            </label>
            <select
              id="categorie"
              name="categorie"
              defaultValue={categorie}
              className={classeChamp}
            >
              <option value="">Toutes</option>
              {categories.map((uneCategorie) => (
                <option key={uneCategorie.id} value={uneCategorie.slug}>
                  {uneCategorie.nom}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-encre">
              <input
                type="checkbox"
                name="gratuit"
                value="1"
                defaultChecked={gratuit}
                className="h-4 w-4 accent-violet"
              />
              Gratuit
            </label>

            <label className="flex items-center gap-2 text-sm text-encre">
              <input
                type="checkbox"
                name="openSource"
                value="1"
                defaultChecked={openSource}
                className="h-4 w-4 accent-violet"
              />
              Open source
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-champ bg-violet px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Filtrer
            </button>

            {filtreActif && (
              <Link
                href="/outils"
                className="text-sm font-medium text-violet underline-offset-2 hover:underline"
              >
                Réinitialiser
              </Link>
            )}
          </div>
        </div>
      </form>

      {/* ---------- Compteur ---------- */}
      <p className="mt-8 text-sm text-encre/70">
        {outils.length} {outils.length > 1 ? "outils trouvés" : "outil trouvé"}
      </p>

      {/* ---------- Grille ---------- */}
      {outils.length === 0 ? (
        <div className="mt-4 rounded-carte border border-bordure bg-gris p-10 text-center">
          <p className="font-titre text-lg font-semibold text-encre">
            Aucun outil ne correspond à ta recherche
          </p>
          <p className="mt-2 text-sm text-encre/70">
            Essaie d’élargir tes filtres ou réinitialise-les pour voir tout le catalogue.
          </p>
          <Link
            href="/outils"
            className="mt-4 inline-block rounded-champ bg-violet px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Voir tous les outils
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {outils.map((outil) => (
            <CarteOutilView key={outil.slug} outil={outil} />          ))}
        </div>
      )}
    </div>
  );
}