// app/api/favoris/liste/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ── GET /api/favoris/liste ────────────────────────────────────────
// Renvoie TOUS les favoris de l'utilisateur connecté (avec les outils)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ connecte: false, favoris: [] });
  }

  const favoris = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    include: {
      tool: {
        select: {
          id: true,
          nom: true,
          slug: true,
          url: true,
          logo: true,
          description: true,
          tarif: true,
          gratuit: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ connecte: true, favoris });
}