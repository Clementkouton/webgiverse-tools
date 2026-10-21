// components/commun/bouton-copier.tsx
"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function BoutonCopier({ texte, libelle = "Copier" }: { texte: string; libelle?: string }) {
  const [copie, setCopie] = useState(false);
  return (
    <button type="button" onClick={async () => {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    }}
      className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-violet bg-white px-4 text-[14px] leading-5 font-semibold text-bleu transition hover:bg-gris">
      {copie ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copie ? "Copié !" : libelle}
    </button>
  );
}