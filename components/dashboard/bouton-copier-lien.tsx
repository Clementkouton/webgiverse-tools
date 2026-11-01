"use client";

// components/dashboard/bouton-copier-lien.tsx
// Lot 20 — champ lien de parrainage avec bouton « Copier ».
// Clipboard API avec repli document.execCommand (navigateurs anciens).
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";

export function BoutonCopierLien({ lien }: { lien: string }) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(lien);
    } catch {
      // Repli pour les navigateurs sans Clipboard API (HTTP local…)
      try {
        const champ = document.createElement("textarea");
        champ.value = lien;
        document.body.appendChild(champ);
        champ.select();
        document.execCommand("copy");
        document.body.removeChild(champ);
      } catch {
        return;
      }
    }
    setCopie(true);
    setTimeout(() => setCopie(false), 2500);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        readOnly
        value={lien}
        onFocus={(e) => e.currentTarget.select()}
        aria-label="Ton lien de parrainage"
        className="min-h-11 w-full flex-1 rounded-champ border border-bordure bg-gris px-3 text-[14px] leading-5 text-bleu focus:border-violet focus:outline-none"
      />
      <Bouton type="button" onClick={copier} className="shrink-0">
        {copie ? (
          <>
            <Check aria-hidden /> Copié !
          </>
        ) : (
          <>
            <Copy aria-hidden /> Copier le lien
          </>
        )}
      </Bouton>
    </div>
  );
}
