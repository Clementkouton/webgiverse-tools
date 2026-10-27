"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PageRetourPaiement() {
  const router = useRouter();

  useEffect(() => {
    const destination = "/dashboard/abonnement?paiement=reussi";

    // Si la page est chargée DANS la modale (iframe), on fait sortir
    // tout le navigateur vers la page abonnement
    try {
      if (window.self !== window.top && window.top) {
        window.top.location.href = destination;
        return;
      }
    } catch {
      // Accès refusé : on utilise la navigation normale
    }

    const minuteur = setTimeout(() => router.push(destination), 1200);
    return () => clearTimeout(minuteur);
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
      <h1 className="text-xl font-semibold text-slate-900">Paiement confirmé</h1>
      <p className="max-w-md text-sm text-slate-600">
        Redirection vers ton espace... Ton abonnement est activé automatiquement quelques
        secondes après le paiement. Si rien ne change, actualise la page abonnement.
      </p>
    </main>
  );
}