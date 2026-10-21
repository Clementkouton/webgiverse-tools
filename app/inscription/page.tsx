// app/inscription/page.tsx
import type { Metadata } from "next";
import { FormulaireInscription } from "@/components/auth/formulaire-inscription";

export const metadata: Metadata = { title: "Créer un compte — Webgiverse" };

export default async function PageInscription({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string }>;
}) {
  const { suite } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-h2 font-semibold">Crée ton compte gratuit 🚀</h1>
      <p className="mt-2 mb-6 text-encre">
        Sauvegarde tes outils préférés, crée des listes et discute avec l'assistant.
      </p>
      <FormulaireInscription suite={suite ?? "/dashboard"} />
    </main>
  );
}