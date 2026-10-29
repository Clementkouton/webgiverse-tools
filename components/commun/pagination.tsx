// components/commun/pagination.tsx
// Lot 13 — pagination réutilisable (pages /tutoriels et /outils).
// Composant SERVEUR : il ne rend que des liens <Link> qui conservent
// tous les paramètres de filtre en cours (recherche, niveau, catégorie,
// tri…) et ne remplacent que « page ». La page 1 est toujours accessible
// via une URL propre (sans ?page=1).
// Charte Webgiverse : pastilles arrondies comme les filtres, page
// active au dégradé de marque (ciel → violet), focus violet. Aucune
// couleur ni police ajoutée.
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Params = Record<string, string | string[] | undefined>;

/** Construit l'URL d'une page en conservant les autres paramètres GET. */
export function hrefPage(base: string, params: Params, page: number): string {
  const usp = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(params)) {
    if (cle === "page" || valeur === undefined) continue;
    const v = Array.isArray(valeur) ? valeur[0] : valeur;
    if (v) usp.set(cle, v);
  }
  if (page > 1) usp.set("page", String(page));
  const qs = usp.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Numéros affichés de façon compacte : 1 … 5 6 7 … 12 (bornes toujours visibles). */
function plage(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const centre = new Set<number>();
  for (const n of [page - 1, page, page + 1, 2, total - 1]) {
    if (n >= 2 && n <= total - 1) centre.add(n);
  }
  const liste: (number | "…")[] = [1];
  let precedent = 1;
  for (const n of [...centre].sort((a, b) => a - b)) {
    if (n - precedent > 1) liste.push("…");
    liste.push(n);
    precedent = n;
  }
  if (total - precedent > 1) liste.push("…");
  liste.push(total);
  return liste;
}

const PASTILLE =
  "inline-flex min-h-11 items-center gap-1 rounded-full border border-bordure bg-white px-4 text-[14px] leading-5 font-medium text-bleu transition hover:border-violet hover:text-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet";
const DESACTIVEE =
  "inline-flex min-h-11 items-center gap-1 rounded-full border border-bordure bg-white px-4 text-[14px] leading-5 font-medium text-bleu opacity-40";

export function Pagination({
  page,
  pages,
  base,
  params,
}: {
  page: number; // page courante (≥ 1)
  pages: number; // nombre total de pages (≥ 1)
  base: string; // ex. "/tutoriels" ou "/outils"
  params: Params; // filtres en cours à conserver dans les liens
}) {
  if (pages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={hrefPage(base, params, page - 1)} className={PASTILLE} aria-label="Page précédente">
          <ChevronLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">Précédent</span>
        </Link>
      ) : (
        <span className={DESACTIVEE} aria-hidden="true">
          <ChevronLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">Précédent</span>
        </span>
      )}

      {plage(page, pages).map((n, i) =>
        n === "…" ? (
          <span key={`points-${i}`} className="px-1 text-[14px] font-medium text-encre/60" aria-hidden="true">
            …
          </span>
        ) : n === page ? (
          <span
            key={n}
            aria-current="page"
            className="inline-flex min-h-11 items-center rounded-full bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] px-4 text-[14px] leading-5 font-semibold text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)]"
          >
            {n}
          </span>
        ) : (
          <Link key={n} href={hrefPage(base, params, n)} className={PASTILLE} aria-label={`Page ${n}`}>
            {n}
          </Link>
        ),
      )}

      {page < pages ? (
        <Link href={hrefPage(base, params, page + 1)} className={PASTILLE} aria-label="Page suivante">
          <span className="hidden sm:inline">Suivant</span>
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className={DESACTIVEE} aria-hidden="true">
          <span className="hidden sm:inline">Suivant</span>
          <ChevronRight className="size-4" aria-hidden />
        </span>
      )}
    </nav>
  );
}