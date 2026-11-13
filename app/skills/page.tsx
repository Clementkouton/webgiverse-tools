// app/skills/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 43 — Bibliothèque de Skills IA (/skills).
//
// NOUVEAU LOT 43 — APERÇU SANS VERROU (ta demande) :
//   · La LISTE est en libre parcours pour TOUT LE MONDE : plus de
//     flou, plus de pastille « Aperçu — contenu réservé », plus de
//     grand bloc verrou. Recherche, onglets, grille complète et
//     pagination identiques pour tous.
//   · L'ACCÈS AU DÉTAIL d'une skill (/skills/[slug]) reste RÉSERVÉ
//     AUX ABONNÉS PREMIUM — le verrou vit sur la fiche.
//   · Non-abonné : bandeau fin d'information (une ligne).
//   · Abonné : bandeau discret « Ton accès Premium est actif ».
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
import { Pagination } from "@/components/commun/pagination";
import { Bouton } from "@/components/ui/bouton";

export const metadata: Metadata = {
  title: "Skills IA prêtes à l'emploi — Webgiverse",
  description:
    "Bibliothèque de skills IA prêtes à installer, traduites en français : productivité, développement, données, automatisation. Fiches détaillées réservées aux abonnés Premium.",
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

  // Verrou du DÉTAIL — calculé côté serveur (lib/acces-skills.ts).
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
        <div className="mx-auto max-w-7xl px-4 pt-12 pb-12 text-center lg:pt-16 lg:pb-16">
          <p className="inline-flex items-center gap-2 rounded-[7px]  not-italic border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-sky-500">
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
            <li className="rounded-[7px]  not-italic border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-sky-500">
              {stats.total} skills
            </li>
            <li className="rounded-[7px]  not-italic border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-sky-500">
              {stats.categories} catégories
            </li>
            <li className="rounded-[7px]  not-italic border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-sky-500">
              Nouveautés régulières
            </li>
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 lg:py-12">
        {/* ── Bandeau selon le statut (fin, UNE ligne — plus de bloc
               verrou sur la liste, c'était le point demandé) ──────── */}
        <div
          className={
            premium
              ? "mb-8 flex flex-wrap items-center justify-between gap-3 rounded-carte border border-violet/30 bg-violet/5 p-4 sm:px-6"
              : "mb-8 flex flex-wrap items-center justify-between gap-3 rounded-carte border border-bordure bg-white p-4 shadow-carte sm:px-6"
          }
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-carte bg-violet/10">
              {premium ? (
                <Sparkles className="size-4.5 text-sky-500" aria-hidden />
              ) : (
                  <Lock className="size-4.5 text-sky-500" aria-hidden />
              )}
            </span>
            {premium ? (
              <p className="max-w-2xl text-[14px] leading-6 text-encre">
                <strong className="font-semibold text-bleu">Ton accès Premium est actif</strong> :
                les {stats.total} fiches détaillées, les commandes d&apos;installation et les
                retours d&apos;usage sont débloqués. Bonne exploration&nbsp;!
              </p>
            ) : (
              <p className="max-w-2xl text-[14px] leading-6 text-encre">
                <strong className="font-semibold text-bleu">Parcours libre</strong> : explore les{" "}
                {stats.total} skills ci-dessous. L&apos;accès aux{" "}
                <strong className="font-semibold text-bleu">fiches détaillées</strong> (article
                complet, commande d&apos;installation, retours d&apos;usage) est{" "}
                <strong className="font-semibold text-bleu">réservé aux abonnés Premium</strong>.
              </p>
            )}
          </div>
          {!premium && (
            <Bouton asChild taille="sm">
              <Link href="/tarifs">
                <Sparkles aria-hidden /> Passer Premium
              </Link>
            </Bouton>
          )}
        </div>

        {/* ── Recherche + onglets + grille + pagination — POUR TOUS ── */}
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
              className="min-h-11 w-full rounded-[7px]  not-italic border border-bordure bg-white pr-4 pl-11 text-[15px] leading-5 text-bleu placeholder:text-encre/60 focus:border-violet focus:outline-none"
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
                ? "rounded-[7px]  not-italic bg-violet px-4 py-2 text-[13px] leading-4 font-semibold text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)]"
                : "rounded-[7px]  not-italic border border-bordure bg-white px-4 py-2 text-[13px] leading-4 font-medium text-bleu transition hover:border-violet hover:text-sky-500"
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
                  ? "rounded-[7px]  not-italic bg-violet px-4 py-2 text-[13px] leading-4 font-semibold text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)]"
                  : "rounded-[7px]  not-italic border border-bordure bg-white px-4 py-2 text-[13px] leading-4 font-medium text-bleu transition hover:border-violet hover:text-sky-500"
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
                L&apos;accès complet (articles détaillés, commandes d&apos;installation, épinglage
                dans ton espace et retours d&apos;usage) est inclus dans les plans Premium (Pro et
                Entreprise) — qui débloquent aussi les tutoriels Intermédiaire et Avancé, les
                notes avec export et l&apos;assistant IA sans quota.
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
                className="inline-flex items-center gap-1.5 rounded-[7px]  not-italic border border-violet/30 bg-violet/5 px-3.5 py-1.5 text-[13px] leading-4 font-medium text-sky-500"
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