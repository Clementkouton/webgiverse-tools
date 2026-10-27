"use client";

// components/tarifs/verification-retour.tsx
// Recharge la page toutes les 3 s : dès que le webhook Chariow a
// activé l'abonnement, la version serveur de /tarifs/retour affiche
// le succès (le composant disparaît tout seul).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

const MAX_ESSAIS = 20; // 20 × 3 s = 1 minute de vérification automatique

export function VerificationRetour() {
  const routeur = useRouter();
  const [essaies, setEssaies] = useState(0);

  useEffect(() => {
    if (essaies >= MAX_ESSAIS) return;
    const minuteur = setTimeout(() => {
      routeur.refresh();
      setEssaies((n) => n + 1);
    }, 3000);
    return () => clearTimeout(minuteur);
  }, [essaies, routeur]);

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <p className="flex items-center gap-2 text-[15px] leading-6 text-encre">
        <Loader2 className="size-4 animate-spin text-violet" aria-hidden />
        {essaies < MAX_ESSAIS
          ? "Vérification de ton paiement en cours…"
          : "La confirmation peut prendre jusqu'à une minute."}
      </p>
      <Link
        href="/dashboard/abonnement"
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-violet px-6 text-[15px] leading-5 font-semibold text-white transition hover:bg-violet-clair"
      >
        Vérifier dans mon tableau de bord
      </Link>
    </div>
  );
}