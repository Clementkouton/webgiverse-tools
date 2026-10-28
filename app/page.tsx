import Link from "next/link";
import { ArrowRight, ChevronRight, ExternalLink, Sparkles, Star } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/badge";
import { Carte } from "@/components/ui/carte";
import { Accordeon, ItemAccordeon } from "@/components/ui/accordeon";
import CarteOutilView from "@/components/outil/carte-outil";
import { BoutonCopier } from "@/components/commun/bouton-copier";
import { FormulaireNewsletter } from "@/components/commun/formulaire-newsletter";
import { IconeCategorie } from "@/components/commun/icone-categorie";
import { SectionPlans } from "@/components/tarifs/section-plans";
import { ACTU, ARTICLES, FAQ, PROMPTS } from "@/content/accueil";
import { TEMOIGNAGES } from "@/content/temoignages";
import { compterStats, listerCategories, outilsMisEnAvant, listerOutils } from "@/lib/queries";
import VuRecemment from "@/components/visites/vu-recemment";

// La section Premium lit la session elle-même (dans SectionPlans) pour
// afficher « connexion d'abord » aux visiteurs non connectés → rendu
// dynamique (lecture du cookie, sans base de données).
export const dynamic = "force-dynamic";

function TitreSection({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[26px] leading-8 font-semibold sm:text-h2">{children}</h2>;
}

export default async function Accueil() {
  const [stats, enAvant, nouveautes, categories] = await Promise.all([
    compterStats(), outilsMisEnAvant(),
    listerOutils({ tri: "recente", page: 1 }),
    listerCategories(),
  ]);
  const compteurs = [
    { valeur: stats.outils, libelle: "outils référencés" },
    { valeur: stats.agents, libelle: "agents IA" },
    { valeur: stats.categories, libelle: "catégories" },
  ];

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero-verre border-b border-bordure">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center lg:py-24">
          <h1 className="mx-auto max-w-[860px] text-[34px] leading-[42px] font-bold tracking-tight sm:text-h1">
            Trouve le <span className="texte-degrade">bon outil IA</span> pour ton projet
          </h1>
          <p className="mesure mx-auto mt-5 text-center text-[18px] leading-7 text-encre">
            L'annuaire francophone des outils IA, testés et expliqués simplement. Apprendre · Créer · Réussir.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Bouton taille="lg" asChild>
              <Link href="/outils">Explorer l'annuaire <ArrowRight aria-hidden /></Link>
            </Bouton>
            <Bouton variante="secondaire" taille="lg" asChild>
              <Link href="/assistant"><Sparkles aria-hidden /> Lancer l'assistant</Link>
            </Bouton>
          </div>
          <dl className="mt-12 flex flex-wrap justify-center gap-8 sm:gap-14">
            {compteurs.map((c) => (
              <div key={c.libelle} className="text-center">
                <dt className="sr-only">{c.libelle}</dt>
                <dd className="font-titre text-[32px] leading-10 font-bold text-violet">{c.valeur}</dd>
                <dd className="text-legende text-encre">{c.libelle}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <VuRecemment />
      {/* ── À la une (usage unique du magenta) ───────────────── */}
      <section className="bg-white py-14 lg:py-18">
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

      {/* ── Nouveautés ───────────────────────────────────────── */}
      <section className="py-14 lg:py-18">
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

      {/* ── Prompts et compétences d'agents ──────────────────── */}
      <section className="bg-white py-14 lg:py-18">
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

      {/* ── Catégories populaires ────────────────────────────── */}
      <section className="py-14 lg:py-18">
        <div className="mx-auto max-w-7xl px-4">
          <TitreSection>Catégories populaires</TitreSection>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((c) => (
              <Link key={c.slug} href={`/categorie/${c.slug}`}
                className="group flex flex-col items-start gap-3 rounded-carte border border-bordure bg-white p-5 shadow-carte transition hover:border-violet">
                <IconeCategorie nom={c.icone} />
                <span className="font-titre text-[16px] leading-6 font-semibold">{c.nom}</span>
                <span className="text-legende text-encre">{c._count.outils} outil{c._count.outils > 1 ? "s" : ""}</span>
              </Link>
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