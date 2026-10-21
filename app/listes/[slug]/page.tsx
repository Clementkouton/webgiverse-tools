import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CarteOutil from "@/components/outil/carte-outil";
import type { CarteOutil as OutilCarte } from "@/lib/queries";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const liste = await prisma.list.findFirst({
    where: { id: slug },
    select: { nom: true },
  });
  return {
    title: liste ? `${liste.nom} — Webgiverse` : "Liste partagée — Webgiverse",
  };
}

export default async function PageListePublique({ params }: Props) {
  const { slug } = await params;

  const liste = await prisma.list.findFirst({
    where: { id: slug },
    select: { id: true, nom: true, userId: true },
  });

  if (!liste) notFound();

  const proprietaire = await prisma.user.findUnique({
    where: { id: liste.userId },
    select: { name: true, image: true },
  });

  const items = await prisma.listItem.findMany({
    where: { listId: liste.id },
  });

  const ids = items.map((i) => i.toolId);
  const outilsBruts = ids.length
    ? await prisma.tool.findMany({
        where: { id: { in: ids }, statut: "PUBLIE" },
      })
    : [];

  const parId = new Map(outilsBruts.map((o) => [o.id, o]));
  const outils = items
    .map((i) => parId.get(i.toolId))
    .filter((o): o is NonNullable<typeof o> => Boolean(o));

  const cartes: OutilCarte[] = outils.map((o) => ({
    id: o.id,
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
    verifieLe: o.verifieLe ?? null,
  }));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12">
      <header className="mb-10 rounded-carte border border-bordure bg-gris p-6 sm:p-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet">
          Liste partagée
        </p>
        <h1 className="font-titre text-h2 text-encre">{liste.nom}</h1>
        <p className="mt-2 text-sm text-encre/70">
          Une sélection de {cartes.length} outil{cartes.length > 1 ? "s" : ""} IA
          {proprietaire?.name ? ` par ${proprietaire.name}` : ""}.
        </p>
      </header>

      {cartes.length === 0 ? (
        <p className="rounded-carte border border-bordure bg-white p-8 text-center text-encre/60 shadow-carte">
          Cette liste ne contient pas encore d&apos;outil publié.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cartes.map((c) => (
            <CarteOutil key={c.slug} outil={c} />
          ))}
        </div>
      )}

      <div className="mt-12 rounded-carte border border-bordure bg-white p-6 text-center shadow-carte sm:p-8">
        <h2 className="font-titre text-h3 text-encre">
          Crée ta propre sélection d&apos;outils IA
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-encre/70">
          Webgiverse te permet de sauvegarder tes outils préférés, de les
          organiser en listes et de les partager en un lien.
        </p>
        <Link
          href="/inscription"
          className="mt-4 inline-block rounded-champ bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
        >
          Créer mon compte gratuit
        </Link>
      </div>
    </div>
  );
}