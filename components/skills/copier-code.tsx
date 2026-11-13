// components/skills/copier-code.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 41 — Bouton « Copier » de la commande d'installation d'une skill.
// Composant CLIENT : copie dans le presse-papiers (avec repli
// execCommand pour les navigateurs anciens) puis confirmation visuelle
// « Copié ! » pendant 2 secondes. Aucune dépendance à installer.
// ─────────────────────────────────────────────────────────────────
"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopierCode({
  texte,
  libelle = "Copier la commande",
}: {
  texte: string;
  libelle?: string;
}) {
  const [copie, setCopie] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nettoie le minuteur si le composant disparaît pendant les 2 s.
  useEffect(() => {
    return () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, []);

  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
    } catch {
      // Repli navigateurs sans Clipboard API (ou contexte non sécurisé)
      try {
        const zone = document.createElement("textarea");
        zone.value = texte;
        zone.setAttribute("readonly", "");
        zone.style.position = "fixed";
        zone.style.opacity = "0";
        document.body.appendChild(zone);
        zone.select();
        document.execCommand("copy");
        document.body.removeChild(zone);
      } catch {
        return; // impossible de copier : on n'affiche pas « Copié ! »
      }
    }
    setCopie(true);
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => setCopie(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copier}
      aria-live="polite"
      className={
        copie
          ? "inline-flex min-h-10 items-center gap-1.5 rounded-[7px]  not-italic bg-vert px-4 text-[13px] leading-4 font-semibold text-white transition active:scale-95"
          : "inline-flex min-h-10 items-center gap-1.5 rounded-[7px]  not-italic border border-violet/30 bg-white px-4 text-[13px] leading-4 font-semibold text-sky-500 transition hover:bg-violet hover:text-white active:scale-95"
      }
    >
      {copie ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copie ? "Copié !" : libelle}
    </button>
  );
}