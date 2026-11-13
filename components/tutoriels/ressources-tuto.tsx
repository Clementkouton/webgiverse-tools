// components/tutoriels/ressources-tuto.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 30 — Section « Chapitres & ressources » d'une page tutoriel,
// DURCIE contre les débordements de texte (même design qu'avant) :
//   • min-w-0 + break-words sur les titres de chapitres ;
//   • overflow-wrap:anywhere sur les liens de ressources (une URL
//     très longue ne pousse plus la page en largeur) ;
//   • break-words sur les paragraphes de description.
// Affichée AU-DESSOUS du cadre « Mes notes sur ce tutoriel » (voir
// app/tutoriels/[slug]/page.tsx — Lot 30). La section n'est rendue que
// si le tuto possède une description exploitable.
// ─────────────────────────────────────────────────────────────────
import { BookOpen, ExternalLink, ListOrdered } from "lucide-react";
import type { DescriptionRaffinee } from "@/lib/description-youtube";

type Props = {
  description: DescriptionRaffinee;
};

/** Libellé de repli d'une ressource : le domaine seul (URL fiable ou brut). */
function domaineDe(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] || url;
  }
}

export function RessourcesTuto({ description }: Props) {
  const { chapitres, ressources, paragraphes } = description;
  if (chapitres.length === 0 && ressources.length === 0 && paragraphes.length === 0) return null;

  return (
    <section
      aria-label="Chapitres et ressources du tutoriel"
      className="mt-8 min-w-0 rounded-carte border border-bordure bg-white p-5 shadow-carte sm:p-6"
    >
      <h2 className="break-words font-titre text-[17px] leading-6 font-bold text-bleu">
        Chapitres &amp; ressources
      </h2>
      <p className="mt-1 text-[13px] leading-5 text-encre">
        Le contenu utile de la description YouTube de la vidéo — nettoyé et structuré pour
        pratiquer ce que le tutoriel montre.
      </p>

      {/* ── Chapitres horodatés ─────────────────────────────────── */}
      {chapitres.length > 0 && (
        <div className="mt-5 min-w-0">
          <h3 className="flex items-center gap-1.5 text-[13px] leading-4 font-semibold uppercase tracking-wide text-encre">
            <ListOrdered className="size-4 shrink-0 text-sky-500" aria-hidden /> Chapitres
          </h3>
          <ol className="mt-2.5 grid min-w-0 gap-1.5 sm:grid-cols-2">
            {chapitres.map((c, i) => (
              <li
                key={`${c.temps}-${i}`}
                className="flex min-w-0 items-baseline gap-2.5 rounded-champ bg-gris px-3 py-1.5 text-[13px] leading-5"
              >
                <span className="shrink-0 font-mono text-[12px] font-semibold text-sky-500 tabular-nums">
                  {c.temps}
                </span>
                <span className="min-w-0 break-words text-encre">{c.titre}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── Ressources externes ─────────────────────────────────── */}
      {ressources.length > 0 && (
        <div className="mt-5 min-w-0">
          <h3 className="flex items-center gap-1.5 text-[13px] leading-4 font-semibold uppercase tracking-wide text-encre">
            <ExternalLink className="size-4 shrink-0 text-sky-500" aria-hidden /> Ressources utiles
          </h3>
          <ul className="mt-2.5 grid min-w-0 gap-1.5">
            {ressources.map((r, i) => (
              <li
                key={`${r.url}-${i}`}
                className="flex min-w-0 items-baseline gap-2 text-[13px] leading-5"
              >
                <BookOpen className="mt-0.5 size-3.5 shrink-0 text-encre/50" aria-hidden />
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="min-w-0 break-words font-medium text-sky-600 underline decoration-sky-300 underline-offset-2 transition [overflow-wrap:anywhere] hover:text-sky-500 hover:decoration-sky-500"
                >
                  {r.label ?? domaineDe(r.url)}
                </a>
                {!r.label && (
                  <span className="hidden min-w-0 truncate text-encre/60 sm:inline">
                    — {r.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Paragraphes utiles ──────────────────────────────────── */}
      {paragraphes.length > 0 && (
        <div className="mt-5 min-w-0">
          <h3 className="text-[13px] leading-4 font-semibold uppercase tracking-wide text-encre">
            À savoir sur ce tutoriel
          </h3>
          <div className="mt-2.5 grid min-w-0 gap-2.5">
            {paragraphes.map((p, i) => (
              <p key={i} className="break-words text-[14px] leading-6 text-encre">
                {p}
              </p>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}