// app/skills/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 38 (réécriture lot 39) — BIBLIOTHÈQUE DE SKILLS IA (/skills).
// Section RÉSERVÉE AUX ABONNÉS PREMIUM (Pro / Entreprise) :
//   · non connecté        → aperçu flouté + bloc « Se connecter »
//   · connecté sans abo   → aperçu flouté + bloc « Passer Premium »
//   · Premium             → recherche, onglets de catégories, grille
//                           de 12 fiches par page, pagination.
// Tout est calculé côté serveur (lib/acces-skills.ts) : le contenu
// réservé n'est jamais envoyé au navigateur des non-abonnés.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { Lock, Search, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { accesSkills } from "@/lib/acces-skills";
import {
  categoriesSkills,
  compterSkillsStats,
  listerSkills,
} from "@/lib/queries-skills";
import { CarteSkill } from "@/components/skills/carte-skill";
import { BlocVerrouSkills } from "@/components/skills/bloc-verrou-skills";
import { Pagination } from "@/components/commun/pagination";

export const metadata: Metadata = {
  title: "Bibliothèque de Skills IA — Webgiverse",
  description:
    "Des dizaines de skills IA prêtes à l'emploi, traduites en français : présentation, guide d'installation et commande prête à copier. Réservé aux abonnés Premium.",
};

type Params = Promise<Record<string, string | string[] | undefined>>;

/** Lit le premier élément d'un paramètre GET. */
function val(c: string | string[] | undefined): string {
  return (Array.isArray(c) ? c[0] : c) ?? "";
}

export default async function PageSkills({ searchParams }: { searchParams: Params }) {
  const p = await searchParams;
  const q = val(p.q).slice(0, 80);
  const categorie = val(p.categorie).slice(0, 60);
  const page = Math.max(1, Math.trunc(Number(val(p.page)) || 1));

  // ── Accès (verrou côté serveur) ─────────────────────────────────
  const session = await auth();
  const acces = await accesSkills(session?.user?.id ?? null);

  // ── Données ─────────────────────────────────────────────────────
  const [resultat, categories, stats] = await Promise.all([
    listerSkills({ q, categorie, page }),
    categoriesSkills(),
    compterSkillsStats(),
  ]);

  // Aperçu flouté pour les non-abonnés : 3 premières fiches, sans
  // contenu sensible (titre + image de couverture seulement).
  const apercu = resultat.skills.slice(0, 3);

  return (
    <>
      {/* ── Héros ─────────────────────────────────────────────────── */}
      <section className="hero-verre border-b border-bordure">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center lg:py-16">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
            <Sparkles className="size-3.5" aria-hidden /> Bibliothèque de Skills IA
          </p>
          <h1 className="mx-auto mt-4 max-w-[760px] text-[30px] leading-9 font-bold tracking-tight text-bleu sm:text-h2">
            Des skills IA prêtes à l&apos;emploi, <span className="texte-degrade">traduites en français</span>
          </h1>
          <p className="mesure mx-auto mt-3 text-[16px] leading-7 text-encre">
            Chaque fiche explique à quoi sert la skill, comment l&apos;installer et comment la brancher
            sur ton agent : plus besoin de lire la documentation en anglais.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[13px] leading-5 font-semibold">
            <span className="rounded-full border border-bordure bg-white px-3.5 py-1.5 text-bleu">
              {stats.total} skill{stats.total > 1 ? "s" : ""}
            </span>
            <span className="rounded-full border border-bordure bg-white px-3.5 py-1.5 text-bleu">
              {stats.categories} catégorie{stats.categories > 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet/10 px-3.5 py-1.5 text-violet">
              <Lock className="size-3.5" aria-hidden /> Réservé aux abonnés Premium
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-10">
        {/* ══ NON PREMIUM : aperçu flouté + bloc verrou ══════════════ */}
        {!acces.peutAcceder && (
          <>
            {apercu.length > 0 && (
              <div aria-hidden="true" className="pointer-events-none grid select-none gap-5 blur-[7px] sm:grid-cols-2 lg:grid-cols-3">
                {apercu.map((skill) => (
                  <CarteSkill key={skill.id} skill={skill} />
                ))}
              </div>
            )}
            {apercu.length === 0 && (
              <div aria-hidden="true" className="grid select-none gap-5 blur-[7px] sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-72 rounded-carte border border-bordure bg-white shadow-carte" />
                ))}
              </div>
            )}
            <div className="mt-8">
              <BlocVerrouSkills connecte={acces.connecte} />
            </div>
          </>
        )}

        {/* ══ PREMIUM : recherche + onglets + grille + pagination ════ */}
        {acces.peutAcceder && (
          <>
            {/* Recherche (formulaire GET, aucun JavaScript requis) */}
            <form action="/skills" method="get" className="flex flex-wrap items-center gap-3" role="search">
              {categorie && <input type="hidden" name="categorie" value={categorie} />}
              <label htmlFor="recherche-skills" className="sr-only">Rechercher une skill</label>
              <div className="relative min-w-[240px] flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-encre/50" aria-hidden />
                <input
                  id="recherche-skills"
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder="Rechercher une skill, un usage, un tag…"
                  className="min-h-11 w-full rounded-full border border-bordure bg-white pl-11 pr-4 text-[14px] leading-5 text-bleu placeholder:text-encre/50 focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet"
                />
              </div>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] px-5 text-[14px] leading-5 font-semibold text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)] transition hover:opacity-90"
              >
                Rechercher
              </button>
            </form>

            {/* Onglets de catégories */}
            {categories.length > 0 && (
              <nav aria-label="Catégories de skills" className="mt-6 flex flex-wrap items-center gap-2">
                <Link
                  href={q ? `/skills?q=${encodeURIComponent(q)}` : "/skills"}
                  aria-current={!categorie ? "true" : undefined}
                  className={`rounded-full border px-4 py-2 text-[13px] leading-4 font-semibold transition ${
                    !categorie
                      ? "border-violet bg-violet text-white"
                      : "border-bordure bg-white text-bleu hover:border-violet hover:text-violet"
                  }`}
                >
                  Toutes
                </Link>
                {categories.map((c) => {
                  const params = new URLSearchParams();
                  if (q) params.set("q", q);
                  params.set("categorie", c.nom);
                  const href = `/skills?${params.toString()}`;
                  const actif = categorie === c.nom;
                  return (
                    <Link
                      key={c.nom}
                      href={href}
                      aria-current={actif ? "true" : undefined}
                      className={`rounded-full border px-4 py-2 text-[13px] leading-4 font-semibold transition ${
                        actif
                          ? "border-violet bg-violet text-white"
                          : "border-bordure bg-white text-bleu hover:border-violet hover:text-violet"
                      }`}
                    >
                      {c.nom}
                      <span className={`ml-1.5 text-[11.5px] font-medium ${actif ? "text-white/75" : "text-encre/60"}`}>
                        {c.total}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* Résultat */}
            {resultat.skills.length > 0 ? (
              <>
                <p className="mt-6 text-[13px] leading-5 text-encre">
                  {resultat.total} skill{resultat.total > 1 ? "s" : ""}
                  {q && <> pour «&nbsp;<strong className="font-semibold text-bleu">{q}</strong>&nbsp;»</>}
                  {categorie && <> dans «&nbsp;<strong className="font-semibold text-bleu">{categorie}</strong>&nbsp;»</>}
                </p>
                <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {resultat.skills.map((skill) => (
                    <CarteSkill key={skill.id} skill={skill} />
                  ))}
                </div>
                <Pagination page={resultat.page} pages={resultat.pages} base="/skills" params={{ q, categorie }} />
              </>
            ) : (
              <div className="mt-8 rounded-carte border border-bordure bg-white p-10 text-center shadow-carte">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-violet/10">
                  <Search className="size-6 text-violet" aria-hidden />
                </span>
                <h2 className="mt-4 font-titre text-[18px] leading-6 font-bold text-bleu">
                  Aucune skill ne correspond
                </h2>
                <p className="mx-auto mt-2 max-w-[420px] text-[14px] leading-6 text-encre">
                  Essaie d&apos;autres mots-clés, ou choisis une autre catégorie dans les onglets ci-dessus.
                </p>
                <Link
                  href="/skills"
                  className="mt-5 inline-flex min-h-10 items-center rounded-full border border-bordure bg-white px-5 text-[13.5px] leading-5 font-semibold text-bleu transition hover:border-violet hover:text-violet"
                >
                  Réinitialiser la recherche
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}