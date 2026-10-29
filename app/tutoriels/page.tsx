// app/tutoriels/page.tsx
// Lot 12 — page Tutoriels vidéo IA « style Aixploria » : héros avec
// chiffres réels (nombre de tutoriels, heures de contenu), barre de
// filtres (recherche, niveau, tri, pastilles d'outils), grille de cartes
// vidéo 16:9, bandeau d'accès Premium (la lecture est réservée aux
// abonnés Pro / Entreprise) et section d'introduction SEO.
// Charte Webgiverse : accents violets, dégradé de marque sur le mot-clé
// du titre. Polices inchangées (Space Grotesk titres, Inter texte).
import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Lock, Play, Search, Sparkles } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { listerTutos, compterTutoStats, outilsDesTutos } from "@/lib/queries";
import { CarteTuto } from "@/components/tutoriels/carte-tuto";
import { SelectAuto } from "@/components/tutoriels/select-auto";
import { auth } from "@/auth";
import { premiumActif } from "@/lib/premium";
import { BarreOutils } from "@/components/tutoriels/barre-outils";
import { Pagination } from "@/components/commun/pagination";

export const metadata: Metadata = {
  title: "Tutoriels vidéo IA — formations gratuites | Webgiverse",
  description:
    "Apprends à maîtriser ChatGPT, Claude, Gemini, Midjourney et les meilleurs outils IA grâce à une collection de tutoriels vidéo sélectionnés à la main.",
};

type Params = Promise<Record<string, string | string[] | undefined>>;

/** Lit le premier élément d'un paramètre GET (string | string[] | undefined). */
function val(c: string | string[] | undefined): string {
  return (Array.isArray(c) ? c[0] : c) ?? "";
}

export default async function TutorielsPage({ searchParams }: { searchParams: Params }) {
  const p = await searchParams;
  const q = val(p.q).slice(0, 80);
  const niveau = val(p.niveau);
  const outil = val(p.outil);
  const tri = val(p.tri);
const page = Math.max(1, Math.trunc(Number(val(p.page)) || 1)); // Lot 13 — pagination

// listerTutos borne la page au nombre réel de pages et renvoie
// { tutos, total, page, pages } — 16 tutoriels par page.
const [resultat, stats, tousOutils] = await Promise.all([
  listerTutos({ q, niveau, outil, tri, page }),
    compterTutoStats(),
    outilsDesTutos(),
  ]);
const { tutos, page: pageFinale, pages } = resultat;

  // État Premium du visiteur : le bandeau d'accès s'adapte (un abonné
  // Pro / Entreprise ne doit pas voir une pub pour s'abonner).
  const session = await auth();
  const premium = session?.user?.id ? await premiumActif(session.user.id) : false;

  const niveaux = [
    { valeur: "", libelle: "Tous les niveaux" },
    { valeur: "debutant", libelle: "Débutant" },
    { valeur: "intermediaire", libelle: "Intermédiaire" },
    { valeur: "avance", libelle: "Avancé" },
  ];
  const tris = [
    { valeur: "pertinence", libelle: "Pertinence" },
    { valeur: "nouveautes", libelle: "Nouveautés" },
    { valeur: "vues", libelle: "Plus vus" },
    { valeur: "az", libelle: "A → Z" },
    { valeur: "za", libelle: "Z → A" },
  ];

  const heures = Math.round(stats.minutes / 60);

  return (
    <>
      {/* ── Héros ───────────────────────────────────────────────── */}
      <section className="hero-verre border-b border-bordure">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center lg:py-16">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
            <Play className="size-3.5" aria-hidden /> Tutoriels IA
          </p>
          <h1 className="mx-auto mt-4 max-w-[760px] text-[30px] leading-9 font-bold tracking-tight text-bleu sm:text-h2">
            Tutoriels <span className="texte-degrade">vidéo IA</span> : formations gratuites
          </h1>
          <p className="mesure mx-auto mt-3 text-[16px] leading-7 text-encre">
            Apprends à maîtriser les meilleurs outils IA en vidéo : chaque tutoriel est
            sélectionné à la main et se regarde directement sur Webgiverse, sans changer de site.
          </p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <li className="rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
              {stats.total} tutoriels
            </li>
            <li className="rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
              {heures}h+ de contenu
            </li>
            <li className="rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
              100 % gratuits à parcourir
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
                <Sparkles className="size-4.5 text-violet" aria-hidden />
              ) : (
                  <Lock className="size-4.5 text-violet" aria-hidden />
              )}
            </span>
            {premium ? (
              <p className="max-w-2xl text-[14px] leading-6 text-encre">
                <strong className="font-semibold text-bleu">Ton accès Premium est actif</strong> : toutes
                les vidéos se regardent ici même, sans quitter Webgiverse. Bonne lecture&nbsp;!
              </p>
            ) : (
                <p className="max-w-2xl text-[14px] leading-6 text-encre">
                  Parcours toute la collection librement. La <strong className="font-semibold text-bleu">lecture
                    des tutoriels est réservée aux abonnés Premium</strong> (Pro ou Entreprise) : la vidéo se
                  lance ici même, sans quitter Webgiverse.
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

        {/* ── Barre de filtres ───────────────────────────────────── */}
        <form
          method="get"
          action="/tutoriels"
          className="mb-6 flex flex-col gap-3 rounded-carte border border-bordure bg-white p-4 shadow-carte sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-encre" aria-hidden />
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Rechercher un tuto (ChatGPT, Midjourney, n8n…)"
              aria-label="Rechercher un tutoriel"
              className="min-h-11 w-full rounded-full border border-bordure bg-white pr-4 pl-11 text-[15px] leading-5 text-bleu placeholder:text-encre/60 focus:border-violet focus:outline-none"
            />
          </div>
          <input type="hidden" name="outil" value={outil} />
          <SelectAuto nom="niveau" valeur={niveau} libelle="Filtrer par niveau" options={niveaux} />
          <SelectAuto nom="tri" valeur={tri || "pertinence"} libelle="Trier les tutoriels" options={tris} />
          <Bouton type="submit" variante="secondaire" taille="sm" className="sm:hidden">
            Filtrer
          </Bouton>
        </form>

        {/* ── Pastilles d'outils (filtre par outil) ───────────────── */}
        {/* ── Pastilles d'outils : 14 premiers outils + bouton dépliant ── */}
        <BarreOutils outils={tousOutils} actif={outil} q={q} niveau={niveau} tri={tri} />

        {/* ── Résultats ───────────────────────────────────────────── */}
        {tutos.tutos.length === 0 ? (
          <div className="rounded-carte border border-bordure bg-white p-12 text-center shadow-carte">
            <p className="font-titre text-[17px] leading-6 font-semibold text-bleu">
              Aucun tutoriel trouvé pour cette recherche.
            </p>
            <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-encre">
              Essaie un autre mot-clé, change de niveau, ou explore un autre outil —
              la collection s&apos;agrandit chaque semaine.
            </p>
            <Bouton asChild variante="secondaire" className="mt-5">
              <Link href="/tutoriels">Réinitialiser les filtres</Link>
            </Bouton>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {tutos.tutos.map((t: Parameters<typeof CarteTuto>[0]["tuto"]) => (
                <CarteTuto key={t.id} tuto={t} />
              ))}
            </div>
            {/* ── Pagination (Lot 13) ─────────────────────────────── */}
            {tutos.tutos.length > 0 && (
              <Pagination
                page={pageFinale}
                pages={pages}
                base="/tutoriels"
                params={{ q, niveau, outil, tri }}
              />
            )}
          </>
        )}

        {/* ── Section d'introduction (SEO) ────────────────────────── */}
        <section className="mt-14 rounded-carte border border-bordure bg-white p-6 shadow-carte sm:p-10">
          <h2 className="font-titre text-[22px] leading-8 font-bold text-bleu">
            Tutoriels vidéo IA : des formations gratuites pour tous les niveaux
          </h2>
          <div className="mt-4 grid gap-6 text-[15px] leading-7 text-encre lg:grid-cols-2">
            <div className="space-y-3">
              <p>
                Cette bibliothèque rassemble des tutoriels vidéo consacrés aux meilleurs outils
                d&apos;intelligence artificielle : ChatGPT, Claude, Gemini, Midjourney, NotebookLM,
                n8n, Cursor et bien d&apos;autres. Chaque vidéo est testée avant d&apos;être ajoutée,
                pour ne garder que les formations vraiment utiles — de la prise en main pour
                débutants aux techniques avancées.
              </p>
              <p>
                Les filtres par niveau (débutant, intermédiaire, avancé) et par outil permettent
                de trouver en quelques secondes la formation qui correspond à ton besoin du
                moment : rédiger de bons prompts, créer des images ou des vidéos IA, automatiser
                ton travail, coder une application complète sans être développeur.
              </p>
            </div>
            <div className="space-y-3">
              <p>
                La lecture se fait directement sur Webgiverse : pas de navigation entre dix
                onglets, tu regardes le tuto, tu appliques, puis tu retrouves l&apos;outil
                correspondant dans l&apos;annuaire pour le tester à ton tour. C&apos;est
                l&apos;expérience d&apos;apprentissage la plus fluide possible.
              </p>
              <p>
                L&apos;accès à la lecture est inclus dans les plans Premium (Pro et Entreprise).
                L&apos;abonnement débloque aussi les favoris et listes illimités, l&apos;assistant
                IA sans quota et les suggestions prioritaires — pour apprendre et avancer sans
                limite.
              </p>
            </div>
          </div>
          <ul className="mt-6 flex flex-wrap gap-2">
            {[
              "Sélection testée à la main",
              "Débutant comme expert",
              "Lecture intégrée au site",
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
        </section>

        {/* ── CTA : proposer un tutoriel ──────────────────────────── */}
        <section className="mt-8 rounded-carte border border-bordure bg-white p-6 shadow-carte sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-carte bg-violet/10">
                <Play className="size-5 text-violet" aria-hidden />
              </span>
              <div>
                <h2 className="font-titre text-[18px] leading-6 font-semibold text-bleu">
                  Tu connais un excellent tuto IA ?
                </h2>
                <p className="mt-1 max-w-xl text-[14px] leading-6 text-encre">
                  Suggère-le à l&apos;équipe : s&apos;il est vraiment bon, il rejoindra la
                  collection et aidera toute la communauté Webgiverse.
                </p>
              </div>
            </div>
            <Bouton asChild variante="secondaire">
              <Link href="/contact">Proposer un tutoriel</Link>
            </Bouton>
          </div>
        </section>
      </div>
    </>
  );
}