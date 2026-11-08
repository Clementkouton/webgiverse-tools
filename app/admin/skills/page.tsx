// app/admin/skills/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 39 — Console admin de la BIBLIOTHÈQUE DE SKILLS (/admin/skills)
// Page indépendante, même style « TailwindAdmin » que /admin/tutoriels :
//   · tuiles de statistiques : fiches, VUES CUMULÉES, mises en avant,
//     catégories ;
//   · barre de tri (liens ?tri=…) : ordre par défaut, AJOUT
//     ancien→récent / récent→ancien (repérer et supprimer les derniers
//     imports), titre A→Z / Z→A, plus vues / moins vues, popularité ;
//   · colonne « N° » = RANG D'AJOUT (stable, ne bouge pas avec le tri) ;
//   · recherche par mots (?q=…) sur titre, slug, catégorie, tags ;
//   · aperçu de l'image, badge catégorie, popularité, COMPTEUR DE VUES
//     par fiche (incrémenté côté /skills/[slug] à chaque consultation
//     d'un abonné Premium) ;
//   · boutons : À la une (bascule) et Supprimer — actions serveur dans
//     app/actions/skills-admin.ts (aucune autre page impactée).
// Aucune modification de GestionListeAdmin ni de app/actions/admin.ts.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import {
  Eye,
  ExternalLink,
  Flame,
  FolderOpen,
  ListFilter,
  Search,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { PASTILLE_TUILE, type Ton } from "@/components/admin/carte-stat-admin";
import {
  basculerSkillFeaturedAction,
  supprimerSkillAction,
} from "@/app/actions/skills-admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Skills — Administration" };
export const dynamic = "force-dynamic";

/* ── LES TRIS DISPONIBLES ─────────────────────────────────────────
   « editorial » = ordre de la base (champ ordre, puis date) : c'est
   le tri par défaut, l'affichage ne change pas tant qu'on ne choisit
   rien. */
const TRIS = {
  editorial: {
    libelle: "Ordre par défaut",
    desc: "Ordre géré dans la base (champ ordre, puis les plus récentes).",
  },
  "ajout-asc": {
    libelle: "Ajout : ancien → récent",
    desc: "Les premières skills importées apparaissent en haut.",
  },
  "ajout-desc": {
    libelle: "Ajout : récent → ancien",
    desc: "Les dernières skills importées apparaissent en haut — pratique pour les repérer et les supprimer.",
  },
  az: {
    libelle: "A → Z",
    desc: "Classement alphabétique croissant par titre.",
  },
  za: {
    libelle: "Z → A",
    desc: "Classement alphabétique décroissant par titre.",
  },
  "vues-desc": {
    libelle: "Plus vues",
    desc: "Les skills les plus consultées par les abonnés en premier.",
  },
  "vues-asc": {
    libelle: "Moins vues",
    desc: "Les skills jamais ou peu consultées en premier — pense à les mettre en avant.",
  },
  "popularite-desc": {
    libelle: "Plus populaires",
    desc: "Les skills avec le plus d'étoiles sur la source en premier.",
  },
} as const;

type Tri = keyof typeof TRIS;

/** Forme d'une ligne du tableau (résultat du findMany). */
type SkillListe = {
  id: string;
  slug: string;
  titre: string;
  categorie: string;
  image: string;
  popularite: number;
  featured: boolean;
  vues: number;
  tags: string[];
  creeLe: Date;
};

/** Comparateur en mémoire (jamais « editorial » : ordre conservé). */
function comparateur(tri: Tri): (a: SkillListe, b: SkillListe) => number {
  switch (tri) {
    case "ajout-asc":
      return (a, b) => a.creeLe.getTime() - b.creeLe.getTime() || a.id.localeCompare(b.id);
    case "ajout-desc":
      return (a, b) => b.creeLe.getTime() - a.creeLe.getTime() || a.id.localeCompare(b.id);
    case "az":
      return (a, b) => a.titre.localeCompare(b.titre, "fr", { sensitivity: "base" });
    case "za":
      return (a, b) => b.titre.localeCompare(a.titre, "fr", { sensitivity: "base" });
    case "vues-desc":
      return (a, b) => b.vues - a.vues;
    case "vues-asc":
      return (a, b) => a.vues - b.vues;
    case "popularite-desc":
      return (a, b) => b.popularite - a.popularite;
    default:
      return () => 0;
  }
}

const NOMBRE = new Intl.NumberFormat("fr-FR");
const DATE = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

export default async function PageSkillsAdmin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // ── Paramètres d'URL (?tri=…, ?q=…) ──────────────────────────────
  const p = await searchParams;
  const brutTri = Array.isArray(p.tri) ? p.tri[0] : p.tri;
  const tri: Tri = typeof brutTri === "string" && brutTri in TRIS ? (brutTri as Tri) : "editorial";
  const q = ((Array.isArray(p.q) ? p.q[0] : p.q) ?? "").trim().slice(0, 80);

  // ── Données — défensif : table absente → message d'aide ─────────
  let skills: SkillListe[] = [];
  let tableAbsente = false;
  try {
    // Le client Prisma peut être généré sans le modèle Skill ; cette
    // assertion locale maintient le typage de la page sans toucher au client global.
    const prismaSkills = prisma as unknown as {
      skill: {
        findMany(args: {
          orderBy: Array<{ ordre: "asc" } | { creeLe: "desc" }>;
          select: {
            id: true;
            slug: true;
            titre: true;
            categorie: true;
            image: true;
            popularite: true;
            featured: true;
            vues: true;
            tags: true;
            creeLe: true;
          };
        }): Promise<SkillListe[]>;
      };
    };
    skills = await prismaSkills.skill.findMany({
      orderBy: [{ ordre: "asc" }, { creeLe: "desc" }],
      select: {
        id: true, slug: true, titre: true, categorie: true, image: true,
        popularite: true, featured: true, vues: true, tags: true, creeLe: true,
      },
    });
  } catch {
    tableAbsente = true;
  }

  // ── RANG D'AJOUT (stable, indépendant du tri affiché) ───────────
  const rangAjout = new Map<string, number>();
  [...skills]
    .sort((a, b) => a.creeLe.getTime() - b.creeLe.getTime() || a.id.localeCompare(b.id))
    .forEach((s, i) => rangAjout.set(s.id, i + 1));

  // ── Recherche par mots (en mémoire) ─────────────────────────────
  const filtrees = q
    ? skills.filter((s) =>
        `${s.titre} ${s.slug} ${s.categorie} ${s.tags.join(" ")}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      )
    : skills;

  // ── Liste AFFICHÉE = mêmes données, triées selon le choix ───────
  const affichees: SkillListe[] =
    tri === "editorial" ? filtrees : [...filtrees].sort(comparateur(tri));

  // ── Statistiques (calculées sur TOUT, pas sur la recherche) ─────
  const vuesTotales = skills.reduce((somme, s) => somme + s.vues, 0);
  const nbFeatured = skills.filter((s) => s.featured).length;
  const nbCategories = new Set(skills.map((s) => s.categorie)).size;

  /** Lien de tri qui conserve la recherche en cours. */
  const lienTri = (cle: Tri) =>
    q ? `/admin/skills?tri=${cle}&q=${encodeURIComponent(q)}` : `/admin/skills?tri=${cle}`;

  const TUILES: { libelle: string; valeur: number; icone: typeof Sparkles; ton: Ton }[] = [
    { libelle: "Skills publiées", valeur: skills.length, icone: Sparkles, ton: "primaire" },
    { libelle: "Vues cumulées", valeur: vuesTotales, icone: Eye, ton: "info" },
    { libelle: "Mises en avant", valeur: nbFeatured, icone: Star, ton: "alerte" },
    { libelle: "Catégories", valeur: nbCategories, icone: FolderOpen, ton: "succes" },
  ];

  return (
    <div>
      <div className="animate-apparition-haut">
        <h1 className="text-h3 font-semibold">Skills</h1>
        <p className="mt-1 text-[14px] leading-6 text-encre">
          La bibliothèque de skills IA réservée aux abonnés Premium : numérotation par ordre d&apos;ajout,
          tris croissants / décroissants, recherche, compteur de vues par fiche, mise en avant et suppression.
        </p>
      </div>

      {/* ── Tuiles de statistiques ──────────────────────────────────── */}
      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TUILES.map((t, i) => (
          <Carte
            key={t.libelle}
            className="animate-apparition-haut flex items-center gap-4 p-5"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", PASTILLE_TUILE[t.ton])}>
              <t.icone className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-titre text-[24px] leading-8 font-bold text-adm-sombre">
                {NOMBRE.format(t.valeur)}
              </span>
              <span className="block truncate text-[13px] leading-4 font-semibold text-adm-gris">{t.libelle}</span>
            </span>
          </Carte>
        ))}
      </section>

      {/* ── Barre de tri ────────────────────────────────────────────── */}
      <section className="mt-4 flex flex-wrap items-center gap-2" aria-label="Trier les skills">
        <span className="flex items-center gap-1.5 text-[13px] leading-4 font-semibold text-adm-gris">
          <ListFilter className="size-4" aria-hidden /> Trier :
        </span>
        {(Object.keys(TRIS) as Tri[]).map((cle) => {
          const actif = cle === tri;
          return (
            <Link
              key={cle}
              href={lienTri(cle)}
              aria-current={actif ? "true" : undefined}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12.5px] leading-4 font-medium transition",
                actif
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-black/10 bg-white text-adm-gris hover:border-indigo-300 hover:text-adm-sombre",
              )}
            >
              {TRIS[cle].libelle}
            </Link>
          );
        })}
      </section>
      <p className="mt-2 text-[12.5px] leading-5 text-adm-gris">
        {TRIS[tri].desc} — la colonne <strong className="font-semibold text-adm-sombre">N°</strong> est le
        rang d&apos;ajout (1 = première skill importée, {skills.length} = la plus récente) ; il ne change
        pas quand tu tries.
      </p>

      {/* ── Recherche ───────────────────────────────────────────────── */}
      <form action="/admin/skills" method="get" className="mt-4 flex flex-wrap items-center gap-2" role="search">
        <input type="hidden" name="tri" value={tri} />
        <label htmlFor="recherche-skills-admin" className="sr-only">Rechercher une skill</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-adm-gris" aria-hidden />
          <input
            id="recherche-skills-admin"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Titre, slug, catégorie, tag…"
            className="min-h-10 w-64 rounded-xl border border-black/10 bg-white pl-10 pr-3 text-[13.5px] leading-5 text-adm-sombre placeholder:text-adm-gris-clair focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <button
          type="submit"
          className="inline-flex min-h-10 items-center rounded-xl bg-indigo-600 px-4 text-[13.5px] leading-5 font-semibold text-white transition hover:bg-indigo-700"
        >
          Rechercher
        </button>
        {q && (
          <Link
            href={lienTri(tri)}
            className="inline-flex min-h-10 items-center rounded-xl border border-black/10 bg-white px-3.5 text-[13px] leading-5 font-medium text-adm-gris transition hover:text-adm-sombre"
          >
            Effacer
          </Link>
        )}
      </form>

      {/* ── Table absente (migration pas encore lancée) ─────────────── */}
      {tableAbsente && (
        <Carte className="mt-4 border-amber-200 bg-adm-alerte-doux p-5">
          <p className="text-[14px] leading-6 text-[#b26f00]">
            <strong className="font-semibold">La table « Skill » n&apos;existe pas encore en base.</strong>{" "}
            Exécute prisma/migration-skills.sql dans le SQL Editor de Neon (étape 1 du lot 38), colle le
            modèle dans prisma/schema.prisma puis lance <code className="rounded bg-white/70 px-1.5 py-0.5">npx prisma generate</code>, et
            enfin <code className="rounded bg-white/70 px-1.5 py-0.5">node scripts/importer-skills.mjs</code>.
          </p>
        </Carte>
      )}

      {/* ── Tableau ─────────────────────────────────────────────────── */}
      <div className="animate-apparition-haut delai-2 mt-4">
        <Carte className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[13.5px] leading-5">
              <thead>
                <tr className="bg-adm-fond text-[11.5px] uppercase tracking-wider text-adm-gris">
                  <th scope="col" className="px-4 py-3 font-semibold">N°</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Aperçu</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Skill</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Catégorie</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Popularité</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Vues</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Ajouté le</th>
                  <th scope="col" className="px-4 py-3 text-center font-semibold">À la une</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {affichees.length === 0 && !tableAbsente && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-adm-gris">
                      {q
                        ? `Aucune skill ne contient « ${q} ».`
                        : "Aucune skill en base — lance scripts/importer-skills.mjs."}
                    </td>
                  </tr>
                )}
                {affichees.map((s) => (
                  <tr key={s.id} className="border-t border-black/5 transition hover:bg-adm-fond/60">
                    <td className="px-4 py-3 font-titre text-[15px] font-bold text-adm-gris">
                      {rangAjout.get(s.id) ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="relative block h-10 w-16 overflow-hidden rounded-lg border border-black/5 bg-[linear-gradient(120deg,#00d1ff_0%,#6a3bff_70%)]">
                        {s.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.image}
                            alt=""
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        )}
                      </span>
                    </td>
                    <td className="max-w-[260px] px-4 py-3">
                      <span className="block truncate font-semibold text-adm-sombre">{s.titre}</span>
                      <Link
                        href={`/skills/${s.slug}`}
                        target="_blank"
                        className="mt-0.5 inline-flex items-center gap-1 truncate text-[12px] text-adm-gris transition hover:text-indigo-600"
                      >
                        /skills/{s.slug} <ExternalLink className="size-3 shrink-0" aria-hidden />
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-adm-info-doux px-2.5 py-1 text-[12px] font-semibold text-[#2b6be0]">
                        {s.categorie}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-medium text-adm-sombre">
                        <Flame className="size-3.5 text-adm-alerte" aria-hidden />
                        {NOMBRE.format(s.popularite)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primaire/10 px-2.5 py-1 text-[12px] font-semibold text-primaire-texte">
                        <Eye className="size-3.5" aria-hidden />
                        {NOMBRE.format(s.vues)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-adm-gris">{DATE.format(s.creeLe)}</td>
                    <td className="px-4 py-3 text-center">
                      <form action={basculerSkillFeaturedAction}>
                        <input type="hidden" name="skillId" value={s.id} />
                        <button
                          type="submit"
                          aria-label={s.featured ? `Retirer « ${s.titre} » de la une` : `Mettre « ${s.titre} » à la une`}
                          title={s.featured ? "Retirer de la une" : "Mettre à la une"}
                          className={cn(
                            "inline-grid size-9 place-items-center rounded-lg border transition",
                            s.featured
                              ? "border-indigo-200 bg-adm-info-doux text-indigo-600 hover:border-indigo-400"
                              : "border-black/10 bg-white text-adm-gris-clair hover:border-indigo-300 hover:text-indigo-600",
                          )}
                        >
                          <Star className={cn("size-4.5", s.featured && "fill-indigo-600")} aria-hidden />
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={supprimerSkillAction} className="inline">
                        <input type="hidden" name="skillId" value={s.id} />
                        <button
                          type="submit"
                          aria-label={`Supprimer définitivement « ${s.titre} »`}
                          title="Supprimer définitivement"
                          className="inline-grid size-9 place-items-center rounded-lg border border-black/10 bg-white text-[#c94f35] transition hover:border-[#fa896b] hover:bg-adm-erreur-doux"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Carte>
        <p className="mt-3 text-[12.5px] leading-5 text-adm-gris">
          {affichees.length} skill{affichees.length > 1 ? "s" : ""} affichée{affichees.length > 1 ? "s" : ""}
          {q && ` (sur ${skills.length} au total)`} — les vues sont comptées à chaque consultation d&apos;un
          abonné Premium sur /skills/[slug].
        </p>
      </div>
    </div>
  );
}