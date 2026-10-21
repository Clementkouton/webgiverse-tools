// app/categories/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { listerCategories } from "@/lib/queries";
import { IconeCategorie } from "@/components/commun/icone-categorie";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Catégories", description: "Toutes les catégories d'outils IA de l'annuaire Webgiverse." };

export default async function PageCategories() {
  const categories = await listerCategories();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:py-14">
      <h1 className="text-[30px] leading-9 font-semibold sm:text-h2">Catégories</h1>
      <p className="mesure mt-2 text-encre">Explore l'annuaire par famille d'outils.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Link key={c.slug} href={`/categorie/${c.slug}`}
            className="flex items-center gap-4 rounded-carte border border-bordure bg-white p-5 shadow-carte transition hover:border-violet">
            <IconeCategorie nom={c.icone} className="size-8 text-violet" />
            <div>
              <h2 className="font-titre text-[17px] leading-6 font-semibold">{c.nom}</h2>
              <p className="text-legende text-encre">{c._count.outils} outil{c._count.outils > 1 ? "s" : ""}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}