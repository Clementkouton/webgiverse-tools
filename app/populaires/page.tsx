import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CarteOutil from "@/components/outil/carte-outil";
import type { CarteOutil as OutilCarte } from "@/lib/queries";

export const metadata = {
  title: "Outils populaires — Webgiverse",
  description:
    "Le classement des outils IA les plus recommandés par la communauté Webgiverse.",
};

export default async function PagePopulaires() {
  const outils = await prisma.tool.findMany({
    where: { statut: "PUBLIE" },
    orderBy: { nom: "asc" },
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12">
      <header className="mb-10">
        <h1 className="font-titre text-h2 text-encre">Outils populaires</h1>
        <p className="mt-2 max-w-2xl text-encre/70">
          Le classement des outils les plus recommandés par la communauté
          Webgiverse. Connecte-toi et recommande tes outils préférés pour les
          faire monter !
        </p>
        <Link
          href="/outils"
          className="mt-4 inline-block text-sm font-medium text-violet hover:underline"
        >
          Voir tous les outils →
        </Link>
      </header>

      {outils.length === 0 ? (
        <p className="rounded-carte border border-bordure bg-gris p-8 text-center text-encre/70">
          Aucun outil publié pour le moment.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {outils.map((o) => {
            const carte: OutilCarte = {
                nom: o.nom,
                slug: o.slug,
                logo: o.logo ?? "",
                description: o.description,
                tarif: o.tarif ?? "",
                gratuit: o.gratuit,
                openSource: o.openSource,
                type: o.type,
                categories: [],
                nouveau: false,
                id: "",
                verifieLe: null
            };
            return (
              <div key={o.id}>
                <CarteOutil outil={carte} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}