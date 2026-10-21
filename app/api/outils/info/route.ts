import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("outil");
  if (!slug) {
    return NextResponse.json({ erreur: "Slug requis." }, { status: 400 });
  }

  const outil = await prisma.tool.findUnique({
    where: { slug },
    select: {
      nom: true,
      slug: true,
      logo: true,
      description: true,
      tarif: true,
      gratuit: true,
      statut: true,
    },
  });

  if (!outil || outil.statut !== "PUBLIE") {
    return NextResponse.json({ erreur: "Outil introuvable." }, { status: 404 });
  }

  return NextResponse.json({
    nom: outil.nom,
    slug: outil.slug,
    logo: outil.logo,
    description: outil.description,
    tarif: outil.tarif,
    gratuit: outil.gratuit,
  });
}