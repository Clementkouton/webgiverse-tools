// components/ui/rendu-markdown.tsx
// ─────────────────────────────────────────────────────────────────
// LOT 67 — CORRECTIF DU PLANTAGE « Cannot read properties of
// undefined (reading 'trim') » (components/ui/rendu-markdown.tsx:187).
//
// Cause : la ligne 187 lisait p2[2] alors que le regex des puces
// RX_PUCE = /^\s*[-*•]\s+(.*)$/ n'a qu'UN SEUL groupe de capture
// (p2[1]). Le groupe 2 n'existe donc jamais → undefined → crash
// dès qu'une réponse de l'assistant contient une liste à puces
// (« - », « * » ou « • »). Le regex numéroté RX_NUMERO, lui, a bien
// deux groupes (le numéro + le texte), d'où la confusion avec n2[2].
//
// Correctif : UNE SEULE ligne change —
//   avant : else if (!ordonnee && p2) items.push(p2[2].trim());
//   après : else if (!ordonnee && p2) items.push(p2[1].trim());
// Tout le reste du fichier est strictement identique au lot 64.
// ─────────────────────────────────────────────────────────────────
// LOT 64 — RENDU MARKDOWN LÉGER, SANS AUCUNE DÉPENDANCE NOUVELLE.
// Les réponses des assistants IA arrivent en Markdown (« ## Titre »,
// **gras**, listes « - », `code`, liens). Jusqu'ici elles étaient
// affichées en TEXTE BRUT : les symboles ** et - apparaissaient tels
// quels, sans titres ni vraies listes. Ce composant transforme le
// texte en vrais éléments HTML stylés selon la charte du site.
//
// Pris en charge :
//   · titres        : # ## ### … ###### (jusqu'à 3 niveaux visuels)
//   · gras / italique / barré : **mot**, *mot*, ~~mot~~
//   · code inline   : `code`  — et blocs de code ``` … ```
//   · listes        : « - », « * », « • » et numérotées « 1. » « 1) »
//   · citations     : « > texte »
//   · séparateurs   : « --- »
//   · liens         : [texte](https://…) et URL nues https://…
//
// Sécurité : React échappe automatiquement tout le texte (aucun
// risque d'injection HTML) et seuls les liens http(s) deviennent
// cliquables — jamais javascript:.
//
// Utilisation : <RenduMarkdown contenu={texte} />
// Le composant hérite de la taille et de la couleur du texte du
// parent : il s'insère dans n'importe quelle bulle de chat.
// ─────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import type { ReactNode } from "react";

/* ── 1. Ligne enrichie : gras, italique, code, liens ──────────────── */

// Un seul passage, alternatives du plus long au plus court :
// **gras** avant *italique*, lien [texte](url) avant URL nue.
const RX_ENRICHI =
  /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|~~[^~]+~~|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<)"']+)/g;

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
      morceaux.push(
        <strong key={k} className="font-bold text-bleu">
          {jeton.slice(2, -2)}
        </strong>,
      );
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
      const lien = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(jeton);
      morceaux.push(
        lien ? (
          <a
            key={k}
            href={lien[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sky-500 underline decoration-sky-500/40 underline-offset-2 hover:decoration-sky-500"
          >
            {lien[1]}
          </a>
        ) : (
          <span key={k}>{jeton}</span>
        ),
      );
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
    dernier = debut + jeton.length;
  }

  if (dernier < texte.length) morceaux.push(texte.slice(dernier));
  return morceaux;
}

/* ── 2. Découpage du texte en blocs ───────────────────────────────── */

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

/* ── 3. Rendu des blocs ───────────────────────────────────────────── */

export function RenduMarkdown({
  contenu,
  className = "",
}: {
  contenu: string;
  className?: string;
}) {
  const blocs = useMemo(() => decouperBlocs(contenu ?? ""), [contenu]);

  return (
    <div className={`min-w-0 space-y-2 ${className}`}>
      {blocs.map((bloc, index) => {
        const cle = `md-${index}`;

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