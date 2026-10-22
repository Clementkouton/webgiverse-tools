// app/api/favoris/partage/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";

function genererSlug(nom: string) {
  const base =
    nom
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "liste";
  const suffixe = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffixe}`;
}

const NOM_LISTE = "Ma sélection";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  // Le model List utilise `userId` et le champ de visibilité s'appelle `estPublique`.
  let liste = await prisma.list.findFirst({
    where: { userId: session.user.id, nom: NOM_LISTE },
  });

  // Si la liste existe déjà et est publique → on arrête le partage
  if (liste?.estPublique) {
    await prisma.list.update({
      where: { id: liste.id },
      data: { estPublique: false },
    });
    return NextResponse.json({ ok: true, publique: false, slug: null });
  }

  // Récupérer les favoris actuels
  const favoris = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    include: { tool: { select: { id: true } } },
  });

  if (favoris.length === 0) {
    return NextResponse.json(
      { erreur: "Ajoute d'abord des outils à tes favoris." },
      { status: 400 }
    );
  }

  // Créer la liste si elle n'existe pas
  if (!liste) {
    liste = await prisma.list.create({
      data: {
        userId: session.user.id,
        nom: NOM_LISTE,
        estPublique: true,
        slug: genererSlug(NOM_LISTE),
      },
    });
  }

  // Référence non-nulle pour TypeScript dans les fermetures ci-dessous
  const listeFinale = liste;

  // Synchroniser le contenu de la liste avec les favoris actuels
  await prisma.listItem.deleteMany({ where: { listId: listeFinale.id } });
  await prisma.listItem.createMany({
    data: favoris.map((f) => ({ listId: listeFinale.id, toolId: f.tool.id })),
  });

  await prisma.list.update({
    where: { id: listeFinale.id },
    data: { estPublique: true },
  });

  await journaliser(
    session.user.id,
    "partage_favoris",
    JSON.stringify({ liste: listeFinale.id })
  );

  return NextResponse.json({
    ok: true,
    publique: true,
    slug: listeFinale.slug,
  });
}