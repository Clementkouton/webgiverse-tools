"use client";
// components/skills/copier-code.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 38 (réécriture lot 39) — bouton « Copier » de la commande
// d'installation d'une skill. Composant CLIENT (uniquement lui).
// Repli pour les navigateurs sans Clipboard API (execCommand).
// ─────────────────────────────────────────────────────────────────
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopierCode({ commande, libelle = "Copier" }: { commande: string; libelle?: string }) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(commande);
    } catch {
      // Repli navigateurs anciens : sélection manuelle + copie
      const zone = document.createElement("textarea");
      zone.value = commande;
      zone.setAttribute("readonly", "");
      zone.style.position = "fixed";
      zone.style.opacity = "0";
      document.body.appendChild(zone);
      zone.select();
      document.execCommand("copy");
      zone.remove();
    }
    setCopie(true);
    window.setTimeout(() => setCopie(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copier}
      aria-live="polite"
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] leading-4 font-semibold transition ${
        copie
          ? "bg-white text-ciel-fonce"
          : "bg-white/10 text-white hover:bg-white/20"
      }`}
    >
      {copie ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {copie ? "Copié !" : libelle}
    </button>
  );
}