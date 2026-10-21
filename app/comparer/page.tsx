// app/comparer/page.tsx
import type { Metadata } from "next";
import { Comparateur } from "@/components/comparer/comparateur";
import { prisma } from "@/lib/prisma";
import { versCarte } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Comparer des outils IA",
  description: "Compare deux ou trois outils IA côte à côte : tarifs, langues, niveau et fonctions.",
};

export default async function PageComparer({
  searchParams,
}: {
  searchParams: Promise<{ outils?: string }>;
}) {
  const { outils: param } = await searchParams;
  const slugs = (param ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const trouves = slugs.length
    ? await prisma.tool.findMany({ where: { slug: { in: slugs }, statut: "PUBLIE" },
        include: { categories: { select: { categorie: { select: { nom: true, slug: true } } } } } })
    : [];
  const ordonnes = slugs.map((s) => trouves.find((o) => o.slug === s)).filter(Boolean);
  return <Comparateur outils={ordonnes.map((o) => versCarte(o!))} />;
}