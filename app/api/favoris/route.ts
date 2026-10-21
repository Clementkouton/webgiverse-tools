// app/api/favoris/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";

// ── GET /api/favoris?outil=slug ───────────────────────────────────
export async function GET(requete: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ favori: false, connecte: false });
  }

  const slug = requete.nextUrl.searchParams.get("outil");
  if (!slug) {
    return NextResponse.json({ erreur: "Paramètre 'outil' manquant." }, { status: 400 });
  }

  const outil = await prisma.tool.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!outil) {
    return NextResponse.json({ erreur: "Outil introuvable." }, { status: 404 });
  }

  const favori = await prisma.favorite.findFirst({
    where: { userId: session.user.id, toolId: outil.id },
    select: { id: true },
  });

  return NextResponse.json({ favori: Boolean(favori), connecte: true });
}

// ── POST /api/favoris  corps : { outil: "slug" } ──────────────────
export async function POST(requete: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { erreur: "Connectez-vous pour enregistrer vos favoris." },
      { status: 401 }
    );
  }

  const corps = await requete.json().catch(() => null);
  const slug = corps?.outil ?? corps?.slug ?? corps?.outilSlug;
  if (typeof slug !== "string" || !slug) {
    return NextResponse.json({ erreur: "Paramètre 'outil' manquant." }, { status: 400 });
  }

  const outil = await prisma.tool.findUnique({
    where: { slug },
    select: { id: true, nom: true },
  });
  if (!outil) {
    return NextResponse.json({ erreur: "Outil introuvable." }, { status: 404 });
  }

  const existant = await prisma.favorite.findFirst({
    where: { userId: session.user.id, toolId: outil.id },
    select: { id: true },
  });

  if (existant) {
    await prisma.favorite.delete({ where: { id: existant.id } });
    await journaliser(session.user.id, "favori", `Retiré : ${slug}`);
    return NextResponse.json({ favori: false });
  }

  await prisma.favorite.create({
    data: { userId: session.user.id, toolId: outil.id },
  });
  await journaliser(session.user.id, "favori", `Ajouté : ${slug}`);
  return NextResponse.json({ favori: true });
}