// app/connexion/page.tsx
import type { Metadata } from "next";
import { default as FormulaireConnexion } from "@/components/auth/formulaire-connexion";
import Link from "next/link";

export const metadata: Metadata = { title: "Connexion — Webgiverse" };

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string; reinitialise?: string }>;
}) {
  const { suite, reinitialise } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-h2 font-semibold">Content de te revoir 👋</h1>
      <p className="mt-2 mb-6 text-encre">
        Connecte-toi pour accéder à ton espace, tes favoris et l'assistant.
      </p>
      <Link href="/mot-de-passe-oublie" className="text-sm font-medium text-violet hover:underline">
  Mot de passe oublié ?
</Link>
      <FormulaireConnexion suite={suite ?? "/dashboard"} />
    </main>
  );
}