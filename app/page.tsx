// app/page.tsx
// Lot 10 — accueil « style Aixploria » : héros avec barre de recherche
// (renvoie vers /outils?q=…), pastilles de réassurance, navigation par
// catégories en pastilles (comme la liste de catégories d'Aixploria),
// puis les sections maison : à la une, nouveautés, prompts, témoignages,
// plans Premium, actu, blog, FAQ, newsletter. Charte Webgiverse inchangée
// (accents violets, dégradé de marque, Space Grotesk + Inter).
// Lot 14 — vitrine « Tutoriels vidéo IA » : panneau bleu nuit avec halos
// dégradés, les 4 tutos les plus vus et des boutons vers /tutoriels.
// Lot 15 — accueil résilient : si la base est momentanément injoignable
// (coupure réseau, compute Neon endormi, pool de connexions saturé), les
// requêtes de l'accueil ne font plus planter la page : chaque section
// alimentée par la base disparaît proprement et les sections statiques
// (prompts, témoignages, plans, actu, blog, FAQ, newsletter) s'affichent.
import Link from "next/link";
import { ArrowRight, ChevronRight, ExternalLink, Play, Search, Sparkles, Star } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/badge";
import { Carte } from "@/components/ui/carte";
import { Accordeon, ItemAccordeon } from "@/components/ui/accordeon";
import CarteOutilView from "@/components/outil/carte-outil";
import { CarteTuto } from "@/components/tutoriels/carte-tuto";
import { BoutonCopier } from "@/components/commun/bouton-copier";
import { FormulaireNewsletter } from "@/components/commun/formulaire-newsletter";
import { SectionPlans } from "@/components/tarifs/section-plans";
import { ACTU, ARTICLES, FAQ, PROMPTS } from "@/content/accueil";
import { TEMOIGNAGES } from "@/content/temoignages";
import { compterStats, listerCategories, outilsMisEnAvant, listerOutils, listerTutos, compterTutoStats } from "@/lib/queries";
import VuRecemment from "@/components/visites/vu-recemment";

// La section Premium lit la session elle-même (dans SectionPlans) pour
// afficher « connexion d'abord » aux visiteurs non connectés → rendu
// dynamique (lecture du cookie, sans base de données).
export const dynamic = "force-dynamic";

/* ── Lot 15 — résilience de l'accueil ────────────────────────────────
   Enveloppe une requête de base de données : si elle échoue (Neon
   injoignable, pool de connexions épuisé…), on journalise l'erreur côté
   serveur et on rend la valeur de repli fournie, au lieu de faire
   échouer la page entière avec une erreur 500. */
async function avecRepli<T>(promesse: Promise<T>, repli: T): Promise<T> {
  try {
    return await promesse;
  } catch (erreur) {
    console.error("[accueil] Base de données injoignable — mode dégradé :", erreur);
    return repli;
  }
}

// Replis typés avec les VRAIS types de retour de lib/queries.ts :
// la page compile et s'affiche même quand la base ne répond pas.
type StatsAccueil = Awaited<ReturnType<typeof compterStats>>;
type ResultatOutils = Awaited<ReturnType<typeof listerOutils>>;
type StatsTutos = Awaited<ReturnType<typeof compterTutoStats>>;
type ResultatTutos = Awaited<ReturnType<typeof listerTutos>>;

const STATS_ACCUEIL_VIDE: StatsAccueil = { outils: 0, agents: 0, categories: 0 };
const RESULTAT_OUTILS_VIDE: ResultatOutils = { outils: [], total: 0, page: 1, pages: 1 };
const STATS_TUTOS_VIDE: StatsTutos = { total: 0, minutes: 0 };
const RESULTAT_TUTOS_VIDE: ResultatTutos = { tutos: [], total: 0, page: 1, pages: 1 };

function TitreSection({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[26px] leading-8 font-semibold sm:text-h2">{children}</h2>;
}

export default async function Accueil() {
  // Lot 15 — chaque requête est enveloppée dans un repli : en cas de panne
  // de la base, la requête renvoie sa valeur vide et la page continue de
  // se construire au lieu de renvoyer une erreur 500.
  const [stats, enAvant, nouveautes, categories, tutoStats, resultatTutos] = await Promise.all([
    avecRepli(compterStats(), STATS_ACCUEIL_VIDE),
    avecRepli(outilsMisEnAvant(), []),
    avecRepli(listerOutils({ tri: "recente", page: 1 }), RESULTAT_OUTILS_VIDE),
    avecRepli(listerCategories(), []),
    avecRepli(compterTutoStats(), STATS_TUTOS_VIDE),
    // Lot 14 — les 4 tutoriels les plus vus pour la vitrine de l'accueil.
    avecRepli(listerTutos({ tri: "vues", parPage: 4 }), RESULTAT_TUTOS_VIDE),
  ]);
  const tutoriels = resultatTutos.tutos;
  const heuresTutos = Math.round(tutoStats.minutes / 60);
  const compteurs = [
    { valeur: stats.outils, libelle: "outils référencés" },
    { valeur: stats.agents, libelle: "agents IA" },
    { valeur: stats.categories, libelle: "catégories" },
  ];

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero-verre border-b border-bordure">
        <div className="mx-auto max-w-7xl px-4 py-14 text-center lg:py-20">
          <h1 className="mx-auto max-w-[860px] text-[34px] leading-[42px] font-bold tracking-tight sm:text-h1">
            Trouve le <span className="texte-degrade">bon outil IA</span> pour ton projet
          </h1>
          <p className="mesure mx-auto mt-5 text-center text-[18px] leading-7 text-encre">
            L'annuaire francophone des outils IA, testés et expliqués simplement. Apprendre · Créer · Réussir.
          </p>

          {/* Barre de recherche (style Aixploria) : renvoie vers /outils?q=… */}
          <form
            action="/outils"
            method="get"
            className="mx-auto mt-8 flex w-full max-w-xl items-center gap-2 rounded-full border border-bordure bg-white p-1.5 pl-5 shadow-carte"
          >
            <Search className="size-5 shrink-0 text-encre" aria-hidden />
            <input
              type="search"
              name="q"
              required
              minLength={2}
              placeholder="Recherche un outil, un agent, un usage…"
              aria-label="Rechercher un outil IA"
              className="min-h-11 w-full min-w-0 flex-1 bg-transparent text-[15px] text-bleu outline-none placeholder:text-encre/60"
            />
            <Bouton type="submit">Rechercher</Bouton>
          </form>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Bouton taille="lg" asChild>
              <Link href="/outils">Explorer l'annuaire <ArrowRight aria-hidden /></Link>
            </Bouton>
            <Bouton variante="secondaire" taille="lg" asChild>
              <Link href="/assistant"><Sparkles aria-hidden /> Lancer l'assistant</Link>
            </Bouton>
          </div>
          <dl className="mt-10 flex flex-wrap justify-center gap-8 sm:gap-14">
            {compteurs.map((c) => (
              <div key={c.libelle} className="text-center">
                <dt className="sr-only">{c.libelle}</dt>
                {/* Lot 15 : en mode dégradé (base injoignable) on affiche
                    un tiret au lieu d'un trompeur « 0 ». */}
                <dd className="font-titre text-[32px] leading-10 font-bold text-violet">{c.valeur === 0 ? "—" : c.valeur}</dd>
                <dd className="text-legende text-encre">{c.libelle}</dd>
              </div>
            ))}
          </dl>
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            <li className="inline-flex items-center gap-1.5 rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
              Sélection 100 % manuelle
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
              Fiches mises à jour en continu
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
              100 % expliqué en français
            </li>
          </ul>
        </div>
      </section>

      <VuRecemment />

      {/* ── Parcourir par catégorie (pastilles, comme Aixploria) ─
          Lot 15 : section masquée si la base n'a pas répondu. */}
      {categories.length > 0 && (
      <section className="bg-white py-14 lg:py-18">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <TitreSection>Parcourir par catégorie</TitreSection>
            <Link href="/categories" className="inline-flex min-h-11 items-center gap-1 text-[15px] leading-5 font-semibold text-violet hover:underline">
              Toutes les catégories <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ul className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/categorie/${c.slug}`}
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-bordure bg-white px-4 text-[14px] leading-4 font-medium text-bleu transition hover:border-violet hover:text-violet">
                  {c.nom}
                  <span className="text-[12px] leading-4 font-semibold text-encre">{c._count.outils}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      )}

      {/* ── À la une (usage unique du magenta) — Lot 15 : masquée si
          la base n'a pas répondu. ─────────────────────────────── */}
      {enAvant.length > 0 && (
      <section className="py-14 lg:py-18">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <TitreSection>À la une</TitreSection>
            <Badge variante="magenta"><Star aria-hidden /> Sélection</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {enAvant.map((o) => <CarteOutilView key={o.id} outil={o} />)}
          </div>
        </div>
      </section>
      )}

      {/* ── Nouveautés — Lot 15 : masquée si la base n'a pas répondu ─ */}
      {nouveautes.outils.length > 0 && (
      <section className="bg-white py-14 lg:py-18">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-6 flex items-end justify-between gap-4">
            <TitreSection>Nouveautés</TitreSection>
            <Link href="/outils" className="inline-flex min-h-11 items-center gap-1 text-[15px] leading-5 font-semibold text-violet hover:underline">
              Tout voir <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {nouveautes.outils.slice(0, 8).map((o) => <CarteOutilView key={o.id} outil={o} />)}
          </div>
        </div>
      </section>
      )}

      {/* ── Tutoriels vidéo IA (Lot 14) ──────────────────────────── */}
      {/* Vitrine sombre qui fait ressortir les vignettes vidéo : panneau
          bleu nuit + halos dégradés de la charte, 4 tutos les plus vus,
          et deux portes d'entrée vers /tutoriels (lien « Voir tout » et
          bouton « Commencer à apprendre »).
          Lot 15 : section masquée si la base n'a pas répondu. */}
      {tutoriels.length > 0 && (
      <section className="py-14 lg:py-18">
        <div className="mx-auto max-w-7xl px-4">
          <div className="relative overflow-hidden rounded-carte bg-bleu p-6 shadow-carte sm:p-10">
            <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-violet/30 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-ciel/20 blur-3xl" />
            <div className="relative">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[13px] leading-4 font-semibold text-white">
                    <Play className="size-3.5" aria-hidden /> Tutoriels vidéo IA
                  </p>
                  <h2 className="mt-4 text-[26px] leading-8 font-semibold text-white sm:text-h2">
                    Apprends les outils IA <span className="texte-degrade-clair">en vidéo</span>
                  </h2>
                  <p className="mesure mt-2 max-w-2xl text-[15px] leading-6 text-white/70">
                    Des formations gratuites sélectionnées à la main : tu regardes le tutoriel
                    directement sur Webgiverse, puis tu testes l&apos;outil dans l&apos;annuaire.
                  </p>
                </div>
                <Link href="/tutoriels" className="inline-flex min-h-11 items-center gap-1 text-[15px] leading-5 font-semibold text-white hover:underline">
                  Tous les tutoriels <ChevronRight className="size-4" aria-hidden />
                </Link>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {tutoriels.map((t) => <CarteTuto key={t.id} tuto={t} />)}
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                <ul className="flex flex-wrap gap-2">
                  <li className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[13px] leading-4 font-semibold text-white">
                    {tutoStats.total} tutoriels
                  </li>
                  <li className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[13px] leading-4 font-semibold text-white">
                    {heuresTutos}h+ de contenu
                  </li>
                  <li className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[13px] leading-4 font-semibold text-white">
                    100 % gratuits à parcourir
                  </li>
                </ul>
                <Bouton taille="lg" asChild>
                  <Link href="/tutoriels">Commencer à apprendre <ArrowRight aria-hidden /></Link>
                </Bouton>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ── Prompts et compétences d'agents ──────────────────── */}
      <section className="py-14 lg:py-18">
        <div className="mx-auto max-w-7xl px-4">
          <TitreSection>Des prompts prêts à l&apos;emploi</TitreSection>
          <p className="mesure mt-2 mb-8 text-encre">Nos prompt packs Webgiverse, à copier dans ton assistant préféré.</p>
          <div className="grid gap-4 md:grid-cols-2">
            {PROMPTS.map((p) => (
              <Carte key={p.titre} className="flex flex-col p-5">
                <h3 className="font-titre text-h3 font-semibold">{p.titre}</h3>
                <p className="mt-1 text-legende text-encre">{p.description}</p>
                <p className="mt-4 mb-5 rounded-champ bg-gris p-4 text-[13px] leading-5 whitespace-pre-wrap text-encre">{p.texte}</p>
                <div className="mt-auto"><BoutonCopier texte={p.texte} libelle="Copier le prompt" /></div>
              </Carte>
            ))}
          </div>
        </div>
      </section>

      {/* ── Témoignages ──────────────────────────────────────── */}
      <section className="bg-white py-14 lg:py-18">
        <div className="mx-auto max-w-7xl px-4">
          <TitreSection>Ils ont trouvé leur outil sur Webgiverse</TitreSection>
          <p className="mesure mt-2 mb-8 text-encre">
            Freelances, étudiants et entrepreneurs francophones gagnent du temps chaque semaine.
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {TEMOIGNAGES.map((t) => {
              const initiales = t.nom
                .split(" ")
                .map((m) => m.charAt(0))
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <Carte key={t.nom} className="flex flex-col p-5">
                  <div className="flex items-center gap-0.5" aria-label={`Note : ${t.note} sur 5`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        aria-hidden
                        className={i < t.note ? "size-4 fill-amber-400 text-amber-400" : "size-4 text-bordure"}
                      />
                    ))}
                  </div>
                  <p className="mt-3 flex-1 text-[15px] leading-6 text-encre">« {t.texte} »</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet/10 font-titre text-[14px] font-bold text-violet">
                      {initiales}
                    </div>
                    <div className="min-w-0">
                      <p className="font-titre text-[14px] leading-5 font-semibold">{t.nom}</p>
                      <p className="text-[13px] leading-5 text-encre">{t.role}</p>
                    </div>
                  </div>
                </Carte>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Plans d'abonnement Premium ───────────────────────── */}
      {/* Visiteur non connecté → les boutons Pro/Entreprise envoient
          d'abord vers /connexion?suite=/tarifs (géré dans SectionPlans) */}
      <SectionPlans />

      {/* ── L'actu IA du jour ────────────────────────────────── */}
      <section className="bg-white py-14 lg:py-18">
        <div className="mx-auto max-w-7xl px-4">
          <TitreSection>L'actu IA du jour</TitreSection>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {ACTU.map((a) => (
              <Carte key={a.titre} className="flex flex-col p-5">
                <h3 className="font-titre text-[17px] leading-6 font-semibold">{a.titre}</h3>
                <p className="mt-2 text-legende text-encre">Source : {a.source}</p>
                <a href={a.url} target="_blank" rel="noopener noreferrer"
                  className="mt-auto inline-flex min-h-11 items-center gap-1 pt-3 text-[15px] leading-5 font-semibold text-violet hover:underline">
                  Lire la source <ExternalLink className="size-4" aria-hidden />
                </a>
              </Carte>
            ))}
          </div>
          <p className="mt-4 text-[13px] leading-5 text-encre">Sélection manuelle, liens vers les sources officielles.</p>
        </div>
      </section>

      {/* ── Derniers articles du blog ────────────────────────── */}
      <section className="py-14 lg:py-18">
        <div className="mx-auto max-w-7xl px-4">
          <TitreSection>Derniers articles du blog</TitreSection>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {ARTICLES.map((a) => (
              <Link key={a.titre} href="/blog" className="group flex flex-col rounded-carte border border-bordure bg-white p-5 shadow-carte transition hover:border-violet">
                <h3 className="font-titre text-[17px] leading-6 font-semibold group-hover:text-violet">{a.titre}</h3>
                <p className="mesure mt-2 text-[14px] leading-5 text-encre">{a.extrait}</p>
                <span className="mt-auto pt-4 text-[14px] leading-5 font-semibold text-violet">Bientôt disponible</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="bg-white py-14 lg:py-18">
        <div className="mx-auto max-w-3xl px-4">
          <TitreSection>Questions fréquentes</TitreSection>
          <Accordeon type="single" collapsible className="mt-8 grid gap-3">
            {FAQ.map((f) => <ItemAccordeon key={f.question} question={f.question} reponse={f.reponse} />)}
          </Accordeon>
          <div className="mt-6 text-center">
            <Link href="/faq" className="inline-flex min-h-11 items-center gap-1 text-[15px] leading-5 font-semibold text-violet hover:underline">
              Voir toutes les questions <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Newsletter ───────────────────────────────────────── */}
      <section className="py-14 lg:py-18">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <TitreSection>La veille IA, une fois par semaine</TitreSection>
          <p className="mesure mx-auto mt-2 mb-8 text-encre">
            Un e-mail court : nouveaux outils, changements de tarifs et un prompt actionnable. Zéro spam.
          </p>
          <FormulaireNewsletter />
        </div>
      </section>

      {/* ── Bandeau final ────────────────────────────────────── */}
      <section className="bg-bleu py-16 text-center lg:py-20">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-[28px] leading-9 font-semibold text-white sm:text-h2">
            Une marque. Une vision. <span className="texte-degrade-clair">Un avenir digital.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-6 text-white/70">
            Webgiverse t'accompagne pour apprendre, créer et réussir avec l'IA — en français, sans jargon.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Bouton taille="lg" asChild><Link href="/outils">Explorer l'annuaire <ArrowRight aria-hidden /></Link></Bouton>
            <Bouton variante="sombre" taille="lg" asChild><Link href="/assistant"><Sparkles aria-hidden /> Lancer l'assistant</Link></Bouton>
          </div>
        </div>
      </section>
    </>
  );
}