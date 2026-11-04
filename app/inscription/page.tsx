// app/inscription/page.tsx
import type { Metadata } from "next";
import { FormulaireInscription } from "@/components/auth/formulaire-inscription";

export const metadata: Metadata = { title: "Créer un compte — Webgiverse" };

export default async function PageInscription({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string; ref?: string }>;
}) {
  const { suite, ref } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-10">
      {/* 🤝 Lot 20 — arrivée via un lien de parrainage ?ref=… */}
      {ref && (
        <div className="mb-6 rounded-carte border border-violet/30 bg-violet/5 p-4">
          <p className="text-[13px] leading-5 font-semibold text-bleu">
            🤝 Tu as été invité sur Webgiverse !
          </p>
          <p className="mt-1 text-[12px] leading-4 text-encre">
            Crée ton compte : ton parrain recevra 14 jours Premium quand tu
            souscriras un abonnement. Merci de soutenir la communauté !
          </p>
        </div>
      )}
      <h1 className="text-h2 font-semibold">Crée ton compte gratuit 🚀</h1>
      <p className="mt-2 mb-6 text-encre">
        Sauvegarde tes outils préférés, crée des listes et discute avec l'assistant.
      </p>
      <FormulaireInscription suite={suite ?? "/dashboard"} refParrain={ref ?? undefined} />
    </main>
  );
}
