// app/skills/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 38 — BIBLIOTHÈQUE DE SKILLS IA (/skills), RÉSERVÉE AUX ABONNÉS.
// · Verrou serveur (lib/acces-skills.ts) : non premium → cartes voilées
//   (teaser flouté) + bloc « Réservé aux abonnés ».
// · Recherche + onglets de catégories + pagination serveur
//   (composant commun Pagination, 12 skills par page).
// · Charte Webgiverse : accents violets, dégradé de marque, mêmes
//   espacements que /tutoriels. Aucune couleur ni police ajoutée.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { Blocks, Lock, Search, Sparkles } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { Pagination } from "@/components/commun/pagination";
import { auth } from "@/auth";
import { accesSkills } from "@/lib/acces-skills";
import { listerSkills, categoriesSkills, compterSkillsStats } from "@/lib/queries-skills";
import { CarteSkill } from "@/components/skills/carte-skill";
import { BlocVerrouSkills } from "@/components/skills/bloc-verrou-skills";

export const metadata: Metadata = {
  title: "Skills IA en français — bibliothèque réservée aux abonnés | Webgiverse",
  description:
    "Une bibliothèque de skills IA prêtes à installer pour tes agents : reviews complètes traduites en français, commande d'installation, dépôt GitHub. Réservé aux abonnés Premium.",
};

type Params = Promise<Record<string, string | string[] | undefined>>;

/** Lit le premier élément d'un paramètre GET (string | string[] | undefined). */
function val(c: string | string[] | undefined): string {
  return (Array.isArray(c) ? c[0] : c) ?? "";
}

/** Convertit ?page=N en entier ≥ 1 ; toute valeur douteuse → page 1. */
function numeroPage(valeur: string | string[] | undefined): number {
  const brut = typeof valeur === "string" ? Math.trunc(Number(valeur)) : NaN;
  return Number.isFinite(brut) && brut >= 1 ? brut : 1;
}

export default async function PageSkills({ searchParams }: { searchParams: Params }) {
  const p = await searchParams;
  const q = val(p.q).slice(0, 80);
  const categorie = val(p.categorie);
  const page = numeroPage(p.page);

  // Accès : le verrou est calculé côté serveur, à partir de la base.
  const session = await auth();
  const acces = await accesSkills(session?.user?.id);

  // Non-premium : teaser limité à une page. Premium : liste complète paginée.
  const [{ skills, total, page: pageFinale, pages }, categories, stats] = await Promise.all([
    listerSkills(acces.peutAcceder ? { q, categorie, page } : { q, categorie, page: 1 }),
    categoriesSkills(),
    compterSkillsStats(),
  ]);

  return (
    <>
      {/* ── Héros ───────────────────────────────────────────────── */}
      <section className="hero-verre border-b border-bordure">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center lg:py-16">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
            <Blocks className="size-3.5" aria-hidden /> Skills IA
          </p>
          <h1 className="mx-auto mt-4 max-w-[760px] text-[30px] leading-9 font-bold tracking-tight text-bleu sm:text-h2">
            Des <span className="texte-degrade">skills prêtes à installer</span> pour tes agents IA
          </h1>
          <p className="mesure mx-auto mt-3 text-[16px] leading-7 text-encre">
            Chaque skill est analysée, testée et traduite en français : tu sais ce qu&apos;elle fait,
            ses forces, ses pièges — et tu l&apos;installes en une commande copiée d&apos;un clic.
          </p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <li className="rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
              {stats.total} skills traduites
            </li>
            <li className="rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
              {stats.categories} catégories
            </li>
            <li className="rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
              Réservé aux abonnés Premium
            </li>
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 lg:py-12">
        {/* ── Verrou pour les non-premium ─────────────────────────── */}
        {!acces.peutAcceder ? (
          <>
            <BlocVerrouSkills variante="page" connecte={acces.connecte} />
            {/* Teaser : les cartes existent mais voilées, sans liens */}
            {skills.length > 0 && (
              <div
                aria-hidden="true"
                className="pointer-events-none mt-8 grid select-none gap-4 opacity-50 blur-[3px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {skills.slice(0, 8).map((s) => (
                  <CarteSkill key={s.id} skill={s} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* ── Barre de recherche ──────────────────────────────── */}
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
                  placeholder="Rechercher une skill (PPT, TikTok, design, code…)"
                  aria-label="Rechercher une skill"
                  className="min-h-11 w-full rounded-full border border-bordure bg-white pr-4 pl-11 text-[15px] leading-5 text-bleu placeholder:text-encre/60 focus:border-violet focus:outline-none"
                />
              </div>
              <input type="hidden" name="categorie" value={categorie} />
              <Bouton type="submit" variante="secondaire" taille="sm" className="sm:hidden">
                Rechercher
              </Bouton>
            </form>

            {/* ── Onglets de catégories ───────────────────────────── */}
            <div className="mb-8 flex flex-wrap items-center gap-2">
              {[{ nom: "", total: stats.total }, ...categories].map((c) => {
                const actif = c.nom === categorie;
                const href = c.nom
                  ? `/skills?categorie=${encodeURIComponent(c.nom)}`
                  : "/skills";
                return (
                  <Link
                    key={c.nom || "toutes"}
                    href={href}
                    aria-current={actif ? "page" : undefined}
                    className={
                      actif
                        ? "inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] px-4 text-[14px] leading-5 font-semibold text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)]"
                        : "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-bordure bg-white px-4 text-[14px] leading-5 font-medium text-bleu transition hover:border-violet hover:text-violet"
                    }
                  >
                    {c.nom || "Toutes"}
                    <span className={actif ? "text-white/80" : "text-encre/60"}>{c.total}</span>
                  </Link>
                );
              })}
            </div>

            {/* ── Résultats ───────────────────────────────────────── */}
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
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {skills.map((s) => (
                  <CarteSkill key={s.id} skill={s} />
                ))}
              </div>
            )}

            {/* ── Pagination (composant commun, lot 13) ───────────── */}
            {skills.length > 0 && (
              <Pagination page={pageFinale} pages={pages} base="/skills" params={{ q, categorie }} />
            )}
          </>
        )}

        {/* ── Section d'introduction (SEO) ────────────────────────── */}
        <section className="mt-14 rounded-carte border border-bordure bg-white p-6 shadow-carte sm:p-10">
          <h2 className="font-titre text-[22px] leading-8 font-bold text-bleu">
            Des skills IA analysées, traduites et prêtes à installer
          </h2>
          <div className="mt-4 grid gap-6 text-[15px] leading-7 text-encre lg:grid-cols-2">
            <div className="space-y-3">
              <p>
                Une « skill » est un module que tu ajoutes à ton agent IA pour lui donner une
                compétence précise : générer des présentations professionnelles, transformer
                une base de code en cours, créer des visuels de marque, rédiger des scripts
                TikTok qui accrochent… Chaque fiche de cette bibliothèque résume ce que la
                skill fait vraiment, ce que la review a vérifié, et comment l&apos;installer
                en une commande.
              </p>
              <p>
                Toutes les fiches sont traduites en français : plus besoin de déchiffrer des
                reviews anglaises. Les images, la commande d&apos;installation et le dépôt
                GitHub d&apos;origine sont affichés directement ici — tu restes sur Webgiverse
                jusqu&apos;au moment de cloner ou d&apos;installer.
              </p>
            </div>
            <div className="space-y-3">
              <p>
                La bibliothèque est incluse dans les plans Premium (Pro et Entreprise), comme
                les tutoriels Intermédiaire et Avancé, les notes avec export et l&apos;assistant
                IA des tutoriels. Ton abonnement débloque donc tout l&apos;écosystème
                d&apos;apprentissage : annuaire d&apos;outils, prompts, tutoriels et skills.
              </p>
              <p>
                Envie de contribuer ? Tu connais une skill excellente qui manque ici&nbsp;?
                Propose-la via la page contact&nbsp;: l&apos;équipe la teste et l&apos;ajoute
                si elle vaut vraiment le coup.
              </p>
            </div>
          </div>
          <ul className="mt-6 flex flex-wrap gap-2">
            {["Traduction française complète", "Installation en 1 commande", "Reviews vérifiées", "Mises à jour régulières"].map(
              (point) => (
                <li
                  key={point}
                  className="inline-flex items-center gap-1.5 rounded-full border border-violet/30 bg-violet/5 px-3.5 py-1.5 text-[13px] leading-4 font-medium text-violet"
                >
                  <Sparkles className="size-3.5" aria-hidden /> {point}
                </li>
              ),
            )}
          </ul>
          {!acces.peutAcceder && (
            <p className="mt-6 inline-flex items-center gap-2 rounded-carte border border-bordure bg-gris px-4 py-3 text-[14px] leading-6 text-encre">
              <Lock className="size-4 shrink-0 text-violet" aria-hidden />
              Les fiches floutées ci-dessus sont un aperçu : passe Premium pour tout débloquer.
            </p>
          )}
        </section>
      </div>
    </>
  );
}