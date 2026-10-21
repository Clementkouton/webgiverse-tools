import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VueAnnuaire } from "@/components/annuaire/vue-annuaire";

export const revalidate = 3600;

export async function generateStaticParams() {
  const categories = await prisma.category.findMany({ select: { slug: true } });
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const categorie = await prisma.category.findUnique({ where: { slug } });
  return categorie
    ? { title: `Outils ${categorie.nom}`, description: `Les meilleurs outils IA pour ${categorie.nom.toLowerCase()}, sélectionnés par Webgiverse.` }
    : {};
}

export default async function PageCategorie({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categorie = await prisma.category.findUnique({ where: { slug } });
  if (!categorie) notFound();

  return (
    <VueAnnuaire
      titre={categorie.nom}
      sousTitre={`outils classés ${categorie.nom.toLowerCase()} dans l'annuaire.`}
      filtres={{ categorie: slug, tri: "populaire" }}
      icone={categorie.icone}
    />
  );
}