// app/series/[slug]/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 87 — LA PAGE D'UNE SÉRIE (/series/webgiverse-decouverte, …)
//
//   • Héros aux couleurs de la série : icône, nom, description,
//     compteur d'articles réels ;
//   • Grille d'articles classés automatiquement (mots-clés du titre
//     et de l'extrait), réutilise la carte partagée du blog ;
//   • En bas : les 3 autres séries pour enchaîner la lecture ;
//   • Slug inconnu → 404. Aucun article → état vide encourageant.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { listerArticlesDeSerie, meilleureSerie } from "@/lib/series";
import { SERIES_WEBGIVERSE } from "@/content/series";
import { IconeSerie } from "@/components/commun/icone-serie";
import { CarteArticle } from "@/components/commun/carte-article";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const serie = SERIES_WEBGIVERSE.find((s) => s.slug === slug);
  if (!serie) return { title: "Série introuvable" };
  return { title: `${serie.nom} — Blog Webgiverse`, description: serie.description };
}

export default async function PageSerie({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resultat = await listerArticlesDeSerie(slug);
  if (!resultat) notFound();

  const { serie, articles } = resultat;
  const autresSeries = SERIES_WEBGIVERSE.filter((s) => s.slug !== serie.slug);

  return (
    <>
      {/* ── Héros aux couleurs de la série ──────────────────────── */}
      <section className={`border-b border-bordure bg-gradient-to-b ${serie.couleur.heros}`}>
        <div className="mx-auto max-w-7xl px-4 py-12 lg:py-16">
          <Link
            href="/series"
            className="inline-flex min-h-11 items-center gap-1 text-[14px] font-semibold text-sky-500 hover:underline"
          >
            <ChevronLeft className="size-4" aria-hidden /> Toutes les séries
          </Link>

          <div className="mt-6 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <span
              className={`inline-flex size-16 shrink-0 items-center justify-center rounded-[14px] ${serie.couleur.pastille}`}
            >
              <IconeSerie nom={serie.icone} className="size-8" />
            </span>
            <div>
              <h1 className="text-balance text-h2 font-titre font-semibold sm:text-h1">
                {serie.nom}
              </h1>
              <p className="mt-2 max-w-2xl text-pretty text-[16px] leading-6 text-encre">
                {serie.description}
              </p>
              <p className="mt-3 text-[14px] font-semibold text-sky-500">
                {articles.length > 0
                  ? `${articles.length} article${articles.length > 1 ? "s" : ""} dans cette série`
                  : "Le premier article de cette série arrive bientôt"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Articles de la série ─────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-12 lg:py-16">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <CarteArticle
              key={a.id}
              article={a}
              serie={meilleureSerie(a) ?? serie}
            />
          ))}
        </div>

        {articles.length === 0 && (
          <div className="mx-auto max-w-xl rounded-carte border border-bordure bg-white p-8 text-center shadow-carte">
            <span
              className={`mx-auto inline-flex size-14 items-center justify-center rounded-[12px] ${serie.couleur.pastille}`}
            >
              <IconeSerie nom={serie.icone} className="size-7" />
            </span>
            <p className="mt-4 text-[16px] font-semibold text-bleu">
              Aucun article dans « {serie.court} » pour l&apos;instant
            </p>
            <p className="mt-2 text-[14px] leading-6 text-encre">
              On écrit déjà les premiers contenus de cette série. En attendant,
              découvre les articles déjà publiés sur le blog.
            </p>
            <Link
              href="/blog"
              className="mt-5 inline-flex min-h-11 items-center rounded-[7px] bg-sky-500 px-5 text-[14px] font-semibold text-white transition hover:bg-sky-500/90"
            >
              Aller au blog
            </Link>
          </div>
        )}

        {/* ── Les 3 autres séries ─────────────────────────────────── */}
        <section aria-label="Les autres séries" className="mt-14 border-t border-bordure pt-10">
          <h2 className="text-[20px] leading-7 font-titre font-semibold text-bleu">
            Continue avec les autres séries
          </h2>
          <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {autresSeries.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/series/${s.slug}`}
                  className={`group flex h-full items-start gap-3.5 rounded-carte border border-bordure bg-white p-4 shadow-carte transition duration-200 ${s.couleur.survol} hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(11,27,63,0.12)]`}
                >
                  <span
                    className={`inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] ${s.couleur.pastille}`}
                  >
                    <IconeSerie nom={s.icone} className="size-5" />
                  </span>
                  <span>
                    <span className="block text-[15px] leading-5 font-titre font-semibold text-bleu transition group-hover:text-sky-500">
                      {s.nom}
                    </span>
                    <span className="mt-1 block text-[13px] leading-5 text-encre">
                      {s.accroche}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}