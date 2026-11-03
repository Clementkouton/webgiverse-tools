// components/tutoriels/ressources-tuto.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 28 — Section « Chapitres & ressources » d'une page tutoriel :
// affiche la description YouTube RAFFINÉE (récupérée par l'admin via
// le scraper), juste sous le bloc « Ma progression ». Design refondu :
//   • un en-tête avec pastille d'icône (langue graphique du site) ;
//   • les chapitres en grille légère : pastille horodatage violette
//     + titre, sur fond neutre avec survol — plus de mur de pilules ;
//   • les ressources en mini-cartes : avatar-domaine (1ʳᵉ lettre sur
//     pastille violette), libellé en gras, chemin propre en sous-titre
//     — plus de domaine affiché deux fois ;
//   • « À savoir » dans un encart à liseré violet, paragraphes avec
//     liens cliquables et lignes de bavardage résiduelles filtrées.
// La section n'est rendue que si le tuto possède une description
// exploitable. Aucune dépendance externe.
// ─────────────────────────────────────────────────────────────────
import { BookOpen, ExternalLink, ListOrdered, Sparkles } from "lucide-react";
import type { DescriptionRaffinee } from "@/lib/description-youtube";

type Props = {
  description: DescriptionRaffinee;
};

/* ── Helpers d'affichage ─────────────────────────────────────────── */

/** Libellé de repli d'une ressource : le domaine seul. */
function domaineDe(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] || url;
  }
}

/** Retire les puces et tirets décoratifs collés au libellé
 * (« • Toute l'actu tech » → « Toute l'actu tech »). */
function nettoyerLabel(label: string): string {
  return label.replace(/^[\s•·▪◦‣⁃\-–—*]+/, "").trim() || label;
}

/** Sous-titre propre d'une ressource : domaine + début du chemin
 * (« twitter.com/frandroid »), sans protocole ni paramètres. */
function cheminAffichable(url: string): string {
  try {
    const u = new URL(url);
    const chemin = `${u.hostname.replace(/^www\./, "")}${u.pathname}`.replace(/\/$/, "");
    return chemin.length > 42 ? `${chemin.slice(0, 41)}…` : chemin;
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 42);
  }
}

/** Avatar-domaine : première lettre significative du domaine. */
function initialeDomaine(url: string): string {
  const domaine = domaineDe(url);
  const lettre = domaine.replace(/^(m|fr|en|www)\./, "").charAt(0);
  return (lettre || domaine.charAt(0) || "?").toUpperCase();
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
            className="break-all font-medium text-violet underline decoration-violet/30 underline-offset-2 transition hover:text-violet-clair hover:decoration-violet-clair"
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

/** Lignes de bavardage qui échappent parfois au raffinement (courtes,
 * promotionnelles ou adressées au public de la vidéo) — filtrées à
 * l'affichage pour ne garder que l'utile. */
const PARAGRAPHE_BRUIT =
  /un like\b|@\w+|questions?\s+en\s+commentaire|rejoins[- ]moi|merci d'avoir regard|bon(ne)? (vid[ée]o|regard)|partage[- ]la|abonn\w*|non sponsoris\w*\s*:?\s*$/i;

export function RessourcesTuto({ description }: Props) {
  const { chapitres, ressources, paragraphes } = description;
  // Filtrage défensif à l'affichage : les données migrées avant le
  // renforcement du raffineur peuvent contenir 2-3 lignes de bruit.
  const paragraphesUtiles = paragraphes.filter(
    (p) => !(p.length < 90 && PARAGRAPHE_BRUIT.test(p)),
  );

  if (chapitres.length === 0 && ressources.length === 0 && paragraphesUtiles.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Chapitres et ressources du tutoriel"
      className="mt-8 overflow-hidden rounded-carte border border-bordure bg-white shadow-carte"
    >
      {/* ── En-tête de section ───────────────────────────────────── */}
      <header className="flex items-center gap-3.5 border-b border-bordure bg-gris/60 px-5 py-4 sm:px-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet/10 text-violet" aria-hidden>
          <BookOpen className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-titre text-[17px] leading-6 font-bold text-bleu">
            Chapitres &amp; ressources
          </h2>
          <p className="mt-0.5 text-[12.5px] leading-4 text-encre">
            Issu de la description YouTube de la vidéo — nettoyé, structuré, prêt à pratiquer.
          </p>
        </div>
        {chapitres.length > 0 && (
          <span className="ml-auto hidden shrink-0 rounded-full border border-violet/25 bg-violet/5 px-2.5 py-1 text-[11.5px] leading-4 font-semibold text-violet sm:inline-flex">
            {chapitres.length} chapitres
          </span>
        )}
      </header>

      <div className="space-y-7 px-5 py-6 sm:px-6">
        {/* ── Chapitres horodatés ─────────────────────────────────── */}
        {chapitres.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-[12px] leading-4 font-bold uppercase tracking-wider text-encre">
              <span className="grid size-7 place-items-center rounded-lg bg-violet/10 text-violet" aria-hidden>
                <ListOrdered className="size-3.5" />
              </span>
              Chapitres
            </h3>
            <ol className="mt-3 grid gap-x-5 sm:grid-cols-2">
              {chapitres.map((c, i) => (
                <li
                  key={`${c.temps}-${i}`}
                  className="flex min-w-0 items-center gap-3 rounded-champ px-2 py-1.5 transition-colors hover:bg-gris"
                >
                  <span className="shrink-0 rounded-md bg-violet/10 px-1.5 py-0.5 font-mono text-[11px] leading-4 font-bold text-violet tabular-nums">
                    {c.temps}
                  </span>
                  <span className="min-w-0 text-[13.5px] leading-5 text-encre">{c.titre}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* ── Ressources externes (mini-cartes) ───────────────────── */}
        {ressources.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-[12px] leading-4 font-bold uppercase tracking-wider text-encre">
              <span className="grid size-7 place-items-center rounded-lg bg-violet/10 text-violet" aria-hidden>
                <ExternalLink className="size-3.5" />
              </span>
              Ressources utiles
            </h3>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {ressources.map((r, i) => (
                <li key={`${r.url}-${i}`}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="group flex min-w-0 items-center gap-3 rounded-carte border border-bordure bg-white px-3 py-2.5 transition-all hover:-translate-y-px hover:border-violet/50 hover:shadow-carte"
                  >
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet/10 text-[13px] font-bold text-violet transition-colors group-hover:bg-violet group-hover:text-white"
                      aria-hidden
                    >
                      {initialeDomaine(r.url)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] leading-5 font-semibold text-bleu transition-colors group-hover:text-violet">
                        {r.label ? nettoyerLabel(r.label) : domaineDe(r.url)}
                      </span>
                      <span className="block truncate text-[12px] leading-4 text-encre/70">
                        {cheminAffichable(r.url)}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── À savoir (encart à liseré violet) ───────────────────── */}
        {paragraphesUtiles.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-[12px] leading-4 font-bold uppercase tracking-wider text-encre">
              <span className="grid size-7 place-items-center rounded-lg bg-violet/10 text-violet" aria-hidden>
                <Sparkles className="size-3.5" />
              </span>
              À savoir sur ce tutoriel
            </h3>
            <div className="mt-3 space-y-2.5 rounded-carte border border-bordure border-l-4 border-l-violet bg-gris/50 px-4 py-3.5">
              {paragraphesUtiles.map((p, i) => (
                <p key={i} className="text-[13.5px] leading-6 text-encre">
                  <ParagrapheAvecLiens texte={p} />
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
