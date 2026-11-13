// components/assistant/rendu-reponse.tsx
// ─────────────────────────────────────────────────────────────────
// LOT 70 — RENDU DES RÉPONSES DE L'ASSISTANT WEBGIVERSE.
//
// Amélioration importée de l'assistant des tutoriels (lots 64/67) :
// les réponses étaient affichées en TEXTE BRUT (symboles ** et -
// visibles, pas de vraies listes). Ce composant les affiche en vrai
// Markdown, comme <RenduMarkdown> le fait déjà pour les tutoriels.
//
// Deux additions propres à l'assistant Webgiverse :
//   1. LIENS DE FICHE : la convention de la maison « **Nom**
//      (slug : xxx) » devient un lien cliquable vers /outil/xxx
//      (navigation interne Next.js). C'est ce format que la consigne
//      système impose au modèle — impossible qu'il pointe ailleurs.
//   2. LIENS INTERNES : [texte](/tarifs?promo=CODE) — les liens de
//      réduction vers /tarifs — s'affichent comme de vrais liens
//      internes (RenduMarkdown ne gère que les liens http(s)).
//
// Le reste est la mécanique éprouvée du lot 64/67 (titres, gras,
// italique, code, listes — avec le correctif du groupe p2[1] —,
// citations, séparateurs, liens externes et URL nues). Les classes
// Tailwind sont celles de RenduMarkdown : la charte ne change pas.
// Aucune dépendance nouvelle. React échappe tout le texte.
// ─────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import type { ReactNode } from "react";
import Link from "next/link";

/* ── 1. Ligne enrichie : liens de fiche, liens internes/externes, gras, italique, code ── */

// Un seul passage, alternatives du plus spécifique au plus général :
// « **Nom** (slug : xxx) » avant « **gras** », lien interne avant
// lien externe, lien [texte](url) avant URL nue.
const RX_ENRICHI =
  /(\*\*[^*\n]+\*\*\s*\(slug\s*:\s*[a-zA-Z0-9-]+\)|\*\*[^*\n]+\*\*|\*[^*\s][^*]*\*|`[^`\n]+`|~~[^~\n]+~~|\[[^\]\n]+\]\(\/[^)\s]+\)|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)|https?:\/\/[^\s<)"']+)/g;

function ligneEnrichie(texte: string, cle: string): ReactNode[] {
  const morceaux: ReactNode[] = [];
  let dernier = 0;
  let n = 0;

  for (const correspondance of texte.matchAll(RX_ENRICHI)) {
    const debut = correspondance.index ?? 0;
    let jeton = correspondance[0];

    // URL nue : on retire la ponctuation collée en fin de phrase
    // (ex. « https://site.com. » → lien sans le point final).
    if (jeton.startsWith("http")) {
      jeton = jeton.replace(/[.,;:!?)\]}'»]+$/, "");
    }

    if (debut > dernier) morceaux.push(texte.slice(dernier, debut));
    n += 1;
    const k = `${cle}#${n}`;

    if (jeton.startsWith("**")) {
      // « **Nom** (slug : xxx) » → lien vers la fiche de l'outil.
      const avecSlug = /^\*\*([^*\n]+)\*\*\s*\(slug\s*:\s*([a-zA-Z0-9-]+)\)$/.exec(jeton);
      if (avecSlug) {
        morceaux.push(
          <Link
            key={k}
            href={`/outil/${avecSlug[2]}`}
            className="font-semibold text-sky-500 underline decoration-sky-500/40 underline-offset-2 hover:decoration-sky-500"
          >
            {avecSlug[1]}
          </Link>,
        );
      } else {
        morceaux.push(
          <strong key={k} className="font-bold text-bleu">
            {jeton.slice(2, -2)}
          </strong>,
        );
      }
    } else if (jeton.startsWith("~~")) {
      morceaux.push(<s key={k}>{jeton.slice(2, -2)}</s>);
    } else if (jeton.startsWith("`")) {
      morceaux.push(
        <code
          key={k}
          className="break-words rounded bg-gris px-1 py-0.5 font-mono text-[12px] font-semibold text-sky-500"
        >
          {jeton.slice(1, -1)}
        </code>,
      );
    } else if (jeton.startsWith("*")) {
      morceaux.push(<em key={k}>{jeton.slice(1, -1)}</em>);
    } else if (jeton.startsWith("[")) {
      // Lien interne « [texte](/tarifs?promo=CODE) » → navigation Next.js.
      const interne = /^\[([^\]\n]+)\]\((\/[^)\s]+)\)$/.exec(jeton);
      if (interne) {
        morceaux.push(
          <Link
            key={k}
            href={interne[2]}
            className="font-semibold text-sky-500 underline decoration-sky-500/40 underline-offset-2 hover:decoration-sky-500"
          >
            {interne[1]}
          </Link>,
        );
      } else {
        // Lien externe « [texte](https://…) » → nouvel onglet.
        const externe = /^\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(jeton);
        morceaux.push(
          externe ? (
            <a
              key={k}
              href={externe[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sky-500 underline decoration-sky-500/40 underline-offset-2 hover:decoration-sky-500"
            >
              {externe[1]}
            </a>
          ) : (
            <span key={k}>{jeton}</span>
          ),
        );
      }
    } else {
      // URL seule → cliquable, coupable sur plusieurs lignes si longue.
      morceaux.push(
        <a
          key={k}
          href={jeton}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-sky-500 underline decoration-sky-500/40 underline-offset-2 hover:decoration-sky-500"
        >
          {jeton}
        </a>,
      );
    }
    dernier = debut + correspondance[0].length;
  }

  if (dernier < texte.length) morceaux.push(texte.slice(dernier));
  return morceaux;
}

/* ── 2. Découpage du texte en blocs (mécanique lot 64/67) ─────────── */

type Bloc =
  | { type: "titre"; niveau: number; texte: string }
  | { type: "paragraphe"; lignes: string[] }
  | { type: "liste"; ordonnee: boolean; items: string[] }
  | { type: "code"; lignes: string[] }
  | { type: "citation"; lignes: string[] }
  | { type: "separateur" };

const RX_CODE = /^\s*```/;
const RX_SEPARATEUR = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const RX_TITRE = /^(#{1,6})\s+(.+)$/;
const RX_PUCE = /^\s*[-*•]\s+(.*)$/;
const RX_NUMERO = /^\s*(\d+)[.)]\s+(.*)$/;
const RX_CITATION = /^\s*>\s?/;

function decouperBlocs(source: string): Bloc[] {
  const lignes = source.replace(/\r\n?/g, "\n").split("\n");
  const blocs: Bloc[] = [];
  let i = 0;

  while (i < lignes.length) {
    const ligne = lignes[i];

    // Ligne vide → simple séparateur de blocs, on saute.
    if (!ligne.trim()) {
      i += 1;
      continue;
    }

    // Bloc de code ``` … ``` (les ``` internes sont gardés tels quels).
    if (RX_CODE.test(ligne)) {
      const contenu: string[] = [];
      i += 1;
      while (i < lignes.length && !RX_CODE.test(lignes[i])) {
        contenu.push(lignes[i]);
        i += 1;
      }
      i += 1; // saute la ligne ``` de fermeture (ou arrive en fin de texte)
      blocs.push({ type: "code", lignes: contenu });
      continue;
    }

    // Séparateur horizontal --- / *** / ___
    if (RX_SEPARATEUR.test(ligne)) {
      blocs.push({ type: "separateur" });
      i += 1;
      continue;
    }

    // Titre : # à ######
    const titre = RX_TITRE.exec(ligne);
    if (titre) {
      blocs.push({
        type: "titre",
        niveau: titre[1].length,
        texte: titre[2].trim(),
      });
      i += 1;
      continue;
    }

    // Listes (à puces ou numérotées) — collectées jusqu'à la fin.
    const puce = RX_PUCE.exec(ligne);
    const numero = RX_NUMERO.exec(ligne);
    if (puce || numero) {
      const ordonnee = Boolean(numero);
      const items: string[] = [];
      while (i < lignes.length) {
        const p2 = RX_PUCE.exec(lignes[i]);
        const n2 = RX_NUMERO.exec(lignes[i]);
        if (ordonnee && n2) items.push(n2[2].trim());
        else if (!ordonnee && p2) items.push(p2[1].trim()); // LOT 67 : groupe 1 (le texte), pas p2[2]
        else if (!lignes[i].trim()) break; // ligne vide = fin de liste
        else if (/^\s+\S/.test(lignes[i]) && items.length > 0) {
          // Ligne indentée = suite de l'item précédent → recollée.
          items[items.length - 1] += ` ${lignes[i].trim()}`;
          i += 1;
          continue;
        } else break;
        i += 1;
      }
      blocs.push({ type: "liste", ordonnee, items });
      continue;
    }

    // Citation « > … » (plusieurs lignes collées).
    if (RX_CITATION.test(ligne)) {
      const contenu: string[] = [];
      while (i < lignes.length && RX_CITATION.test(lignes[i])) {
        contenu.push(lignes[i].replace(RX_CITATION, ""));
        i += 1;
      }
      blocs.push({ type: "citation", lignes: contenu });
      continue;
    }

    // Paragraphe : lignes consécutives recollées (règle Markdown).
    const paragraphe: string[] = [];
    while (i < lignes.length) {
      const l = lignes[i];
      if (
        !l.trim() ||
        RX_CODE.test(l) ||
        RX_SEPARATEUR.test(l) ||
        RX_TITRE.test(l) ||
        RX_PUCE.test(l) ||
        RX_NUMERO.test(l) ||
        RX_CITATION.test(l)
      ) {
        break;
      }
      paragraphe.push(l.trim());
      i += 1;
    }
    if (paragraphe.length > 0) blocs.push({ type: "paragraphe", lignes: paragraphe });
  }

  return blocs;
}

/* ── 3. Rendu des blocs (classes identiques à RenduMarkdown) ──────── */

export function RenduReponse({
  texte,
  className = "",
}: {
  texte: string;
  className?: string;
}) {
  const blocs = useMemo(() => decouperBlocs(texte ?? ""), [texte]);

  return (
    <div className={`min-w-0 space-y-2 ${className}`}>
      {blocs.map((bloc, index) => {
        const cle = `rr-${index}`;

        switch (bloc.type) {
          case "titre": {
            const taille =
              bloc.niveau <= 1
                ? "text-[15px] leading-5"
                : bloc.niveau === 2
                  ? "text-[14px] leading-5"
                  : "text-[13px] leading-5";
            const Tag = bloc.niveau <= 2 ? "h3" : bloc.niveau <= 4 ? "h4" : "h5";
            return (
              <Tag key={cle} className={`${taille} font-titre font-bold text-bleu`}>
                {ligneEnrichie(bloc.texte, cle)}
              </Tag>
            );
          }

          case "paragraphe":
            return (
              <p key={cle} className="min-w-0">
                {ligneEnrichie(bloc.lignes.join(" "), cle)}
              </p>
            );

          case "liste":
            return bloc.ordonnee ? (
              <ol
                key={cle}
                className="min-w-0 list-decimal space-y-1 pl-5 marker:font-bold marker:text-sky-500"
              >
                {bloc.items.map((item, j) => (
                  <li key={`${cle}-${j}`} className="min-w-0 pl-0.5">
                    {ligneEnrichie(item, `${cle}-${j}`)}
                  </li>
                ))}
              </ol>
            ) : (
              <ul
                key={cle}
                className="min-w-0 list-disc space-y-1 pl-5 marker:text-sky-500"
              >
                {bloc.items.map((item, j) => (
                  <li key={`${cle}-${j}`} className="min-w-0 pl-0.5">
                    {ligneEnrichie(item, `${cle}-${j}`)}
                  </li>
                ))}
              </ul>
            );

          case "code":
            return (
              <pre
                key={cle}
                className="overflow-x-auto rounded-carte border border-bordure bg-gris/70 p-3 font-mono text-[12px] leading-5 text-bleu"
              >
                <code>{bloc.lignes.join("\n")}</code>
              </pre>
            );

          case "citation":
            return (
              <blockquote
                key={cle}
                className="min-w-0 border-l-2 border-sky-500/50 pl-3 italic text-encre"
              >
                {bloc.lignes.map((l, j) => (
                  <p key={`${cle}-${j}`}>{ligneEnrichie(l, `${cle}-${j}`)}</p>
                ))}
              </blockquote>
            );

          case "separateur":
            return <hr key={cle} className="border-bordure" />;
        }
      })}
    </div>
  );
}