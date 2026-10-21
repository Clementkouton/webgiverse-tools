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

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const { listeId } = await req.json();
  if (!listeId) {
    return NextResponse.json({ erreur: "Liste requise." }, { status: 400 });
  }

  const liste = await prisma.list.findUnique({ where: { id: String(listeId) } });
  if (!liste || liste.userId !== session.user.id) {
    return NextResponse.json({ erreur: "Liste introuvable." }, { status: 404 });
  }

  const estPublique = !(liste as typeof liste & { estPublique: boolean }).estPublique;
  let slug = (liste as typeof liste & { slug: string | null }).slug;
  if (estPublique && !slug) {
    slug = genererSlug(liste.nom ?? "liste");
  }

  const maj = await prisma.list.update({
    where: { id: liste.id },
    data: { estPublique, slug } as never,
  });

  await journaliser(session.user.id, "partage_liste", JSON.stringify({
    liste: maj.id,
    publique: estPublique,
  }));

  return NextResponse.json({
    ok: true,
    publique: estPublique,
    slug,
  });
}