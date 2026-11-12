"use client";

// components/dashboard/bouton-tout-lu.tsx
// Lot 20 — bouton « Tout marquer comme lu » de la page notifications.
// Client component : appelle la server action puis recharge la page.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2 } from "lucide-react";
import { marquerToutesLues } from "@/app/actions/notifications";

export function BoutonToutLu() {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [fait, setFait] = useState(false);

  function clic() {
    demarrer(async () => {
      const r = await marquerToutesLues();
      if (r.ok) {
        setFait(true);
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={clic}
      disabled={enCours || fait}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-[7px] -skew-x-[18deg] not-italic border border-bordure bg-white px-3.5 text-[12px] leading-4 font-bold text-bleu transition hover:border-sky-500 hover:text-sky-500 disabled:opacity-60"
    >
      {enCours ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <CheckCheck className="size-3.5" aria-hidden />
      )}
      {fait ? "Tout est lu ✓" : "Tout marquer comme lu"}
    </button>
  );
}
