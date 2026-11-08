// components/skills/copier-code.tsx
// Lot 38 — bouton « copier » de la commande d'installation (CLIENT).
"use client";
import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopierCode({ code }: { code: string }) {
  const [copie, setCopie] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copier() {
    try {
      await navigator.clipboard.writeText(code);
      setCopie(true);
      if (minuteur.current) clearTimeout(minuteur.current);
      minuteur.current = setTimeout(() => setCopie(false), 2000);
    } catch {
      // Clipboard indisponible (permissions) — le code reste sélectionnable à la main
    }
  }

  return (
    <button
      type="button"
      onClick={copier}
      aria-label={copie ? "Code copié" : "Copier la commande"}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-bordure bg-white px-3 text-[13px] leading-5 font-medium text-bleu transition hover:border-violet hover:text-violet"
    >
      {copie ? (
        <>
          <Check className="size-3.5 text-violet" aria-hidden /> Copié&nbsp;!
        </>
      ) : (
        <>
          <Copy className="size-3.5" aria-hidden /> Copier
        </>
      )}
    </button>
  );
}