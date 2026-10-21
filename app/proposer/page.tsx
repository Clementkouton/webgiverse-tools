// app/proposer/page.tsx
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { FormulaireProposition } from "@/components/proposer/formulaire-proposition";

export const metadata: Metadata = {
  title: "Proposer un outil",
  description: "Fais découvrir un outil IA à la communauté Webgiverse. Vérification par l'équipe avant publication.",
};

export default async function PageProposer() {
  const categories = await prisma.category.findMany({ orderBy: { ordre: "asc" } });
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 lg:py-14">
      <h1 className="text-[30px] leading-9 font-semibold sm:text-h2">Proposer un outil</h1>
      <p className="mesure mt-2 mb-8 text-encre">
        Deux minutes suffisent. L'équipe vérifie que l'outil existe, qu'il est utile et disponible en français de préférence.
      </p>
      <FormulaireProposition categories={categories.map((c) => ({ id: c.id, nom: c.nom }))} />
    </div>
  );
}