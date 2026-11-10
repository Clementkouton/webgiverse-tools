// app/api/listes/slug/route.ts
// Lot 55 — idée 13 : lien personnalisé (URL de marque) pour les listes
// partagées, réservé au plan Entreprise. /listes/mon-agence au lieu de
// /listes/mes-outils-x7k2p9.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";
import { entrepriseActif } from "@/lib/premium";

const FORMAT_SLUG = /^[a-z0-9-]{3,40}$/;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const { listeId, slug } = await req.json();
  if (!listeId || typeof slug !== "string") {
    return NextResponse.json({ erreur: "Liste et lien requis." }, { status: 400 });
  }

  // Normalisation : minuscules, sans accents, tirets uniques, pas de
  // tiret au début ni à la fin.
  const propre = slug
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!FORMAT_SLUG.test(propre)) {
    return NextResponse.json(
      {
        erreur:
          "Lien invalide : 3 à 40 caractères (minuscules, chiffres, tirets).",
      },
      { status: 400 }
    );
  }

  const liste = await prisma.list.findUnique({ where: { id: String(listeId) } });
  if (!liste || liste.userId !== session.user.id) {
    return NextResponse.json({ erreur: "Liste introuvable." }, { status: 404 });
  }

  if (!(await entrepriseActif(session.user.id))) {
    return NextResponse.json(
      { erreur: "Le lien personnalisé est réservé au plan Entreprise." },
      { status: 403 }
    );
  }

  // Disponibilité du slug (le champ est @unique au schéma).
  const existante = await prisma.list.findUnique({
    where: { slug: propre },
    select: { id: true },
  });
  if (existante && existante.id !== liste.id) {
    return NextResponse.json(
      { erreur: "Ce lien est déjà pris par une autre liste." },
      { status: 409 }
    );
  }

  try {
    const maj = await prisma.list.update({
      where: { id: liste.id },
      data: { slug: propre },
    });

    await journaliser(
      session.user.id,
      "liste_slug_personnalise",
      JSON.stringify({ liste: maj.id, slug: propre })
    );

    return NextResponse.json({ ok: true, slug: maj.slug });
  } catch (erreur) {
    // P2002 = violation d'unicité (course entre deux demandes)
    if ((erreur as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { erreur: "Ce lien est déjà pris par une autre liste." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { erreur: "Impossible d'enregistrer le lien." },
      { status: 500 }
    );
  }
}