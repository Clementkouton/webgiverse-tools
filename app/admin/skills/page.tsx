// app/admin/skills/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 45 — CONSOLE ADMIN de la bibliothèque de Skills IA :
//   • 5 tuiles de statistiques : Skills, Vues cumulées, À la une,
//     Favoris épinglés, Retours d'usage ;
//   • barre de tri (liens ?tri=…) — ordre par défaut (champ ordre de
//     la base), AJOUT ancien→récent / récent→ancien, titre A→Z / Z→A,
//     Plus vues / Moins vues, Plus populaires, Plus épinglées,
//     Plus de retours. Le tri est fait DANS CETTE PAGE (searchParams +
//     tri en mémoire), à l'identique de /admin/tutoriels (lot 35) ;
//   • recherche par mots en GET (?q=…) : titre, slug, catégorie,
//     tags, auteur — conservée quand on change de tri ;
//   • colonne N° = RANG D'AJOUT de la skill (1 = la première ajoutée)
//     — stable quel que soit le tri affiché ;
//   • colonnes Vues, Favoris et Retours (compteurs par skill) ;
//   • étoile « À la une » (bascule featured) et corbeille avec
//     confirmation (BoutonConfirmer) par ligne ;
//   • page indépendante : GestionListeAdmin et app/actions/admin.ts
//     ne sont PAS modifiés, aucune autre page admin n'est impactée.
// Les compteurs Favoris / Retours sont LUS DE FAÇON DÉFENSIVE
// (groupBy en try/catch) : si la migration lot 43 n'a pas encore été
// exécutée, la page s'affiche quand même avec des 0.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import {
  Eye,
  ListFilter,
  Pin,
  Search,
  Sparkles,
  Star,
  ThumbsUp,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import {
  basculerSkillFeaturedAction,
  supprimerSkillAction,
} from "@/app/actions/skills-admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Skills — Administration" };
export const dynamic = "force-dynamic";

/** Pastilles pastel des tuiles (même palette que CarteStatAdmin). */
const PASTILLE: Record<string, string> = {
  primaire: "bg-primaire/10 text-primaire-texte",
  info: "bg-adm-info-doux text-[#2b6be0]",
  succes: "bg-adm-succes-doux text-[#0f9b85]",
  alerte: "bg-adm-alerte-doux text-[#b26f00]",
  erreur: "bg-adm-erreur-doux text-[#c94f35]",
};

/* ── LES TRIS DISPONIBLES ──────────────────────────────────────────
   Clé = paramètre d'URL (?tri=…). « editorial » = ordre actuel de la
   base (champ ordre, comme avant) : c'est le tri par défaut. */
const TRIS = {
  editorial: {
    libelle: "Ordre par défaut",
    desc: "Ordre de pertinence géré dans la base (comme avant).",
  },
  "ajout-asc": {
    libelle: "Ajout : ancien → récent",
    desc: "Les premières skills ajoutées apparaissent en haut.",
  },
  "ajout-desc": {
    libelle: "Ajout : récent → ancien",
    desc: "Les dernières skills ajoutées apparaissent en haut — pratique pour les repérer et les supprimer.",
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
    desc: "Les skills les moins consultées en premier.",
  },
  "popularite-desc": {
    libelle: "Plus populaires",
    desc: "Les skills avec le plus d'étoiles sur la source en premier.",
  },
  "favoris-desc": {
    libelle: "Plus épinglées",
    desc: "Les skills les plus souvent épinglées en favoris par les membres en premier.",
  },
  "retours-desc": {
    libelle: "Plus de retours",
    desc: "Les skills avec le plus de retours d'usage publiés en premier.",
  },
} as const;

type Tri = keyof typeof TRIS;

/** Forme d'une ligne du tableau (skill annotée de sa clé de recherche). */
type SkillListe = {
  id: string;
  slug: string;
  titre: string;
  description: string;
  categorie: string;
  tags: string[];
  auteur: string;
  popularite: number;
  featured: boolean;
  image: string;
  imageAlt: string;
  vues: number;
  creeLe: Date;
  recherche: string;
};

const formatteurDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Comparateur en mémoire pour chaque tri (jamais « editorial » : ordre conservé). */
function comparateur(tri: Tri, favoris: Map<string, number>, retours: Map<string, number>) {
  switch (tri) {
    case "ajout-asc":
      return (a: SkillListe, b: SkillListe) =>
        a.creeLe.getTime() - b.creeLe.getTime() || a.id.localeCompare(b.id);
    case "ajout-desc":
      return (a: SkillListe, b: SkillListe) =>
        b.creeLe.getTime() - a.creeLe.getTime() || a.id.localeCompare(b.id);
    case "az":
      return (a: SkillListe, b: SkillListe) =>
        a.titre.localeCompare(b.titre, "fr", { sensitivity: "base" });
    case "za":
      return (a: SkillListe, b: SkillListe) =>
        b.titre.localeCompare(a.titre, "fr", { sensitivity: "base" });
    case "vues-desc":
      return (a: SkillListe, b: SkillListe) => b.vues - a.vues;
    case "vues-asc":
      return (a: SkillListe, b: SkillListe) => a.vues - b.vues;
    case "popularite-desc":
      return (a: SkillListe, b: SkillListe) => b.popularite - a.popularite;
    case "favoris-desc":
      return (a: SkillListe, b: SkillListe) =>
        (favoris.get(b.id) ?? 0) - (favoris.get(a.id) ?? 0) ||
        (retours.get(b.id) ?? 0) - (retours.get(a.id) ?? 0);
    case "retours-desc":
      return (a: SkillListe, b: SkillListe) =>
        (retours.get(b.id) ?? 0) - (retours.get(a.id) ?? 0);
    default:
      return () => 0;
  }
}

export default async function PageSkillsAdmin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // ── Paramètres d'URL : ?tri=… et ?q=… ───────────────────────────
  const params = await searchParams;
  const brutTri = params.tri;
  const tri: Tri = typeof brutTri === "string" && brutTri in TRIS ? (brutTri as Tri) : "editorial";
  const brutQ = params.q;
  const q = typeof brutQ === "string" ? brutQ.trim().slice(0, 80) : "";

  // ── Données principales ─────────────────────────────────────────
  const [skills, vuesTotales] = await Promise.all([
    prisma.skill.findMany({ orderBy: [{ ordre: "asc" }, { creeLe: "desc" }] }),
    prisma.skill.aggregate({ _sum: { vues: true } }),
  ]);

  // ── Favoris épinglés & retours d'usage, PAR SKILL (défensif) ────
  // Si les tables lot 43 n'existent pas encore (migration SQL non
  // exécutée), on affiche la console avec des 0 : jamais de crash.
  const prismaAny = prisma as any;
  const favorisParSkill = new Map<string, number>();
  const retoursParSkill = new Map<string, number>();
  try {
    const skillFavoriModel = prismaAny.skillFavori;
    if (skillFavoriModel?.groupBy) {
      const lignes = await skillFavoriModel.groupBy({
        by: ["skillId"],
        _count: { _all: true },
      });
      for (const l of lignes) favorisParSkill.set(l.skillId, l._count._all);
    }
  } catch {
     /* table favoris absente : compteurs à 0 */
  }
  try {
    const skillRetourModel = prismaAny.skillRetour;
    if (skillRetourModel?.groupBy) {
      const lignes = await skillRetourModel.groupBy({
        by: ["skillId"],
        _count: { _all: true },
      });
      for (const l of lignes) retoursParSkill.set(l.skillId, l._count._all);
    }
  } catch {
    /* table retours absente : compteurs à 0 */
  }
  const totalFavoris = [...favorisParSkill.values()].reduce((s, v) => s + v, 0);
  const totalRetours = [...retoursParSkill.values()].reduce((s, v) => s + v, 0);

  // ── Clé de recherche de chaque skill (titre, slug, catégorie…) ──
  const annotees: SkillListe[] = skills.map((s) => ({
    ...s,
    recherche: `${s.titre} ${s.slug} ${s.categorie} ${s.tags.join(" ")} ${s.auteur}`
      .toLowerCase(),
  }));

  // ── Recherche par mots (filtre en mémoire) ──────────────────────
  const qMin = q.toLowerCase();
  const filtrees =
    qMin.length > 0
      ? annotees.filter((s) => s.recherche.includes(qMin))
      : annotees;

  // ── RANG D'AJOUT (stable) : 1 = la première skill ajoutée ──────
  const rangAjout = new Map<string, number>();
  [...skills]
    .sort(
      (a, b) => a.creeLe.getTime() - b.creeLe.getTime() || a.id.localeCompare(b.id),
    )
    .forEach((s, i) => rangAjout.set(s.id, i + 1));

  // ── Liste AFFICHÉE = mêmes données, triées selon le choix ──────
  const affichees: SkillListe[] =
    tri === "editorial"
      ? filtrees
      : [...filtrees].sort(comparateur(tri, favorisParSkill, retoursParSkill));

  const nbALaUne = skills.filter((s) => s.featured).length;

  const TUILES: { libelle: string; valeur: number; icone: LucideIcon; ton: string }[] = [
    { libelle: "Skills publiées", valeur: skills.length, icone: Sparkles, ton: "primaire" },
    { libelle: "Vues cumulées", valeur: vuesTotales._sum.vues ?? 0, icone: Eye, ton: "info" },
    { libelle: "À la une", valeur: nbALaUne, icone: Star, ton: "alerte" },
    { libelle: "Favoris épinglés", valeur: totalFavoris, icone: Pin, ton: "succes" },
    { libelle: "Retours d'usage", valeur: totalRetours, icone: ThumbsUp, ton: "erreur" },
  ];

  return (
    <div>
      <div className="animate-apparition-haut">
        <h1 className="text-h3 font-semibold">Skills IA</h1>
        <p className="mt-1 text-[14px] leading-6 text-encre">
          La bibliothèque réservée aux abonnés Premium : recherche par mots, tris croissants / décroissants,
          mises en avant et suppression — avec les compteurs de vues, de favoris épinglés et de retours d&apos;usage.
        </p>
      </div>

      {/* ── Tuiles de statistiques ──────────────────────────────── */}
      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {TUILES.map((t, i) => (
          <Carte
            key={t.libelle}
            className="animate-apparition-haut flex items-center gap-4 p-5"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", PASTILLE[t.ton])}>
              <t.icone className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-titre text-[24px] leading-8 font-bold text-adm-sombre">
                {t.valeur.toLocaleString("fr-FR")}
              </span>
              <span className="block truncate text-[13px] leading-4 font-semibold text-adm-gris">{t.libelle}</span>
            </span>
          </Carte>
        ))}
      </section>

      {/* ── Recherche par mots (GET) — conservée quand on trie ──── */}
      <form action="/admin/skills" method="get" role="search" className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-adm-gris-clair"
            aria-hidden
          />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Rechercher par titre, catégorie, tag, auteur…"
            className="h-11 w-full rounded-[7px]  not-italic border border-adm-bordure bg-white pl-10 pr-4 text-[14px] text-adm-sombre placeholder:text-adm-gris-clair focus:border-primaire focus:outline-none focus:ring-2 focus:ring-primaire/20"
          />
        </div>
        {tri !== "editorial" && <input type="hidden" name="tri" value={tri} />}
        <button
          type="submit"
          className="h-11 rounded-[7px]  not-italic border border-violet bg-white px-5 text-[14px] leading-5 font-semibold text-bleu transition hover:border-violet-clair hover:bg-gris"
        >
          Rechercher
        </button>
        {q && (
          <Link
            href={tri !== "editorial" ? `/admin/skills?tri=${tri}` : "/admin/skills"}
            className="text-[13px] leading-5 text-adm-gris underline hover:text-adm-sombre"
          >
            Annuler
          </Link>
        )}
      </form>
      {q && (
        <p className="mt-2 text-[12.5px] leading-5 text-adm-gris">
          {affichees.length} résultat{affichees.length > 1 ? "s" : ""} pour{" "}
          <strong className="font-semibold text-adm-sombre">« {q} »</strong> — la recherche porte sur le titre,
          le slug, la catégorie, les tags et l&apos;auteur.
        </p>
      )}

      {/* ── Barre de tri (liens ?tri=…) — conserve la recherche ─── */}
      <section className="mt-4 flex flex-wrap items-center gap-2" aria-label="Trier les skills">
        <span className="flex items-center gap-1.5 text-[13px] leading-4 font-semibold text-adm-gris">
          <ListFilter className="size-4" aria-hidden /> Trier :
        </span>
        {(Object.keys(TRIS) as Tri[]).map((cle) => {
          const actif = cle === tri;
          const href = `/admin/skills?tri=${cle}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
          return (
            <Link
              key={cle}
              href={href}
              aria-current={actif ? "true" : undefined}
              className={cn(
                "rounded-[7px]  not-italic border px-3 py-1.5 text-[12.5px] leading-4 font-medium transition",
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
        rang d&apos;ajout (1 = première skill ajoutée, {skills.length} = la plus récente) ; il ne change
        pas quand tu tries.
      </p>

      {/* ── Tableau des skills ──────────────────────────────────── */}
      <div className="animate-apparition-haut delai-2 mt-4">
        {skills.length === 0 ? (
          <Carte className="p-8 text-center">
            <Sparkles className="mx-auto size-8 text-adm-gris-clair" aria-hidden />
            <p className="mt-3 text-[14px] leading-6 text-encre">
              Aucune skill dans la base. Importe le catalogue avec
              <code className="mx-1 rounded bg-adm-fond px-1.5 py-0.5 text-[13px]">node scripts/importer-skills-csv.mjs</code>
              (lot 44) pour remplir la bibliothèque.
            </p>
          </Carte>
        ) : (
          <Carte className="overflow-x-auto p-2">
            <table className="w-full min-w-[980px] text-[13.5px] leading-5">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-adm-gris-clair">
                  <th className="p-3 font-bold">N°</th>
                  <th className="p-3 font-bold">Skill</th>
                  <th className="p-3 font-bold">Catégorie</th>
                  <th className="p-3 font-bold">Populaire</th>
                  <th className="p-3 font-bold">Vues</th>
                  <th className="p-3 font-bold">Favoris</th>
                  <th className="p-3 font-bold">Retours</th>
                  <th className="p-3 font-bold">Ajouté le</th>
                  <th className="p-3 font-bold">À la une</th>
                  <th className="p-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {affichees.map((s) => (
                  <tr key={s.id} className="border-t border-adm-bordure">
                    <td className="p-3 font-semibold text-adm-gris">{rangAjout.get(s.id) ?? "—"}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {s.image ? (
                          <img
                            src={s.image}
                            alt={s.imageAlt || `Aperçu de la skill ${s.titre}`}
                            loading="lazy"
                            className="size-10 shrink-0 rounded-lg border border-adm-bordure object-cover"
                          />
                        ) : (
                          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-adm-fond font-titre text-[15px] font-bold text-adm-gris">
                            {s.titre.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span className="min-w-0">
                          <Link
                            href={`/skills/${s.slug}`}
                            className="flex max-w-64 items-center gap-1.5 truncate font-semibold text-adm-sombre transition hover:text-primaire-texte"
                          >
                            <span className="truncate">{s.titre}</span>
                            {s.featured && (
                              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-[7px]  not-italic bg-adm-alerte-doux px-1.5 py-0.5 text-[10px] leading-3 font-bold text-[#b26f00]">
                                <Star className="size-2.5 fill-current" aria-hidden /> À la une
                              </span>
                            )}
                          </Link>
                          <span className="block max-w-64 truncate text-[12px] text-adm-gris-clair">
                            /skills/{s.slug}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="whitespace-nowrap rounded-[7px]  not-italic bg-adm-fond px-2 py-0.5 text-[11px] font-semibold text-adm-gris">
                        {s.categorie}
                      </span>
                    </td>
                    <td className="p-3 text-adm-sombre">{s.popularite.toLocaleString("fr-FR")}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-adm-sombre">
                        <Eye className="size-3.5 text-adm-gris-clair" aria-hidden />
                        {s.vues.toLocaleString("fr-FR")}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-adm-sombre">
                        <Pin className="size-3.5 text-adm-gris-clair" aria-hidden />
                        {(favorisParSkill.get(s.id) ?? 0).toLocaleString("fr-FR")}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-adm-sombre">
                        <ThumbsUp className="size-3.5 text-adm-gris-clair" aria-hidden />
                        {(retoursParSkill.get(s.id) ?? 0).toLocaleString("fr-FR")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap p-3 text-adm-gris">{formatteurDate.format(s.creeLe)}</td>
                    <td className="p-3">
                      <form action={basculerSkillFeaturedAction}>
                        <input type="hidden" name="skillId" value={s.id} />
                        <button
                          type="submit"
                          aria-label={
                            s.featured ? `Retirer « ${s.titre} » de la une` : `Mettre « ${s.titre} » à la une`
                          }
                          title={s.featured ? "Retirer de la une" : "Mettre à la une"}
                          className="grid size-9 place-items-center rounded-[7px]  not-italic border border-adm-bordure bg-white transition hover:border-amber-300 active:scale-95"
                        >
                          <Star
                            className={cn(
                              "size-4",
                              s.featured ? "fill-amber-400 text-amber-500" : "text-adm-gris-clair",
                            )}
                            aria-hidden
                          />
                        </button>
                      </form>
                    </td>
                    <td className="p-3">
                      <form action={supprimerSkillAction}>
                        <input type="hidden" name="skillId" value={s.id} />
                        <BoutonConfirmer
                          message={`Supprimer définitivement « ${s.titre} » ? Cette action est irréversible.`}
                          aria-label={`Supprimer la skill ${s.titre}`}
                          className="grid size-9 place-items-center rounded-[7px]  not-italic border border-adm-bordure bg-white text-adm-gris transition hover:border-red-300 hover:text-red-500 active:scale-95"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </BoutonConfirmer>
                      </form>
                    </td>
                  </tr>
                ))}
                {affichees.length === 0 && (
                  <tr className="border-t border-adm-bordure">
                    <td colSpan={10} className="p-6 text-center text-adm-gris">
                      Aucune skill ne correspond à ta recherche.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Carte>
        )}
        {skills.length > 0 && (
          <p className="mt-3 px-1 text-[12.5px] leading-5 text-adm-gris">
            {affichees.length} skill{affichees.length > 1 ? "s" : ""} affichée{affichees.length > 1 ? "s" : ""} sur{" "}
            {skills.length} — l&apos;étoile bascule la mise en avant sur /skills, la corbeille supprime
            définitivement la fiche (avec confirmation).
          </p>
        )}
      </div>
    </div>
  );
}