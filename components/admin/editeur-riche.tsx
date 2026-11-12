// components/admin/editeur-riche.tsx
"use client";
// ─────────────────────────────────────────────────────────────────
// Lot 24 — ÉDITEUR RICHE (WYSIWYG) pour la Description des articles.
// Nouveautés demandées :
//   • 🎨 COULEUR DU TEXTE + 🖍 COULEUR DE FOND (surlignage) dans la
//     barre d'outils — sélecteur natif <input type="color">, appliqué
//     sur la sélection via execCommand (styleWithCSS → <span style>).
//   • Bascule « Source HTML » (</>) pour voir/coller du code HTML
//     (utile pour importer un article généré par une IA).
//   • Le contenu chargé est NORMALISÉ (lib/html.ts) : les anciens
//     articles échappés (&lt;p&gt;) ou collés depuis un export IA
//     s'affichent mis en forme, plus JAMAIS en balises visibles.
//   • Aucune dépendance externe (contentEditable + execCommand) ;
//     le HTML est assaini côté serveur à l'enregistrement.
// ─────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Eraser,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Palette,
  Quote,
  Redo2,
  Strikethrough,
  Table,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { texteVersHtml } from "@/lib/html";

type EtatActifs = {
  gras: boolean;
  italique: boolean;
  souligne: boolean;
  barre: boolean;
  puces: boolean;
  numeros: boolean;
  citation: boolean;
  h2: boolean;
  h3: boolean;
  align: "gauche" | "centre" | "droite";
};

const ACTIFS_VIDES: EtatActifs = {
  gras: false,
  italique: false,
  souligne: false,
  barre: false,
  puces: false,
  numeros: false,
  citation: false,
  h2: false,
  h3: false,
  align: "gauche",
};

export function EditeurRiche({
  valeurInitiale = "",
  placeholder = "Écris ton article ici…",
  onChange,
}: {
  /** Contenu actuel : HTML, HTML échappé ou ancien texte brut. */
  valeurInitiale?: string;
  placeholder?: string;
  onChange?: (html: string, texte: string) => void;
}) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState("");
  const [stats, setStats] = useState({ mots: 0, caracteres: 0 });
  const [actifs, setActifs] = useState<EtatActifs>(ACTIFS_VIDES);

  // Couleurs (sélecteurs de la barre d'outils)
  const [couleurTexte, setCouleurTexte] = useState("#1e293b");
  const [couleurFond, setCouleurFond] = useState("#fef08a");

  // Mode « source HTML » : la zone WYSIWYG reste montée (cachée par
  // CSS) pour ne pas perdre son contenu ni la ref.
  const [modeSource, setModeSource] = useState(false);
  const [source, setSource] = useState("");

  // Sélection sauvegardée à l'ouverture d'une palette de couleurs
  // (le focus quitte la zone → on la restaure avant d'appliquer).
  const selectionSauvegardee = useRef<Range | null>(null);

  /** Lit l'état courant (boutons surlignés) depuis la sélection. */
  const majActifs = useCallback(() => {
    if (modeSource) return;
    try {
      const bloc = String(document.queryCommandValue("formatBlock") ?? "").toLowerCase();
      setActifs({
        gras: document.queryCommandState("bold"),
        italique: document.queryCommandState("italic"),
        souligne: document.queryCommandState("underline"),
        barre: document.queryCommandState("strikeThrough"),
        puces: document.queryCommandState("insertUnorderedList"),
        numeros: document.queryCommandState("insertOrderedList"),
        citation: bloc === "blockquote",
        h2: bloc === "h2",
        h3: bloc === "h3",
        align: document.queryCommandState("justifyCenter")
          ? "centre"
          : document.queryCommandState("justifyRight")
            ? "droite"
            : "gauche",
      });
    } catch {
      setActifs(ACTIFS_VIDES);
    }
  }, [modeSource]);

  /** Synchronise le champ caché + le compteur depuis la zone WYSIWYG. */
  const synchroniser = useCallback(() => {
    const zone = zoneRef.current;
    if (!zone) return;
    const contenu = zone.innerHTML;
    const texte = (zone.textContent ?? "").trim();
    setHtml(contenu);
    setStats({
      mots: texte ? texte.split(/\s+/).filter(Boolean).length : 0,
      caracteres: texte.length,
    });
    onChange?.(contenu, texte);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange]);

  // Montage : charge le contenu initial (HTML normalisé, ou ancien
  // texte brut converti en paragraphes). normaliserHtml() décode les
  // balises échappées : elles ne s'affichent plus comme du texte.
  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;
    const contenu = texteVersHtml(valeurInitiale);
    zone.innerHTML = contenu;
    setHtml(contenu);
    const texte = (zone.textContent ?? "").trim();
    setStats({
      mots: texte ? texte.split(/\s+/).filter(Boolean).length : 0,
      caracteres: texte.length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Suit la sélection (surbrillance des boutons actifs)
  useEffect(() => {
    document.addEventListener("selectionchange", majActifs);
    return () => document.removeEventListener("selectionchange", majActifs);
  }, [majActifs]);

  /** Exécute une commande d'édition puis resynchronise. */
  const exec = useCallback(
    (commande: string, valeur?: string) => {
      zoneRef.current?.focus();
      document.execCommand(commande, false, valeur);
      synchroniser();
      majActifs();
    },
    [synchroniser, majActifs],
  );

  /** Mémorise la sélection courante si elle est dans la zone. */
  const sauverSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && zoneRef.current?.contains(sel.anchorNode)) {
      selectionSauvegardee.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  /** Applique une couleur (texte ou fond) sur la sélection restaurée. */
  const execCouleur = useCallback(
    (commande: "foreColor" | "hiliteColor", valeur: string) => {
      const zone = zoneRef.current;
      if (!zone) return;
      zone.focus();
      const sel = window.getSelection();
      if (selectionSauvegardee.current && sel) {
        sel.removeAllRanges();
        sel.addRange(selectionSauvegardee.current);
      }
      // styleWithCSS → produit <span style="color:…"> (et non <font>)
      document.execCommand("styleWithCSS", false, "true");
      const fait = document.execCommand(commande, false, valeur);
      if (!fait && commande === "hiliteColor") {
        document.execCommand("backColor", false, valeur);
      }
      document.execCommand("styleWithCSS", false, "false");
      synchroniser();
      majActifs();
    },
    [synchroniser, majActifs],
  );

  /** Insère du HTML brut à l'endroit du curseur. */
  const insererHtml = useCallback(
    (code: string) => exec("insertHTML", code),
    [exec],
  );

  /** Lien : sur la sélection, ou insertion d'un nouveau texte. */
  const ajouterLien = () => {
    const url = window.prompt("Adresse du lien (https://…)");
    if (!url) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
      exec("createLink", url);
    } else {
      insererHtml(`<a href="${url.replace(/"/g, "&quot;")}">${url.replace(/</g, "&lt;")}</a>`);
    }
  };

  /** Image insérée dans le texte (en plus de l'image principale). */
  const ajouterImage = () => {
    const url = window.prompt("Adresse de l'image (https://…)");
    if (!url) return;
    insererHtml(`<img src="${url.replace(/"/g, "&quot;")}" alt="" />`);
  };

  /** Tableau simple : « lignes x colonnes » (ex. 3x4). */
  const ajouterTableau = () => {
    const reponse = window.prompt("Dimensions du tableau (lignes x colonnes), ex : 3x4");
    if (!reponse) return;
    const m = reponse.match(/(\d+)\s*[x×]\s*(\d+)/i);
    if (!m) {
      window.alert("Format attendu : 3x4 (lignes x colonnes).");
      return;
    }
    const lignes = Math.min(Math.max(Number(m[1]), 1), 10);
    const colonnes = Math.min(Math.max(Number(m[2]), 1), 8);
    const cellules = Array.from({ length: colonnes }, () => "<td>Texte</td>").join("");
    const corps = Array.from({ length: lignes }, () => `<tr>${cellules}</tr>`).join("");
    insererHtml(`<table><tbody>${corps}</tbody></table><p><br></p>`);
  };

  /** Bascule WYSIWYG ↔ source HTML sans remonter le composant. */
  const basculerSource = () => {
    const zone = zoneRef.current;
    if (!modeSource) {
      // Passage en source : on copie le HTML courant
      setSource(zone?.innerHTML ?? html);
      setModeSource(true);
    } else {
      // Retour au WYSIWYG : on applique la source saisie
      if (zone) zone.innerHTML = source;
      setModeSource(false);
      synchroniser();
      majActifs();
    }
  };

  /** Édition directe de la source : le champ caché suit en direct. */
  const changerSource = (valeur: string) => {
    setSource(valeur);
    setHtml(valeur);
    const texte = valeur.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    setStats({
      mots: texte ? texte.split(/\s+/).filter(Boolean).length : 0,
      caracteres: texte.length,
    });
    onChange?.(valeur, texte);
  };

  // ── Barre d'outils ────────────────────────────────────────────────
  function BoutonOutil({
    icone: Icone,
    titre,
    actif,
    onClick,
    texte,
  }: {
    icone?: LucideIcon;
    titre: string;
    actif?: boolean;
    onClick: () => void;
    texte?: string;
  }) {
    return (
      <button
        type="button"
        title={titre}
        aria-label={titre}
        aria-pressed={actif}
        onMouseDown={(e) => e.preventDefault() /* garde la sélection */}
        onClick={onClick}
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-champ text-[13px] font-bold transition",
          actif
            ? "bg-primaire/15 text-primaire-texte"
            : "text-adm-gris hover:bg-white hover:text-primaire-texte",
        )}
      >
        {Icone ? <Icone className="size-4" aria-hidden /> : texte}
      </button>
    );
  }

  function Separateur() {
    return <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-adm-bordure" />;
  }

  /** Sélecteur de couleur compact (palette native du navigateur). */
  function ChoixCouleur({
    titre,
    icone: Icone,
    valeur,
    onChoisir,
  }: {
    titre: string;
    icone: LucideIcon;
    valeur: string;
    onChoisir: (couleur: string) => void;
  }) {
    return (
      <label
        title={titre}
        className="relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-champ text-adm-gris transition hover:bg-white hover:text-primaire-texte"
      >
        <Icone className="pointer-events-none size-4" aria-hidden />
        {/* petit indicateur rond = couleur actuellement choisie */}
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0.5 size-1.5 rounded-[7px] -skew-x-[18deg] border border-white shadow-sm"
          style={{ backgroundColor: valeur }}
        />
        <input
          type="color"
          aria-label={titre}
          value={valeur}
          onMouseDown={sauverSelection}
          onTouchStart={sauverSelection}
          onChange={(e) => onChoisir(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
    );
  }

  return (
    <div className="rounded-carte border border-bordure bg-white transition focus-within:border-primaire">
      {/* Barre d'outils (comme la maquette) */}
      <div
        role="toolbar"
        aria-label="Mise en forme de la description"
        className="flex flex-wrap items-center gap-0.5 rounded-t-carte border-b border-adm-bordure bg-adm-fond/70 px-2 py-1.5"
      >
        <BoutonOutil icone={Undo2} titre="Annuler" onClick={() => exec("undo")} />
        <BoutonOutil icone={Redo2} titre="Rétablir" onClick={() => exec("redo")} />
        <Separateur />
        <BoutonOutil texte="¶" titre="Paragraphe" onClick={() => exec("formatBlock", "P")} />
        <BoutonOutil icone={Heading2} titre="Grand titre" actif={actifs.h2} onClick={() => exec("formatBlock", "H2")} />
        <BoutonOutil icone={Heading3} titre="Sous-titre" actif={actifs.h3} onClick={() => exec("formatBlock", "H3")} />
        <Separateur />
        <BoutonOutil icone={Bold} titre="Gras" actif={actifs.gras} onClick={() => exec("bold")} />
        <BoutonOutil icone={Italic} titre="Italique" actif={actifs.italique} onClick={() => exec("italic")} />
        <BoutonOutil icone={Underline} titre="Souligné" actif={actifs.souligne} onClick={() => exec("underline")} />
        <BoutonOutil icone={Strikethrough} titre="Barré" actif={actifs.barre} onClick={() => exec("strikeThrough")} />
        <Separateur />
        {/* ── Couleurs : texte + fond (demande utilisateur) ── */}
        <ChoixCouleur
          titre="Couleur du texte"
          icone={Palette}
          valeur={couleurTexte}
          onChoisir={(c) => {
            setCouleurTexte(c);
            execCouleur("foreColor", c);
          }}
        />
        <ChoixCouleur
          titre="Couleur de fond (surlignage)"
          icone={Highlighter}
          valeur={couleurFond}
          onChoisir={(c) => {
            setCouleurFond(c);
            execCouleur("hiliteColor", c);
          }}
        />
        <Separateur />
        <BoutonOutil icone={List} titre="Liste à puces" actif={actifs.puces} onClick={() => exec("insertUnorderedList")} />
        <BoutonOutil icone={ListOrdered} titre="Liste numérotée" actif={actifs.numeros} onClick={() => exec("insertOrderedList")} />
        <BoutonOutil icone={Quote} titre="Citation" actif={actifs.citation} onClick={() => exec("formatBlock", "BLOCKQUOTE")} />
        <Separateur />
        <BoutonOutil icone={AlignLeft} titre="Aligner à gauche" actif={actifs.align === "gauche"} onClick={() => exec("justifyLeft")} />
        <BoutonOutil icone={AlignCenter} titre="Centrer" actif={actifs.align === "centre"} onClick={() => exec("justifyCenter")} />
        <BoutonOutil icone={AlignRight} titre="Aligner à droite" actif={actifs.align === "droite"} onClick={() => exec("justifyRight")} />
        <Separateur />
        <BoutonOutil icone={Link2} titre="Insérer un lien" onClick={ajouterLien} />
        <BoutonOutil icone={ImagePlus} titre="Insérer une image" onClick={ajouterImage} />
        <BoutonOutil icone={Table} titre="Insérer un tableau" onClick={ajouterTableau} />
        <Separateur />
        <BoutonOutil icone={Eraser} titre="Effacer la mise en forme" onClick={() => { exec("removeFormat"); exec("unlink"); }} />
        <BoutonOutil
          icone={Code2}
          titre={modeSource ? "Revenir à l'aperçu mis en forme" : "Modifier le code HTML"}
          actif={modeSource}
          onClick={basculerSource}
        />
      </div>

      {/* Zone d'édition WYSIWYG (restée montée, cachée en mode source) */}
      <div className={modeSource ? "hidden" : undefined}>
        <div
          ref={zoneRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Contenu de l'article"
          data-placeholder={placeholder}
          onInput={synchroniser}
          onBlur={synchroniser}
          onKeyUp={majActifs}
          onMouseUp={majActifs}
          className="editeur-riche-zone contenu-article min-h-72 max-h-[520px] overflow-y-auto px-4 py-3.5 text-[15px] leading-7 text-bleu focus:outline-none empty:before:text-adm-gris-clair empty:before:content-[attr(data-placeholder)]"
        />
      </div>

      {/* Mode source HTML */}
      {modeSource && (
        <textarea
          value={source}
          onChange={(e) => changerSource(e.target.value)}
          aria-label="Code HTML de l'article"
          spellCheck={false}
          className="min-h-72 max-h-[520px] w-full resize-y overflow-y-auto bg-[#0f172a] px-4 py-3.5 font-mono text-[13px] leading-6 text-[#e2e8f0] focus:outline-none"
          placeholder="<p>Colle ou modifie le HTML ici…</p>"
        />
      )}

      {/* Compteur */}
      <div className="flex items-center justify-between border-t border-adm-bordure px-4 py-2 text-[12px] leading-4 text-adm-gris">
        <span>
          {stats.mots} mot{stats.mots > 1 ? "s" : ""} · {stats.caracteres} caractère{stats.caracteres > 1 ? "s" : ""}
          {modeSource && " (mode HTML)"}
        </span>
        <span className="hidden sm:block">Mise en forme, couleurs, liens, images et tableaux s'affichent à l'identique sur le site.</span>
      </div>

      {/* Champ caché envoyé au serveur avec le formulaire */}
      <input type="hidden" name="contenu" value={html} />
    </div>
  );
}
