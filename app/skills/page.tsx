// app/skills/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 41 — Bibliothèque de Skills IA (/skills), RÉSERVÉE AUX ABONNÉS
// Premium (Pro / Entreprise) — verrou calculé côté serveur dans
// lib/acces-skills.ts (impossible à contourner depuis le navigateur).
//   · Visiteur non connecté  → bloc verrou + aperçu flouté + connexion
//   · Membre sans abonnement → bloc verrou + aperçu flouté + Premium
//   · Abonné actif           → recherche, onglets, grille, pagination
// Les couvertures sont des URLs distantes TOUJOURS rendues en vraies
// balises <img> (composant CarteSkill) : jamais une URL en texte brut.
// Fichier COMPLET (remplace tout fichier tronqué ou vide).
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Lock, Search, Sparkles, Terminal } from "lucide-react";
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
import { Bouton } from "@/components/ui/bouton";

export const metadata: Metadata = {
  title: "Skills IA prêtes à l'emploi — Webgiverse",
  description:
    "Bibliothèque de skills IA prêtes à installer, traduites en français : productivité, développement, données, automatisation. Réservée aux abonnés Premium.",
};

type Params = Promise<Record<string, string | string[] | undefined>>;

/** Lit le premier élément d'un paramètre GET (string | string[] | undefined). */
function val(c: string | string[] | undefined): string {
  return (Array.isArray(c) ? c[0] : c) ?? "";
}

export default async function PageSkills({ searchParams }: { searchParams: Params }) {
  const p = await searchParams;
  const q = val(p.q).slice(0, 80);
  const categorie = val(p.categorie);
  const page = Math.max(1, Math.trunc(Number(val(p.page)) || 1));

  const [resultat, categories, stats, session] = await Promise.all([
    listerSkills({ q, categorie, page }),
    categoriesSkills(),
    compterSkillsStats(),
    auth(),
  ]);
  const { skills, total, page: pageFinale, pages } = resultat;

  // Verrou Premium — calculé côté serveur (lib/acces-skills.ts).
  const acces = await accesSkills(session?.user?.id);
  const premium = acces.peutAcceder;

  /** Lien d'un onglet catégorie en conservant la recherche en cours. */
  function hrefCategorie(nom: string): string {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    if (nom) usp.set("categorie", nom);
    const qs = usp.toString();
    return qs ? `/skills?${qs}` : "/skills";
  }

  return (
    <>
      {/* ── Héros ─────────────────────────────────────────────────── */}
      <section className="hero-verre border-b border-bordure">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center lg:py-16">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
            <Terminal className="size-3.5" aria-hidden /> Skills IA
          </p>
          <h1 className="mx-auto mt-4 max-w-[780px] text-[30px] leading-9 font-bold tracking-tight text-bleu sm:text-h2">
            Des <span className="texte-degrade">skills IA</span> prêtes à l&apos;emploi, expliquées en
            français
          </h1>
          <p className="mesure mx-auto mt-3 text-[16px] leading-7 text-encre">
            Installe des agents IA prêts à l&apos;emploi pour coder, automatiser, analyser des données
            et produire plus vite : chaque fiche est traduite en français, illustrée, avec la
            commande d&apos;installation copiable en un clic.
          </p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <li className="rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
              {stats.total} skills
            </li>
            <li className="rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
              {stats.categories} catégories
            </li>
            <li className="rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
              Nouveautés régulières
            </li>
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 lg:py-12">
        {/* ── Bandeau d'accès Premium ──────────────────────────────── */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-carte border border-violet/30 bg-violet/5 p-4 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-carte bg-violet/10">
              {premium ? (
                <Sparkles className="size-4.5 text-violet" aria-hidden />
              ) : (
                <Lock className="size-4.5 text-violet" aria-hidden />
              )}
            </span>
            {premium ? (
              <p className="max-w-2xl text-[14px] leading-6 text-encre">
                <strong className="font-semibold text-bleu">Ton accès Premium est actif</strong> :
                les {stats.total} skills, leurs images, leurs commandes d&apos;installation et
                l&apos;intégralité des articles sont débloquées. Bonne exploration&nbsp;!
              </p>
            ) : (
              <p className="max-w-2xl text-[14px] leading-6 text-encre">
                La bibliothèque de skills est{" "}
                <strong className="font-semibold text-bleu">réservée aux abonnés Premium</strong>{" "}
                (Pro ou Entreprise) : fiches complètes traduites en français, images et commande
                d&apos;installation copiable.
              </p>
            )}
          </div>
          {!premium && (
            <Bouton asChild taille="sm">
              <Link href="/tarifs">
                <Sparkles aria-hidden /> Débloquer l&apos;accès
              </Link>
            </Bouton>
          )}
        </div>

        {/* ── NON PREMIUM : bloc verrou + aperçu flouté ─────────────── */}
        {!premium && (
          <div className="space-y-6">
            <BlocVerrouSkills connecte={acces.connecte} />
            {skills.length > 0 && (
              <div className="relative" aria-hidden="true">
                <div className="pointer-events-none grid select-none gap-4 blur-[7px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {skills.slice(0, 4).map((s) => (
                    <div
                      key={s.id}
                      className="overflow-hidden rounded-carte border border-bordure bg-white shadow-carte"
                    >
                      <div className="aspect-video w-full bg-[linear-gradient(120deg,#efe9ff,#e6f7ff)]" />
                      <div className="p-4">
                        <p className="truncate font-titre text-[16px] leading-5 font-bold text-bleu">
                          {s.titre}
                        </p>
                        <p className="mt-1.5 line-clamp-3 text-[13px] leading-5 text-encre">
                          {s.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 grid place-items-center">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-[13px] leading-4 font-semibold text-violet shadow-carte backdrop-blur">
                    <Lock className="size-4" aria-hidden /> Aperçu — contenu réservé aux abonnés
                    Premium
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PREMIUM : recherche + onglets + grille + pagination ──── */}
        {premium && (
          <>
            <form
              method="get"
              action="/skills"
              className="mb-5 flex flex-col gap-3 rounded-carte border border-bordure bg-white p-4 shadow-carte sm:flex-row sm:items-center"
            >
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-encre"
                  aria-hidden
                />
                <input
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder="Rechercher une skill (code, data, automatisation…)"
                  aria-label="Rechercher une skill"
                  className="min-h-11 w-full rounded-full border border-bordure bg-white pr-4 pl-11 text-[15px] leading-5 text-bleu placeholder:text-encre/60 focus:border-violet focus:outline-none"
                />
              </div>
              <input type="hidden" name="categorie" value={categorie} />
              <Bouton type="submit" variante="secondaire" taille="sm" className="sm:hidden">
                Rechercher
              </Bouton>
            </form>

            {/* Onglets de catégories */}
            <div className="mb-6 flex flex-wrap gap-2">
              <Link
                href={hrefCategorie("")}
                aria-current={!categorie ? "true" : undefined}
                className={
                  !categorie
                    ? "rounded-full bg-violet px-4 py-2 text-[13px] leading-4 font-semibold text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)]"
                    : "rounded-full border border-bordure bg-white px-4 py-2 text-[13px] leading-4 font-medium text-bleu transition hover:border-violet hover:text-violet"
                }
              >
                Toutes
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.nom}
                  href={hrefCategorie(c.nom)}
                  aria-current={categorie === c.nom ? "true" : undefined}
                  className={
                    categorie === c.nom
                      ? "rounded-full bg-violet px-4 py-2 text-[13px] leading-4 font-semibold text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)]"
                      : "rounded-full border border-bordure bg-white px-4 py-2 text-[13px] leading-4 font-medium text-bleu transition hover:border-violet hover:text-violet"
                  }
                >
                  {c.nom} ({c.total})
                </Link>
              ))}
            </div>

            {skills.length === 0 ? (
              <div className="rounded-carte border border-bordure bg-white p-12 text-center shadow-carte">
                <p className="font-titre text-[17px] leading-6 font-semibold text-bleu">
                  Aucune skill trouvée pour cette recherche.
                </p>
                <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-encre">
                  Essaie un autre mot-clé ou explore une autre catégorie — la bibliothèque
                  s&apos;enrichit régulièrement.
                </p>
                <Bouton asChild variante="secondaire" className="mt-5">
                  <Link href="/skills">Réinitialiser les filtres</Link>
                </Bouton>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {skills.map((s) => (
                  <CarteSkill key={s.id} skill={s} />
                ))}
              </div>
            )}

            {skills.length > 0 && (
              <p className="mt-6 text-center text-[13px] leading-5 text-encre">
                {total} skill{total > 1 ? "s" : ""} au total — page {pageFinale} sur {pages}
              </p>
            )}
            {skills.length > 0 && (
              <Pagination
                page={pageFinale}
                pages={pages}
                base="/skills"
                params={{ q, categorie }}
              />
            )}
          </>
        )}

        {/* ── Section d'introduction (SEO) ─────────────────────────── */}
        <section className="mt-14 rounded-carte border border-bordure bg-white p-6 shadow-carte sm:p-10">
          <h2 className="font-titre text-[22px] leading-8 font-bold text-bleu">
            Des skills IA prêtes à l&apos;emploi, traduites en français
          </h2>
          <div className="mt-4 grid gap-6 text-[15px] leading-7 text-encre lg:grid-cols-2">
            <div className="space-y-3">
              <p>
                Une « skill » est un module qu&apos;on branche sur un assistant IA pour lui donner
                une compétence précise : réviser du code, analyser des données, rédiger un audit,
                automatiser une veille… Cette bibliothèque rassemble les meilleures skills du
                moment, testées puis traduites en français, pour que tu saches exactement ce que
                fait chacune avant de l&apos;installer.
              </p>
              <p>
                Chaque fiche réunit l&apos;essentiel : à quoi sert la skill, comment
                l&apos;installer avec une commande copiable, des images qui montrent son rendu et
                des conseils d&apos;usage concrets. La recherche et les onglets de catégories
                permettent de repérer en quelques secondes la skill qui correspond à ton besoin du
                jour.
              </p>
            </div>
            <div className="space-y-3">
              <p>
                La bibliothèque s&apos;adresse aussi bien aux créateurs qui veulent produire plus
                vite qu&apos;aux développeurs qui cherchent des briques réutilisables. Les fiches
                sont ajoutées et mises à jour régulièrement, et les compétences les plus
                consultées remontent naturellement en tête de liste.
              </p>
              <p>
                L&apos;accès complet (toutes les fiches, images et commandes) est inclus dans les
                plans Premium (Pro et Entreprise) — qui débloquent aussi les tutoriels
                Intermédiaire et Avancé, les notes avec export et l&apos;assistant IA sans quota.
              </p>
            </div>
          </div>
          <ul className="mt-6 flex flex-wrap gap-2">
            {[
              "Traduites en français",
              "Installation en un clic",
              "Images et rendu vérifiés",
              "Mise à jour régulière",
            ].map((point) => (
              <li
                key={point}
                className="inline-flex items-center gap-1.5 rounded-full border border-violet/30 bg-violet/5 px-3.5 py-1.5 text-[13px] leading-4 font-medium text-violet"
              >
                <Clock className="size-3.5" aria-hidden /> {point}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}