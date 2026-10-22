// app/admin/outils/[id]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { FormulaireOutil } from "@/components/admin/formulaire-outil";
import { majOutilAction } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Modifier l'outil — Administration" };
export const dynamic = "force-dynamic";

export default async function PageModifierOutil({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [outil, categories] = await Promise.all([
    prisma.tool.findUnique({
      where: { id },
      include: { categories: { select: { categorieId: true } } },
    }),
    prisma.category.findMany({ orderBy: { ordre: "asc" }, select: { id: true, nom: true } }),
  ]);

  if (!outil) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/outils" className="inline-flex items-center gap-1 text-[14px] font-semibold text-violet hover:underline">
        <ChevronLeft className="size-4" aria-hidden /> Retour à la liste des outils
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-h3 font-semibold">Modifier : {outil.nom}</h2>
          <p className="mt-1 text-[14px] leading-5 text-encre">Les changements sont visibles sur le site dès l'enregistrement.</p>
        </div>
        <a
          href={`/outil/${outil.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-violet hover:underline"
        >
          Voir la fiche publique <ExternalLink className="size-4" aria-hidden />
        </a>
      </div>
      <div className="mt-6">
        <FormulaireOutil
          action={majOutilAction}
          categories={categories}
          outil={{
            id: outil.id,
            nom: outil.nom,
            slug: outil.slug,
            url: outil.url,
            logo: outil.logo,
            description: outil.description,
            type: outil.type,
            tarif: outil.tarif,
            tarifMin: outil.tarifMin,
            gratuit: outil.gratuit,
            openSource: outil.openSource,
            misEnAvant: outil.misEnAvant,
            niveau: outil.niveau,
            langues: outil.langues,
            objectifs: outil.objectifs,
            fonctions: outil.fonctions,
            casUsage: outil.casUsage,
            statut: outil.statut,
            verifie: Boolean(outil.verifieLe),
            categories: outil.categories.map((c) => c.categorieId),
          }}
        />
      </div>
    </div>
  );
}