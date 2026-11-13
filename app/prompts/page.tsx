// app/prompts/page.tsx
// ─────────────────────────────────────────────────────────────────
// LOT 69 — RESTAURATION DE LA BIBLIOTHÈQUE PUBLIQUE /prompts.
// Ce fichier avait été écrasé par erreur avec le code de
// app/dashboard/prompts/page.tsx (« Mes prompts ») : la route /prompts
// affichait donc « Mes prompts » au lieu du catalogue public. Le vrai
// code (lot 17 + correctif design) est restauré ci-dessous à
// l'identique, avec seulement :
//   · le CTA Premium qui reçoit les 3 lignes « vitesse » du nouveau
//     bouton de marque (LignesBouton — components/ui/bouton.tsx) ;
//   · les pastilles actives des filtres alignées sur le nouveau
//     dégradé de marque (#027bfd → #0344fc → #301ff8 → #5e06f1 →
//     #a203fc) pour rester cohérentes avec la nouvelle variante
//     primaire des boutons.
// ─────────────────────────────────────────────────────────────────
// LOT 77 — le champ de recherche annonce le FILTRE PAR MOTS
// INDÉPENDANTS (le filtrage lui-même est fait en base par
// listerPrompts : chaque mot doit être présent, dans n'importe quel
// ordre). Texte seul : aucune classe ni mise en page changée.
// Lot 17 — Bibliothèque de prompts IA : héros avec chiffres réels,
// bandeau d'accès Premium (lecture + copie réservées aux abonnés
// Pro / Entreprise), barre de filtres (recherche, catégorie, type,
// tri), onglets « Catégories / Métiers » (correctif : deux filtres
// bien séparés, style godofprompt), grille paginée (16 par page) et
// section d'introduction. Charte Webgiverse inchangée : accents
// violets, dégradé de marque sur le mot-clé du titre.
import type { Metadata } from "next";
import type { ComponentProps } from "react";
import Link from "next/link";
import { Lock, Search, Sparkles, TerminalSquare } from "lucide-react";
import { Bouton, LignesBouton } from "@/components/ui/bouton";
import {
  listerPrompts,
  listerPromptCategories,
  compterPromptStats,
  compterPromptsParRole,
} from "@/lib/queries";
import { CartePrompt } from "@/components/prompts/carte-prompt";
import { OngletsFiltres } from "@/components/prompts/onglets-filtres";
import { SelectAuto } from "@/components/tutoriels/select-auto";
import { Pagination } from "@/components/commun/pagination";
import { auth } from "@/auth";
import { premiumActif } from "@/lib/premium";
import { TRIS_PROMPTS, nomRole } from "@/lib/prompts-utils";

export const metadata: Metadata = {
  title: "Bibliothèque de prompts IA — catalogue métier | Webgiverse",
  description:
    "Des centaines de prompts IA prêts à l'emploi, en français, classés par catégorie et par métier : marketing, code, SEO, vente… Testés sur ChatGPT, Claude, Gemini et Midjourney.",
};

type Params = Promise<Record<string, string | string[] | undefined>>;

/** Lit le premier élément d'un paramètre GET (string | string[] | undefined). */
function val(c: string | string[] | undefined): string {
  return (Array.isArray(c) ? c[0] : c) ?? "";
}

const PASTILLE =
  "inline-flex min-h-11 items-center gap-1.5 rounded-[7px]  not-italic border border-bordure bg-white px-4 text-[13px] leading-4 font-medium text-bleu transition hover:border-violet hover:text-sky-500";

// LOT 69 — pastille/puce active : même dégradé de marque que la
// variante « primaire » du Bouton (mesuré sur le logo « Tools »).
const PASTILLE_ACTIVE =
  "inline-flex min-h-11 items-center rounded-[7px]  not-italic bg-[linear-gradient(100deg,#027bfd,#0344fc_25%,#301ff8_50%,#5e06f1_72%,#a203fc)] px-4 text-[13px] leading-4 font-semibold text-white shadow-[0_2px_12px_rgba(94,6,241,0.28)]";

export default async function PagePrompts({ searchParams }: { searchParams: Params }) {
  const p = await searchParams;
  const q = val(p.q).slice(0, 80);
  const categorie = val(p.categorie);
  const role = val(p.role);
  const type = val(p.type);
  const tri = val(p.tri);
  const page = Math.max(1, Math.trunc(Number(val(p.page)) || 1));

  const [resultat, categories, stats, compteurRoles] = await Promise.all([
    listerPrompts({ q, categorie, role, type, tri, page }),
    listerPromptCategories(),
    compterPromptStats(),
    compterPromptsParRole(),
  ]);
  const { prompts, page: pageFinale, pages } = resultat;

  // État Premium du visiteur : le bandeau s'adapte (un abonné Pro /
  // Entreprise ne doit pas voir une pub pour s'abonner).
  const session = await auth();
  const premium = session?.user?.id ? await premiumActif(session.user.id) : false;

  const types = [
    { valeur: "", libelle: "Tous les types" },
    { valeur: "texte", libelle: "Texte" },
    { valeur: "image", libelle: "Image" },
    { valeur: "code", libelle: "Code" },
  ];

  return (
    <>
      {/* ── Héros ───────────────────────────────────────────────── */}
      <section className="hero-verre border-b border-bordure">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center lg:py-16">
          <p className="inline-flex items-center gap-2 rounded-[7px]  not-italic border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-sky-500">
            <TerminalSquare className="size-3.5" aria-hidden /> Bibliothèque de prompts
          </p>
          <h1 className="mx-auto mt-4 max-w-[760px] text-[30px] leading-9 font-bold tracking-tight text-bleu sm:text-h2">
            Des <span className="texte-degrade">prompts IA</span> prêts à l&apos;emploi, en français
          </h1>
          <p className="mesure mx-auto mt-3 text-[16px] leading-7 text-encre">
            Des prompts métiers testés sur ChatGPT, Claude, Gemini et Midjourney : choisis ta
            catégorie, copie, remplace les variables et lance-toi — sans repartir de zéro.
          </p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <li className="rounded-[7px]  not-italic border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-sky-500">
              {stats.total} prompts
            </li>
            <li className="rounded-[7px]  not-italic border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-sky-500">
              {stats.categories} catégories
            </li>
            <li className="rounded-[7px]  not-italic border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-sky-500">
              24 métiers couverts
            </li>
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 lg:py-12">
        {/* ── Bandeau d'accès Premium ─────────────────────────────── */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-carte border border-violet/30 bg-violet/5 p-4 sm:px-6">
          <div className="flex items-start gap-3">
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
                lis et copie tous les prompts complets, sans limite. Bonne productivité&nbsp;!
              </p>
            ) : (
              <p className="max-w-2xl text-[14px] leading-6 text-encre">
                Parcours tout le catalogue librement. La <strong className="font-semibold text-bleu">lecture
                et la copie des prompts sont réservées aux abonnés Premium</strong> (Pro ou
                Entreprise) — comme les tutoriels vidéo.
              </p>
            )}
          </div>
          {!premium && (
            <Bouton asChild taille="sm">
              <Link href="/tarifs">
                <LignesBouton /> Débloquer l&apos;accès
              </Link>
            </Bouton>
          )}
        </div>

        {/* ── Barre de filtres ───────────────────────────────────── */}
        <form
          method="get"
          action="/prompts"
          className="mb-6 flex flex-col gap-3 rounded-carte border border-bordure bg-white p-4 shadow-carte sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-encre" aria-hidden />
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Rechercher un prompt — un ou plusieurs mots, dans n'importe quel ordre (ex. : email vente)"
              aria-label="Rechercher un prompt"
              className="min-h-11 w-full rounded-[7px]  not-italic border border-bordure bg-white pr-4 pl-11 text-[15px] leading-5 text-bleu placeholder:text-encre/60 focus:border-violet focus:outline-none"
            />
          </div>
          <input type="hidden" name="categorie" value={categorie} />
          <input type="hidden" name="role" value={role} />
          <SelectAuto nom="type" valeur={type} libelle="Filtrer par type" options={types} />
          <SelectAuto
            nom="tri"
            valeur={tri || "pertinence"}
            libelle="Trier les prompts"
            options={TRIS_PROMPTS}
          />
          <Bouton type="submit" variante="secondaire" taille="sm" className="sm:hidden">
            Filtrer
          </Bouton>
        </form>

        {/* ── Onglets « Catégories / Métiers » ────────────────────── */}
        {/* Correctif : les deux familles de filtres étaient collées sans
            repère visuel. Deux onglets (style godofprompt) les séparent
            désormais. L'onglet ouvert au chargement suit le filtre actif
            de l'URL (?categorie=… ouvre Catégories, ?role=… ouvre Métiers). */}
        <OngletsFiltres
          ongletInitial={categorie ? "categories" : role ? "metiers" : "categories"}
          totalCategories={categories.length}
          totalMetiers={compteurRoles.length}
          panneauCategories={
            <nav aria-label="Catégories de prompts" className="flex flex-wrap items-center gap-2">
              <Link
                href={hrefSans("categorie", { q, categorie, role, type, tri })}
                className={
                  !categorie
                    ? PASTILLE_ACTIVE
                    : `${PASTILLE} border-violet bg-violet/5 text-sky-500`
                }
              >
                Toutes
              </Link>
              {categories.map((c: { slug: string; nom: string; _count: { prompts: number } }) =>
                c.slug === categorie ? (
                  <span
                    key={c.slug}
                    aria-current="true"
                    className={PASTILLE_ACTIVE}
                  >
                    {c.nom} <span className="opacity-80">{c._count.prompts}</span>
                  </span>
                ) : (
                  <Link
                    key={c.slug}
                    href={`/prompts?categorie=${encodeURIComponent(c.slug)}`}
                    className={PASTILLE}
                  >
                    {c.nom} <span className="text-encre/60">{c._count.prompts}</span>
                  </Link>
                ),
              )}
            </nav>
          }
          panneauMetiers={
            <nav aria-label="Métiers" className="flex flex-wrap items-center gap-2">
              {compteurRoles.slice(0, 12).map((r: { slug: string; total: number }) =>
                r.slug === role ? (
                  <span
                    key={r.slug}
                    aria-current="true"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-[7px]  not-italic border border-violet bg-violet/10 px-4 text-[13px] leading-4 font-semibold text-sky-500"
                  >
                    {nomRole(r.slug)} <span className="opacity-70">{r.total}</span>
                  </span>
                ) : (
                  <Link
                    key={r.slug}
                    href={`/prompts/roles/${encodeURIComponent(r.slug)}`}
                    className={PASTILLE}
                  >
                    {nomRole(r.slug)} <span className="text-encre/60">{r.total}</span>
                  </Link>
                ),
              )}
              <Link href="/prompts/roles" className="text-[13px] font-semibold text-sky-500 hover:underline">
                Tous les métiers →
              </Link>
            </nav>
          }
        />

        {/* ── Résultats ───────────────────────────────────────────── */}
        {prompts.length === 0 ? (
          <div className="rounded-carte border border-bordure bg-white p-12 text-center shadow-carte">
            <p className="font-titre text-[17px] leading-6 font-semibold text-bleu">
              Aucun prompt trouvé pour cette recherche.
            </p>
            <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-encre">
              Essaie un autre mot-clé, change de type ou explore une autre catégorie — le
              catalogue s&apos;agrandit chaque semaine.
            </p>
            <Bouton asChild variante="secondaire" className="mt-5">
              <Link href="/prompts">Réinitialiser les filtres</Link>
            </Bouton>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {prompts.map((prompt: ComponentProps<typeof CartePrompt>["prompt"], index: number) => (
              <CartePrompt key={index} prompt={prompt} />
            ))}
          </div>
        )}

        {/* ── Pagination ──────────────────────────────────────────── */}
        {prompts.length > 0 && (
          <Pagination
            page={pageFinale}
            pages={pages}
            base="/prompts"
            params={{ q, categorie, role, type, tri }}
          />
        )}

        {/* ── Section d'introduction (SEO) ────────────────────────── */}
        <section className="mt-14 rounded-carte border border-bordure bg-white p-6 shadow-carte sm:p-10">
          <h2 className="font-titre text-[22px] leading-8 font-bold text-bleu">
            Une bibliothèque de prompts français pour chaque métier
          </h2>
          <div className="mt-4 grid gap-6 text-[15px] leading-7 text-encre lg:grid-cols-2">
            <div className="space-y-3">
              <p>
                Un bon prompt fait la différence entre une réponse générique et un livrable
                exploitable. Chaque prompt de cette bibliothèque fixe le rôle de l&apos;IA, le
                contexte, la tâche et le format de sortie : tu obtiens un résultat utilisable dès
                la première exécution, sur ChatGPT, Claude, Gemini, Grok ou Mistral.
              </p>
              <p>
                Les catégories suivent les vrais besoins : marketing et réseaux sociaux, code et
                développement, SEO, vente, éducation, finance, juridique, ressources humaines…
                Les prompts d&apos;image ciblent Midjourney, Flux et Nano Banana ; les prompts de
                code sont prêts pour Claude et ChatGPT.
              </p>
            </div>
            <div className="space-y-3">
              <p>
                Le principe est toujours le même : ouvre un prompt, copie-le, remplace les
                variables entre accolades <code className="rounded bg-gris px-1.5 py-0.5 font-mono text-[13px]">{"{{ainsi}}"}</code>{" "}
                par ton produit, ton audience ou ton sujet — la structure, elle, ne change pas.
                C&apos;est elle qui fait le travail.
              </p>
              <p>
                La lecture et la copie des prompts complets sont incluses dans les plans Premium
                (Pro et Entreprise), avec les tutoriels vidéo, les favoris illimités et
                l&apos;assistant IA sans quota — tout ce qu&apos;il faut pour avancer vite.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

/** Lien « Toutes » : conserve les filtres en cours, retire la catégorie. */
function hrefSans(
  cle: string,
  params: Record<string, string | string[] | undefined>,
): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === cle || k === "page" || v === undefined) continue;
    const valeur = Array.isArray(v) ? v[0] : v;
    if (valeur) usp.set(k, valeur);
  }
  const qs = usp.toString();
  return qs ? `/prompts?${qs}` : "/prompts";
}