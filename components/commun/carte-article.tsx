// components/commun/carte-article.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 87 — CARTE D'ARTICLE PROFESSIONNELLE, partagée par /blog et
// /series/[slug]. Corrige les défauts d'alignement de l'ancienne
// grille du blog :
//   • l'image garde un ratio 16:9 CONSTANT (fini les hauteurs qui
//     varient et les cartes décalées selon la présence d'une image) ;
//   • sans image, un visuel de remplacement aux couleurs de la série
//     s'affiche (aucune carte « plus courte » que les autres) ;
//   • le badge de série + la date, le titre et l'extrait ont une
//     hauteur maîtrisée (line-clamp) → toutes les cartes d'une ligne
//     finissent au même niveau ;
//   • grille sous-jacente 1 colonne sur mobile → 2 (sm) → 3 (lg).
// ─────────────────────────────────────────────────────────────────
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Carte } from "@/components/ui/carte";
import { formatteDate } from "@/lib/dates";
import { IconeSerie } from "@/components/commun/icone-serie";
import type { SerieWebgiverse } from "@/content/series";

export type ArticleCarte = {
  id: string;
  slug: string;
  titre: string;
  extrait: string | null;
  image: string | null;
  publieLe: Date | null;
};

export function CarteArticle({
  article,
  serie,
  libelleSource = "Blog",
}: {
  article: ArticleCarte;
  /** série attribuée à l'article (badge coloré) — optionnel */
  serie?: SerieWebgiverse | null;
  /** texte du badge quand il n'y a pas de série (Blog / Actualité…) */
  libelleSource?: string;
}) {
  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group block h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
      aria-label={article.titre}
    >
      <Carte className="flex h-full flex-col overflow-hidden transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_28px_rgba(11,27,63,0.12)]">
        {/* Visuel : ratio 16:9 garanti, avec ou sans image */}
        {article.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image}
            alt=""
            loading="lazy"
            className="aspect-[16/9] w-full object-cover"
          />
        ) : (
          <div
            className={`aspect-[16/9] w-full ${serie ? serie.couleur.pastille : "bg-gris"} flex items-center justify-center`}
          >
            {serie ? (
              <IconeSerie nom={serie.icone} className="size-10 opacity-40" />
            ) : (
              <span className="font-titre text-[15px] font-semibold tracking-wide text-sky-500/50 uppercase">
                Webgiverse
              </span>
            )}
          </div>
        )}

        <div className="flex flex-1 flex-col p-5">
          {/* Badge série + date, sur une seule ligne qui coupe proprement */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {serie ? (
              <span
                className={`inline-flex items-center rounded-[7px] px-2 py-0.5 text-[12px] leading-4 font-semibold ${serie.couleur.badge}`}
              >
                {serie.court}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-[7px] bg-sky-500/10 px-2 py-0.5 text-[12px] leading-4 font-semibold text-sky-500">
                {libelleSource}
              </span>
            )}
            <span className="text-[13px] text-encre">{formatteDate(article.publieLe)}</span>
          </div>

          <h3 className="mt-3 text-[17px] leading-6 font-titre font-semibold text-bleu transition group-hover:text-sky-500">
            {article.titre}
          </h3>

          {article.extrait && (
            <p className="mt-2 line-clamp-3 text-[14px] leading-5 text-encre">{article.extrait}</p>
          )}

          {/* Poussé en bas → le lien s'aligne sur toutes les cartes */}
          <p className="mt-auto flex items-center gap-1 pt-4 text-[13px] font-semibold text-sky-500">
            Lire l&apos;article
            <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden />
          </p>
        </div>
      </Carte>
    </Link>
  );
}