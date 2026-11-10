// app/api/listes/etat/route.ts
// Lot 55 — État du partage d'une liste pour le bloc partage du dashboard :
// visibilité, slug, nombre de vues et droit aux privilèges Entreprise.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { entrepriseActif } from "@/lib/premium";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const listeId = searchParams.get("listeId");
  if (!listeId) {
    return NextResponse.json({ erreur: "Liste requise." }, { status: 400 });
  }

  const liste = await prisma.list.findUnique({
    where: { id: listeId },
    select: {
      userId: true,
      estPublique: true,
      slug: true,
      vues: true,
      logoUrl: true,
      descriptionPartage: true,
    },
  });
  if (!liste || liste.userId !== session.user.id) {
    return NextResponse.json({ erreur: "Liste introuvable." }, { status: 404 });
  }

  const entreprise = await entrepriseActif(session.user.id);

  return NextResponse.json({
    ok: true,
    publique: liste.estPublique,
    slug: liste.slug,
    vues: liste.vues,
    logoUrl: liste.logoUrl,
    descriptionPartage: liste.descriptionPartage,
    entreprise,
  });
}