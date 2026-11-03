// components/tutoriels/ressources-tuto.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 28 — Section « Chapitres & ressources » d'une page tutoriel :
// affiche la description YouTube RAFFINÉE (récupérée par l'admin via
// le scraper), juste sous le bloc « Ma progression ». Trois blocs
// optionnels : les chapitres horodatés de la vidéo, les ressources
// externes utiles (docs, outils, Colab… — sans liens sociaux ni
// hashtags) et les paragraphes descriptifs retenus. La section n'est
// rendue que si le tuto possède une description exploitable.
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

/** Groupe de capture OBLIGATOIRE : split conserve les séparateurs →
 * alternance fiable texte / URL dans les paragraphes. */
const REGEX_URL = /(https?:\/\/[^\s<>()\[\]{}"']+)/g;

/** Rend un paragraphe en transformant chaque URL en vrai lien <a>
 * (les descriptions YouTube citent des ressources au fil du texte). */
function ParagrapheAvecLiens({ texte }: { texte: string }) {
  const segments = texte.split(REGEX_URL);
  if (segments.length === 1) return <>{texte}</>;
  return (
    <>
      {segments.map((segment, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={segment}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="break-all font-medium text-sky-600 underline decoration-sky-300 underline-offset-2 transition hover:text-sky-500 hover:decoration-sky-500"
          >
            {segment}
          </a>
        ) : (
          <span key={i}>{segment}</span>
        ),
      )}
    </>
  );
}

export function RessourcesTuto({ description }: Props) {
  const { chapitres, ressources, paragraphes } = description;
  if (chapitres.length === 0 && ressources.length === 0 && paragraphes.length === 0) return null;

  return (
    <section
      aria-label="Chapitres et ressources du tutoriel"
      className="mt-8 rounded-carte border border-bordure bg-white p-5 shadow-carte sm:p-6"
    >
      <h2 className="font-titre text-[17px] leading-6 font-bold text-bleu">
        Chapitres &amp; ressources
      </h2>
      <p className="mt-1 text-[13px] leading-5 text-encre">
        Le contenu utile de la description YouTube de la vidéo — nettoyé et structuré pour
        pratiquer ce que le tutoriel montre.
      </p>

      {/* ── Chapitres horodatés ─────────────────────────────────── */}
      {chapitres.length > 0 && (
        <div className="mt-5">
          <h3 className="flex items-center gap-1.5 text-[13px] leading-4 font-semibold uppercase tracking-wide text-encre">
            <ListOrdered className="size-4 text-violet" aria-hidden /> Chapitres
          </h3>
          <ol className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
            {chapitres.map((c, i) => (
              <li
                key={`${c.temps}-${i}`}
                className="flex min-w-0 items-baseline gap-2.5 rounded-champ bg-gris px-3 py-1.5 text-[13px] leading-5"
              >
                <span className="shrink-0 font-mono text-[12px] font-semibold text-violet tabular-nums">
                  {c.temps}
                </span>
                <span className="min-w-0 text-encre">{c.titre}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── Ressources externes ─────────────────────────────────── */}
      {ressources.length > 0 && (
        <div className="mt-5">
          <h3 className="flex items-center gap-1.5 text-[13px] leading-4 font-semibold uppercase tracking-wide text-encre">
            <ExternalLink className="size-4 text-violet" aria-hidden /> Ressources utiles
          </h3>
          <ul className="mt-2.5 grid gap-1.5">
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
                  className="min-w-0 break-words font-medium text-sky-600 underline decoration-sky-300 underline-offset-2 transition hover:text-sky-500 hover:decoration-sky-500"
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
        <div className="mt-5">
          <h3 className="text-[13px] leading-4 font-semibold uppercase tracking-wide text-encre">
            À savoir sur ce tutoriel
          </h3>
          <div className="mt-2.5 grid gap-2.5">
            {paragraphes.map((p, i) => (
              <p key={i} className="text-[14px] leading-6 text-encre">
                <ParagrapheAvecLiens texte={p} />
              </p>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
