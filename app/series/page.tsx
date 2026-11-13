// app/series/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 87 — LE HUB DES SÉRIES WEBGIVERSE (/series)
// Présente les 4 séries en grandes cartes : icône colorée, nom,
// description complète, compteur d'articles réel et date du dernier
// article. Grille 1 → 2 colonnes dès tablette → très lisible sur
// mobile comme sur desktop.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listerSeriesAvecCompteur } from "@/lib/series";
import { formatteDate } from "@/lib/dates";
import { IconeSerie } from "@/components/commun/icone-serie";

export const metadata: Metadata = {
  title: "Séries Webgiverse — Découverte, Academy, Comparatif, Automation",
  description:
    "Explore les 4 séries du blog Webgiverse : Découverte (nouveaux outils et pépites), Academy (tutoriels pas à pas), Comparatif (ChatGPT vs Claude…) et Automation (agents et workflows).",
};
export const dynamic = "force-dynamic";

export default async function PageSeries() {
  const series = await listerSeriesAvecCompteur();
  const totalArticles = series.reduce((total, s) => total + s.nbArticles, 0);

  return (
    <>
      {/* ── Héros ───────────────────────────────────────────────── */}
      <section className="hero-verre border-b border-bordure">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center lg:py-16">
          <p className="text-[13px] font-semibold tracking-wide text-sky-500 uppercase">
            Webgiverse
          </p>
          <h1 className="mx-auto mt-2 max-w-3xl text-balance text-h2 font-titre font-semibold sm:text-h1">
            Les <span className="texte-degrade">séries</span> Webgiverse
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-[16px] leading-6 text-encre">
            Quatre collections thématiques, mises à jour à chaque nouvel article :
            {totalArticles > 0
              ? ` ${totalArticles} article${totalArticles > 1 ? "s" : ""} déjà classé${totalArticles > 1 ? "s" : ""}.`
              : " les premiers articles arrivent bientôt."}
          </p>
        </div>
      </section>

      {/* ── Les 4 séries ──────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-12 lg:py-16">
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {series.map(({ serie, nbArticles, dernierArticleLe }) => (
            <li key={serie.slug}>
              <Link
                href={`/series/${serie.slug}`}
                className={`group flex h-full flex-col rounded-carte border border-bordure bg-white p-6 shadow-carte transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 sm:p-7 ${serie.couleur.survol} hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(11,27,63,0.12)]`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={`inline-flex size-12 shrink-0 items-center justify-center rounded-[12px] ${serie.couleur.pastille}`}
                  >
                    <IconeSerie nom={serie.icone} className="size-6" />
                  </span>
                  <span className="rounded-[7px] bg-gris px-2.5 py-1 text-[12px] leading-4 font-semibold text-bleu">
                    {nbArticles > 0
                      ? `${nbArticles} article${nbArticles > 1 ? "s" : ""}`
                      : "Bientôt"}
                  </span>
                </div>

                <h2 className="mt-4 text-[20px] leading-7 font-titre font-semibold text-bleu transition group-hover:text-sky-500 sm:text-[22px]">
                  {serie.nom}
                </h2>
                <p className="mt-2 text-[15px] leading-6 text-encre">{serie.description}</p>

                <p className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-5 text-[13px]">
                  {dernierArticleLe && (
                    <span className="text-encre">
                      Dernier article : {formatteDate(dernierArticleLe)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 font-semibold text-sky-500">
                    Suivre la série
                    <ArrowRight
                      className="size-3.5 transition group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}