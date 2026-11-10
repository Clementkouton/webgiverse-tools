import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { entrepriseActif } from "@/lib/premium";
import CarteOutil from "@/components/outil/carte-outil";
import CompteurVuesListe from "@/components/partage/compteur-vues-liste";
import BoutonExportPdf from "@/components/pdf/bouton-export-pdf";
import type { CarteOutil as OutilCarte } from "@/lib/queries";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const liste = await prisma.list.findFirst({
    where: {
      OR: [{ slug: slug }, { id: slug }],
      estPublique: true,
    },
    select: { nom: true },
  });
  return {
    title: liste ? `${liste.nom} — Webgiverse` : "Liste partagée — Webgiverse",
  };
}

export default async function PageListePublique({ params }: Props) {
  const { slug } = await params;
  const session = await auth();

  const liste = await prisma.list.findFirst({
    where: {
      OR: [{ slug: slug }, { id: slug }],
      estPublique: true,
    },
    select: {
      id: true,
      nom: true,
      userId: true,
      logoUrl: true,
      descriptionPartage: true,
    },
  });

  if (!liste) notFound();

  const [proprietaire, entreprise] = await Promise.all([
    prisma.user.findUnique({
      where: { id: liste.userId },
      select: { name: true, image: true },
    }),
    entrepriseActif(liste.userId),
  ]);

  const estProprietaire = Boolean(
    session?.user?.id && session.user.id === liste.userId
  );

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
      {/* Lot 55 — compteur de vues (invisible, 1 max par mois et par navigateur) */}
      <CompteurVuesListe listeId={liste.id} />

      <header className="mb-10 rounded-carte border border-bordure bg-gris p-6 sm:p-8">
        {liste.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={liste.logoUrl}
            alt={`Logo de la liste ${liste.nom}`}
            className="mb-4 h-16 w-auto"
          />
        )}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-500">
            Liste partagée
          </p>
          {entreprise && (
            <span className="rounded-full border border-bordure bg-white px-2 py-0.5 text-[11px] font-semibold text-sky-500">
              ✓ Entreprise
            </span>
          )}
        </div>
        <h1 className="font-titre text-h2 text-encre">{liste.nom}</h1>
        {liste.descriptionPartage ? (
          <p className="mt-2 text-sm text-encre/70">{liste.descriptionPartage}</p>
        ) : (
          <p className="mt-2 text-sm text-encre/70">
            Une sélection de {cartes.length} outil{cartes.length > 1 ? "s" : ""} IA
            {proprietaire?.name ? ` par ${proprietaire.name}` : ""}.
          </p>
        )}

        {/* Lot 55 — idée 17 : export PDF de la liste (propriétaire Entreprise) */}
        {estProprietaire && entreprise && cartes.length > 0 && (
          <div className="mt-4">
            <BoutonExportPdf
              titre={liste.nom}
              sousTitre={
                liste.descriptionPartage ??
                `Sélection partagée par ${
                  proprietaire?.name ?? "un membre Webgiverse"
                }`
              }
              outils={cartes.map((c) => ({
                nom: c.nom,
                description: c.description,
                tarif: c.tarif,
                slug: c.slug,
                gratuit: c.gratuit,
              }))}
              libelle="Exporter la liste en PDF"
              fichier={`liste-${slug}`}
            />
          </div>
        )}
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

      {entreprise ? (
        /* Lot 55 — idée 16 : signature sobre pour les pages Entreprise
           (la bannière d'inscription est remplacée). */
        <div className="mt-12 rounded-carte border border-bordure bg-gris p-6 text-center shadow-carte sm:p-8">
          <p className="text-sm text-encre/70">
            Propulsé par{" "}
            <Link
              href="/"
              className="font-semibold text-sky-500 transition hover:underline"
            >
              Webgiverse
            </Link>
          </p>
        </div>
      ) : (
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
            className="mt-4 inline-block rounded-champ bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500-700"
          >
            Créer mon compte gratuit
          </Link>
        </div>
      )}
    </div>
  );
} 