﻿// app/blog/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 87 — LE BLOG DEVIENT PROFESSIONNELLEMENT RESPONSIVE et
// accueille LES 4 SÉRIES WEBGIVERSE.
//
//   1. Héros « verre » aligné sur le reste du site (/categories) :
//      hauteurs fluides, titres lisibles du 320 px au 4K, aucune
//      coupure de mot sauvage (text-balance / text-pretty).
//   2. Section « Séries Webgiverse » : 4 cartes colorées (Découverte,
//      Academy, Comparatif, Automation) en grille 1 → 2 → 4 colonnes,
//      zones tactiles ≥ 44 px, compteur d'articles réel.
//   3. Grille d'articles pro : cartes à image 16:9 constante (visuel
//      de remplacement si pas d'image), hauteurs égales, badge de
//      série, lien « Lire l'article » aligné en bas — via la carte
//      partagée components/commun/carte-article.tsx.
//   4. Aucun débordement horizontal : paddings px-4 partout, images
//      object-cover, textes line-clamp.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { listerSeriesAvecCompteur, meilleureSerie, type ArticleSerie } from "@/lib/series";
import { SERIES_WEBGIVERSE } from "@/content/series";
import { IconeSerie } from "@/components/commun/icone-serie";
import { CarteArticle } from "@/components/commun/carte-article";

export const metadata: Metadata = {
  title: "Blog — Guides et conseils IA",
  description:
    "Guides, comparatifs et conseils pour utiliser l'intelligence artificielle au quotidien, organisés en 4 séries : Découverte, Academy, Comparatif et Automation.",
};
export const dynamic = "force-dynamic";

export default async function PageBlog() {
  const [articles, series] = await Promise.all([
    prisma.article.findMany({
      where: { type: "BLOG", statut: "PUBLIE" },
      orderBy: { publieLe: "desc" },
      take: 50,
    }) as Promise<ArticleSerie[]>,
    listerSeriesAvecCompteur(),
  ]);

  return (
    <>
      {/* ── Héros ───────────────────────────────────────────────── */}
      <section className="hero-verre border-b border-bordure">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center lg:py-16">
          <p className="text-[13px] font-semibold tracking-wide text-sky-500 uppercase">
            Webgiverse
          </p>
          <h1 className="mx-auto mt-2 max-w-3xl text-balance text-h2 font-titre font-semibold sm:text-h1">
            Le blog <span className="texte-degrade">Webgiverse</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-[16px] leading-6 text-encre">
            Guides, comparatifs et conseils pour choisir et maîtriser les meilleurs
            outils IA — organisés en quatre séries pour avancer pas à pas.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 lg:py-16">
        {/* ── Les 4 séries Webgiverse ─────────────────────────────── */}
        <section aria-labelledby="titres-series">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="titres-series" className="text-[22px] leading-7 font-titre font-semibold text-bleu sm:text-[26px]">
                Les séries Webgiverse
              </h2>
              <p className="mt-1 text-[15px] text-encre">
                Quatre collections thématiques pour trouver exactement ce que tu cherches.
              </p>
            </div>
            <Link
              href="/series"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[7px] border border-bordure bg-white px-4 text-[14px] font-medium text-bleu transition hover:border-violet hover:text-sky-500"
            >
              Voir toutes les séries
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>

          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {SERIES_WEBGIVERSE.map((serie) => {
              const compteur = series.find((s) => s.serie.slug === serie.slug);
              const nb = compteur?.nbArticles ?? 0;
              return (
                <li key={serie.slug}>
                  <Link
                    href={`/series/${serie.slug}`}
                    className={`group flex h-full min-h-44 flex-col rounded-carte border border-bordure bg-white p-5 shadow-carte transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${serie.couleur.survol} hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(11,27,63,0.12)]`}
                  >
                    <span
                      className={`inline-flex size-11 items-center justify-center rounded-[10px] ${serie.couleur.pastille}`}
                    >
                      <IconeSerie nom={serie.icone} className="size-6" />
                    </span>
                    <h3 className="mt-4 text-[17px] leading-6 font-titre font-semibold text-bleu transition group-hover:text-sky-500">
                      {serie.nom}
                    </h3>
                    <p className="mt-1.5 text-[14px] leading-5 text-encre">{serie.accroche}</p>
                    <p className="mt-auto flex items-center gap-1 pt-4 text-[13px] font-semibold text-sky-500">
                      {nb > 0 ? `${nb} article${nb > 1 ? "s" : ""}` : "Bientôt disponible"}
                      <ArrowRight
                        className="size-3.5 transition group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── Tous les articles ───────────────────────────────────── */}
        <section aria-labelledby="titres-articles" className="mt-14">
          <h2 id="titres-articles" className="text-[22px] leading-7 font-titre font-semibold text-bleu sm:text-[26px]">
            Tous les articles
          </h2>
          <p className="mt-1 text-[15px] text-encre">
            Les derniers guides publiés, toutes séries confondues.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <CarteArticle key={a.id} article={a} serie={meilleureSerie(a)} />
            ))}
          </div>

          {articles.length === 0 && (
            <Carte className="mx-auto mt-6 max-w-xl p-8 text-center">
              <p className="text-[16px] font-semibold text-bleu">Aucun article pour le moment</p>
              <p className="mt-2 text-[14px] text-encre">
                Le premier guide arrive bientôt. Reviens vite !
              </p>
            </Carte>
          )}
        </section>
      </div>
    </>
  );
}