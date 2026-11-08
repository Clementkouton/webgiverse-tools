// app/skills/page.tsx
// Lot 40 — bibliothèque de Skills (liste). CORRECTIF IMAGE via
// carte-skill.tsx. Verrou Premium conservé (lib/acces-skills.ts) :
// non connecté / sans abonnement → aperçu flouté + bloc verrou.
// Abonné Pro / Entreprise → recherche, onglets, grille, pagination.
import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Lock, Search, Sparkles } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { auth } from "@/auth";
import { accesSkills } from "@/lib/acces-skills";
import { listerSkills, categoriesSkills, compterSkillsStats } from "@/lib/queries-skills";
import { CarteSkill } from "@/components/skills/carte-skill";
import { BlocVerrouSkills } from "@/components/skills/bloc-verrou-skills";
import { Pagination } from "@/components/commun/pagination";

export const metadata: Metadata = {
  title: "Skills IA — Webgiverse",
  description:
    "La bibliothèque des skills IA testées et traduites en français : ce que chaque skill fait vraiment, avec images et commandes d'installation.",
};

type Params = Promise<Record<string, string | string[] | undefined>>;

/** Lit le premier élément d'un paramètre GET (string | string[] | undefined). */
function val(c: string | string[] | undefined): string {
  return (Array.isArray(c) ? c[0] : c) ?? "";
}

/** URL d'un onglet de catégorie en conservant la recherche en cours. */
function lienCategorie(categorie: string, q: string): string {
  const usp = new URLSearchParams();
  if (q) usp.set("q", q);
  if (categorie) usp.set("categorie", categorie);
  const qs = usp.toString();
  return qs ? `/skills?${qs}` : "/skills";
}

export default async function PageSkills({ searchParams }: { searchParams: Params }) {
  const p = await searchParams;
  const q = val(p.q).slice(0, 80);
  const categorie = val(p.categorie);
  const page = Math.max(1, Math.trunc(Number(val(p.page)) || 1));

  // Verrou Premium (source de vérité : lib/acces-skills.ts)
  const session = await auth();
  const acces = await accesSkills(session?.user?.id);
  const peutAcceder = acces.peutAcceder;

  // listerSkills borne la page et renvoie { skills, total, page, pages } (12/page)
  const [resultat, categories, stats] = await Promise.all([
    listerSkills({ q, categorie, page }),
    categoriesSkills(),
    compterSkillsStats(),
  ]);
  const { skills, page: pageFinale, pages } = resultat;

  const classeOnglet = (actif: boolean) =>
    `rounded-full border px-4 py-1.5 text-[13px] leading-4 font-medium transition ${
      actif
        ? "border-violet bg-violet/10 text-violet"
        : "border-bordure bg-white text-bleu hover:border-violet hover:text-violet"
    }`;

  return (
    <>
      {/* ── Héros ───────────────────────────────────────────────── */}
      <section className="hero-verre border-b border-bordure">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center lg:py-16">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
            <Sparkles className="size-3.5" aria-hidden /> Skills IA
          </p>
          <h1 className="mx-auto mt-4 max-w-[760px] text-[30px] leading-9 font-bold tracking-tight text-bleu sm:text-h2">
            Des <span className="texte-degrade">skills IA</span> passées au crible, en français
          </h1>
          <p className="mesure mx-auto mt-3 text-[16px] leading-7 text-encre">
            Chaque skill du catalogue est installée, testée et résumée honnêtement :
            ce qu&apos;elle fait, ce qu&apos;elle vaut, et comment l&apos;installer en une commande.
          </p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <li className="rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
              {stats.total} skill{stats.total > 1 ? "s" : ""}
            </li>
            <li className="rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
              {stats.categories} catégorie{stats.categories > 1 ? "s" : ""}
            </li>
            <li className="rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
              Réservé aux abonnés Premium
            </li>
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 lg:py-12">
        {/* ── Bandeau d'accès Premium (même style que /tutoriels) ── */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-carte border border-violet/30 bg-violet/5 p-4 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-carte bg-violet/10">
              {peutAcceder ? (
                <Sparkles className="size-4.5 text-violet" aria-hidden />
              ) : (
                <Lock className="size-4.5 text-violet" aria-hidden />
              )}
            </span>
            {peutAcceder ? (
              <p className="max-w-2xl text-[14px] leading-6 text-encre">
                <strong className="font-semibold text-bleu">Ton accès Premium est actif</strong> :
                toute la bibliothèque de skills est débloquée — reviews complètes, images et
                commandes d&apos;installation. Bonne exploration&nbsp;!
              </p>
            ) : (
              <p className="max-w-2xl text-[14px] leading-6 text-encre">
                La bibliothèque de <strong className="font-semibold text-bleu">skills IA</strong>{" "}
                est réservée aux abonnés Premium (Pro ou Entreprise) : reviews complètes en
                français, images et installation en une commande.
              </p>
            )}
          </div>
          {!peutAcceder && (
            <Bouton asChild taille="sm">
              <Link href="/tarifs">
                <Sparkles aria-hidden /> Débloquer l&apos;accès
              </Link>
            </Bouton>
          )}
        </div>

        {/* ── Recherche + onglets de catégories (abonnés uniquement) ── */}
        {peutAcceder && (
          <>
            <form
              method="get"
              action="/skills"
              className="mb-4 flex flex-col gap-3 rounded-carte border border-bordure bg-white p-4 shadow-carte sm:flex-row sm:items-center"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-encre" aria-hidden />
                <input
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder="Rechercher une skill (productivité, code, agents…)"
                  aria-label="Rechercher une skill"
                  className="min-h-11 w-full rounded-full border border-bordure bg-white pr-4 pl-11 text-[15px] leading-5 text-bleu placeholder:text-encre/60 focus:border-violet focus:outline-none"
                />
              </div>
              <input type="hidden" name="categorie" value={categorie} />
              <Bouton type="submit" variante="secondaire" taille="sm" className="sm:hidden">
                Rechercher
              </Bouton>
            </form>

            {categories.length > 0 && (
              <div className="mb-8 flex flex-wrap gap-2">
                <Link href={lienCategorie("", q)} className={classeOnglet(!categorie)}>
                  Toutes
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c.nom}
                    href={lienCategorie(c.nom, q)}
                    className={classeOnglet(categorie === c.nom)}
                  >
                    {c.nom} · {c.total}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Résultats ───────────────────────────────────────────── */}
        {skills.length === 0 ? (
          <div className="rounded-carte border border-bordure bg-white p-12 text-center shadow-carte">
            <p className="font-titre text-[17px] leading-6 font-semibold text-bleu">
              Aucune skill trouvée pour cette recherche.
            </p>
            <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-encre">
              Essaie un autre mot-clé ou explore une autre catégorie — la bibliothèque
              s&apos;agrandit régulièrement.
            </p>
            <Bouton asChild variante="secondaire" className="mt-5">
              <Link href="/skills">Réinitialiser les filtres</Link>
            </Bouton>
          </div>
        ) : peutAcceder ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {skills.map((s) => (
                <CarteSkill key={s.id} skill={s} />
              ))}
            </div>
            {/* Pagination (composant commun, filtres conservés) */}
            <Pagination
              page={pageFinale}
              pages={pages}
              base="/skills"
              params={{ q: q || undefined, categorie: categorie || undefined }}
            />
          </>
        ) : (
          /* Aperçu flouté + bloc « réservé aux abonnés » (lot 38, conservé) */
          <div className="relative">
            <div
              aria-hidden="true"
              className="pointer-events-none grid select-none gap-4 blur-[6px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {skills.map((s) => (
                <CarteSkill key={s.id} skill={s} />
              ))}
            </div>
            <div className="absolute inset-0 grid place-items-center p-4">
              <BlocVerrouSkills connecte={acces.connecte} compact />
            </div>
          </div>
        )}

        {/* ── Section d'introduction (SEO) ────────────────────────── */}
        <section className="mt-14 rounded-carte border border-bordure bg-white p-6 shadow-carte sm:p-10">
          <h2 className="font-titre text-[22px] leading-8 font-bold text-bleu">
            Qu&apos;est-ce qu&apos;une skill IA, et pourquoi cette bibliothèque&nbsp;?
          </h2>
          <div className="mt-4 grid gap-6 text-[15px] leading-7 text-encre lg:grid-cols-2">
            <div className="space-y-3">
              <p>
                Une « skill » est un module de compétences que l&apos;on branche sur un agent IA
                (Claude Code, Cursor, et autres assistants de code) pour lui apprendre un
                savoir-faire précis : mener un entretien produit, rédiger une revue, respecter
                les conventions d&apos;un projet. Le catalogue openagentskills.dev en recense
                des centaines — toutes ne se valent pas.
              </p>
              <p>
                Webgiverse installe et teste chaque skill, puis publie une review honnête en
                français : ce qu&apos;elle fait vraiment, ses limites, sa commande
                d&apos;installation prête à copier. Tu sais en deux minutes si elle mérite une
                place dans ton flux de travail.
              </p>
            </div>
            <div className="space-y-3">
              <p>
                La bibliothèque est incluse dans les plans Premium Pro et Entreprise, qui
                débloquent aussi les tutoriels Intermédiaire et Avancé, les notes avec export,
                les ressources et l&apos;assistant IA des tutoriels.
              </p>
              <ul className="flex flex-wrap gap-2">
                {[
                  "Installées et testées pour de vrai",
                  "Tout est traduit en français",
                  "Installation en une commande",
                  "Mises à jour régulières",
                ].map((point) => (
                  <li
                    key={point}
                    className="inline-flex items-center gap-1.5 rounded-full border border-violet/30 bg-violet/5 px-3.5 py-1.5 text-[13px] leading-4 font-medium text-violet"
                  >
                    <Clock className="size-3.5" aria-hidden /> {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}