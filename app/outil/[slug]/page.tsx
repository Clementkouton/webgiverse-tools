//@app/outil/[slug]/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, ChevronRight, ExternalLink, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { obtenirOutil, outilsAlternatifs } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Bouton } from "@/components/ui/bouton";
import { Carte } from "@/components/ui/carte";
import { LogoOutil } from "@/components/commun/logo-outil";
import { BoutonFavori } from "@/components/outil/bouton-favori";
import CarteOutilView from "@/components/outil/carte-outil";
import SectionAvis from "@/components/avis/section-avis";
import BoutonVote from "@/components/vote/bouton-vote";

export const revalidate = 3600;

export async function generateStaticParams() {
  const outils = await prisma.tool.findMany({ where: { statut: "PUBLIE" }, select: { slug: true } });
  return outils.map((o) => ({ slug: o.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const outil = await obtenirOutil(slug);
  if (!outil) return {};
  return {
    title: `${outil.nom} : avis, tarifs et alternatives`,
    description: outil.description.slice(0, 155),
    alternates: { canonical: `/outil/${outil.slug}` },
    openGraph: { title: `${outil.nom} — Webgiverse`, description: outil.description.slice(0, 155) },
  };
}

export default async function PageOutil({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const outil = await obtenirOutil(slug);
  if (!outil) notFound();
  const alternatives = await outilsAlternatifs(
    outil.id, outil.categories.map((c) => c.categorie.slug)
  );

  // Note moyenne et nombre d'avis, calculés côté serveur :
  // 1) affichés sous le titre (règle Google : la note doit être visible) ;
  // 2) injectés dans les données structurées (étoiles dans les résultats Google).
  const statsAvis = await prisma.avis.aggregate({
    where: { outilId: outil.id },
    _avg: { note: true },
    _count: { _all: true },
  });
  const moyenne = statsAvis._avg.note ? Number(statsAvis._avg.note.toFixed(1)) : null;
  const nombreAvis = statsAvis._count._all;

  const verifie = outil.verifieLe
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(outil.verifieLe) : null;

  const donneesStructurees = {
    "@context": "https://schema.org", "@type": "SoftwareApplication",
    name: outil.nom, description: outil.description, url: outil.url,
    applicationCategory: "BusinessApplication", inLanguage: outil.langues,
    offers: { "@type": "Offer", price: outil.tarifMin ?? 0, priceCurrency: "EUR" },
    // Étoiles Google : uniquement s'il existe de vrais avis utilisateurs
    // (sans avis, Google ignore ou pénalise une note inventée).
    ...(moyenne && nombreAvis > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: moyenne,
        ratingCount: nombreAvis,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
  };

  return (
    <article className="mx-auto max-w-7xl px-4 py-10 lg:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(donneesStructurees) }} />

      <nav aria-label="Fil d'Ariane" className="mb-6 flex flex-wrap items-center gap-1 text-[14px] leading-5 text-encre">
        <Link href="/" className="hover:text-violet">Accueil</Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <Link href="/outils" className="hover:text-violet">Outils IA</Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="text-bleu">{outil.nom}</span>
      </nav>

      {/* En-tête */}
      <Carte className="p-6 lg:p-8">
        <div className="flex flex-wrap items-start gap-5">
          <LogoOutil nom={outil.nom} logo={outil.logo} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[28px] leading-9 font-semibold sm:text-h2">{outil.nom}</h1>
              {outil.type === "AGENT" && <Badge variante="agent">Agent</Badge>}
              {outil.gratuit && <Badge variante="gratuit">Gratuit</Badge>}
              {outil.openSource && <Badge variante="source">Open source</Badge>}
            </div>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px] leading-5 text-encre">
              {/* ✅ La relation vers Category s'appelle `categorie` */}
              {outil.categories.map((c) => (
                <Link key={c.categorie.slug} href={`/categorie/${c.categorie.slug}`} className="font-medium text-violet hover:underline">
                  {c.categorie.nom}
                </Link>
              ))}
              {verifie && <span>Vérifié le {verifie}</span>}
            </p>
            {moyenne && nombreAvis > 0 && (
              <p className="mt-2 flex items-center gap-2 text-[14px] leading-5 text-encre" aria-label={`Note moyenne ${moyenne} sur 5, d'après ${nombreAvis} avis`}>
                <span className="flex items-center gap-0.5" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={i < Math.round(moyenne) ? "size-4 fill-amber-400 text-amber-400" : "size-4 text-encre/30"} />
                  ))}
                </span>
                <span className="font-semibold text-encre">{moyenne.toLocaleString("fr-FR")}/5</span>
                <span>basée sur {nombreAvis} avis</span>
              </p>
            )}
          </div>
        </div>
        <p className="mesure mt-6 text-[17px] leading-7 text-encre">{outil.description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Bouton asChild>
            <a href={outil.url} target="_blank" rel="noopener noreferrer">
              Voir le site officiel <ExternalLink aria-hidden />
            </a>
          </Bouton>
          <BoutonFavori outilId={outil.id} slug={outil.slug} />
          <BoutonVote slug={outil.slug} />
        </div>
      </Carte>

      {/* Détails */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {outil.fonctions.length > 0 && (
          <Carte className="p-6">
            <h2 className="font-titre text-h3 font-semibold">Fonctions principales</h2>
            <ul className="mt-4 grid gap-3">
              {outil.fonctions.map((f) => (
                <li key={f} className="flex gap-3 text-[16px] leading-6 text-encre">
                  <Check className="mt-1 size-4 shrink-0 text-violet" aria-hidden /> {f}
                </li>
              ))}
            </ul>
          </Carte>
        )}
        <Carte className="p-6">
          <h2 className="font-titre text-h3 font-semibold">Tarifs et accès</h2>
          <dl className="mt-4 grid gap-4">
            <div><dt className="text-legende font-medium text-encre">Tarif indicatif</dt>
              <dd className="mt-1 text-[16px] leading-6">{outil.tarif}</dd></div>
            <div><dt className="text-legende font-medium text-encre">Langues</dt>
              <dd className="mt-1 text-[16px] leading-6">{outil.langues.join(", ")}</dd></div>
            <div><dt className="text-legende font-medium text-encre">Niveau recommandé</dt>
              <dd className="mt-1 text-[16px] leading-6">{outil.niveau}</dd></div>
            <div><dt className="text-legende font-medium text-encre">Objectifs couverts</dt>
              <dd className="mt-1 text-[16px] leading-6">{outil.objectifs.join(", ")}</dd></div>
          </dl>
          {verifie && <p className="mt-4 text-[13px] leading-5 text-encre">Tarif vérifié le {verifie}. Confirme toujours sur le site officiel avant de t'abonner.</p>}
        </Carte>
        {outil.casUsage.length > 0 && (
          <Carte className="p-6 lg:col-span-2">
            <h2 className="font-titre text-h3 font-semibold">Cas d'usage</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {outil.casUsage.map((cu) => (
                <li key={cu} className="rounded-champ bg-gris p-4 text-[16px] leading-6 text-encre">{cu}</li>
              ))}
            </ul>
          </Carte>
        )}

        <SectionAvis slug={outil.slug} />
      </div>

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <section className="mt-12">
          <h2 className="text-h3 font-semibold">Alternatives à {outil.nom}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {alternatives.map((a) => <CarteOutilView key={a.id} outil={a} />)}
          </div>
          <Bouton variante="secondaire" className="mt-6" asChild>
            <Link href={`/comparer?outils=${outil.slug}`}>Comparer avec un autre outil <ArrowRight aria-hidden /></Link>
          </Bouton>
        </section>
      )}
    </article>
  );
}