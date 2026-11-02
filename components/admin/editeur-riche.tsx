// components/admin/editeur-riche.tsx
"use client";
// ─────────────────────────────────────────────────────────────────
// Lot 23 — ÉDITEUR RICHE (WYSIWYG) pour la Description des articles,
// calqué sur la maquette fournie : barre d'outils au-dessus de la
// zone de saisie (gras, italique, souligné, barré, titres, listes,
// citation, alignements, lien, image, tableau, annuler/rétablir,
// effacer le format), compteur de mots, champ caché synchronisé
// (name="contenu") envoyé avec le formulaire.
//   • compatible avec l'ancien contenu « texte brut » : au montage,
//     un texte sans balises est converti en paragraphes ;
//   • aucune dépendance externe (contentEditable + execCommand) ;
//   • le HTML est assaini côté serveur (lib/html.ts) à l'enregistrement.
// ─────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
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
  /** Contenu actuel : HTML ou ancien texte brut. */
  valeurInitiale?: string;
  placeholder?: string;
  onChange?: (html: string, texte: string) => void;
}) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState("");
  const [stats, setStats] = useState({ mots: 0, caracteres: 0 });
  const [actifs, setActifs] = useState<EtatActifs>(ACTIFS_VIDES);

  /** Lit l'état courant (boutons surlignés) depuis la sélection. */
  const majActifs = useCallback(() => {
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
  }, []);

  /** Synchronise le champ caché + le compteur. */
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

  // Montage : charge le contenu initial (HTML ou ancien texte brut)
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
      </div>

      {/* Zone d'édition */}
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
        className="editeur-riche-zone min-h-72 max-h-[520px] overflow-y-auto px-4 py-3.5 text-[15px] leading-7 text-bleu focus:outline-none empty:before:text-adm-gris-clair empty:before:content-[attr(data-placeholder)]"
      />

      {/* Compteur */}
      <div className="flex items-center justify-between border-t border-adm-bordure px-4 py-2 text-[12px] leading-4 text-adm-gris">
        <span>
          {stats.mots} mot{stats.mots > 1 ? "s" : ""} · {stats.caracteres} caractère{stats.caracteres > 1 ? "s" : ""}
        </span>
        <span className="hidden sm:block">Gras, titres, listes, liens, images et tableaux s'affichent tels quels sur le site.</span>
      </div>

      {/* Champ caché envoyé au serveur avec le formulaire */}
      <input type="hidden" name="contenu" value={html} />
    </div>
  );
}