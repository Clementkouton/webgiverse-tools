// app/admin/outils/nouveau/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { FormulaireOutil } from "@/components/admin/formulaire-outil";
import { creerOutilAction } from "@/app/actions/admin";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Nouvel outil — Administration" };
export const dynamic = "force-dynamic";

export default async function PageNouvelOutil() {
  // Le formulaire a besoin de la liste des catégories pour ses cases à cocher.
  const categories = await prisma.category.findMany({
    orderBy: { ordre: "asc" },
    select: { id: true, nom: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/outils" className="inline-flex items-center gap-1 text-[14px] font-semibold text-violet hover:underline">
        <ChevronLeft className="size-4" aria-hidden /> Retour à la liste des outils
      </Link>
      <h2 className="mt-3 text-h3 font-semibold">Ajouter un outil</h2>
      <p className="mt-1 text-[14px] leading-5 text-encre">
        Remplis la fiche : c'est exactement ce que verront les visiteurs sur la page de l'outil.
        Si tu ne connais pas le logo, on utilise automatiquement le favicon du site officiel.
      </p>
      <div className="mt-6">
        <FormulaireOutil action={creerOutilAction} categories={categories} />
      </div>
    </div>
  );
}