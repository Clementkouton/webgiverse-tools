"use client";
// components/skills/copier-code.tsx
// Lot 40 — commande d'installation avec bouton Copier (identique lot 39).
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopierCode({ commande }: { commande: string }) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(commande);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      /* presse-papiers indisponible (permissions, http) : rien à faire */
    }
  }

  return (
    <div className="mt-2 overflow-hidden rounded-carte border border-bordure bg-gris">
      <div className="flex items-center justify-between gap-3 border-b border-bordure px-4 py-2">
        <span className="text-[12px] leading-4 font-semibold tracking-wide text-encre uppercase">
          Installation
        </span>
        <button
          type="button"
          onClick={copier}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-bordure bg-white px-3 text-[13px] leading-4 font-medium text-bleu transition hover:border-violet hover:text-violet"
        >
          {copie ? (
            <Check className="size-3.5 text-violet" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          {copie ? "Copié" : "Copier"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-[13px] leading-6 text-bleu">
        <code>{commande}</code>
      </pre>
    </div>
  );
}