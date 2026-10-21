import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("outil");
  if (!slug) {
    return NextResponse.json({ erreur: "Slug requis." }, { status: 400 });
  }

  const outil = await prisma.tool.findUnique({ where: { slug } });
  if (!outil) {
    return NextResponse.json({ erreur: "Outil introuvable." }, { status: 404 });
  }

  const session = await auth();

  const avis = await (prisma as any).avis.findMany({
    where: { outilId: outil.id },
    include: { utilisateur: { select: { name: true, image: true } } },
    orderBy: { creeLe: "desc" },
  });

  const nombre = avis.length;
  const moyenne =
    nombre > 0
      ? Math.round((avis.reduce((s: number, a: { note: number }) => s + a.note, 0) / nombre) * 10) / 10
      : 0;

  const monAvis = session?.user?.id
    ? avis.find((a: { utilisateurId: string }) => a.utilisateurId === session.user.id) ?? null
    : null;

  return NextResponse.json({
    connecte: Boolean(session?.user?.id),
    nombre,
    moyenne,
    monAvis,
    avis: avis.map((a: {
      id: string;
      note: number;
      contenu: string;
      creeLe: Date;
      utilisateurId: string;
      utilisateur: { name: string | null; image: string | null } | null;
    }) => {
        return ({
            id: a.id,
            note: a.note,
            contenu: a.contenu,
            creeLe: a.creeLe,
            nom: a.utilisateur?.name ?? "Membre",
            image: a.utilisateur?.image ?? null,
            aMoi: a.utilisateurId === session?.user?.id,
        });
    }),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { erreur: "Connectez-vous pour laisser un avis." },
      { status: 401 }
    );
  }

  const { outil: slug, note, contenu } = await req.json();
  const n = Number(note);
  const texte = String(contenu ?? "").trim();

  if (!slug || !Number.isInteger(n) || n < 1 || n > 5) {
    return NextResponse.json(
      { erreur: "Choisis une note de 1 à 5 étoiles." },
      { status: 400 }
    );
  }
  if (texte.length < 10) {
    return NextResponse.json(
      { erreur: "Ton avis doit contenir au moins 10 caractères." },
      { status: 400 }
    );
  }
  if (texte.length > 2000) {
    return NextResponse.json(
      { erreur: "Ton avis ne doit pas dépasser 2000 caractères." },
      { status: 400 }
    );
  }

  const outil = await prisma.tool.findUnique({ where: { slug } });
  if (!outil) {
    return NextResponse.json({ erreur: "Outil introuvable." }, { status: 404 });
  }

  const avis = await (prisma as any).avis.upsert({
    where: {
      outilId_utilisateurId: { outilId: outil.id, utilisateurId: session.user.id },
    },
    create: {
      outilId: outil.id,
      utilisateurId: session.user.id,
      note: n,
      contenu: texte,
    },
    update: { note: n, contenu: texte },
  });

  await journaliser(
    session.user.id,
    "avis_publie",
    JSON.stringify({ outil: outil.slug, note: n })
  );

  return NextResponse.json({ ok: true, avis });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("outil");
  if (!slug) {
    return NextResponse.json({ erreur: "Slug requis." }, { status: 400 });
  }

  const outil = await prisma.tool.findUnique({ where: { slug } });
  if (!outil) {
    return NextResponse.json({ erreur: "Outil introuvable." }, { status: 404 });
  }

  await (prisma as any).avis.deleteMany({
    where: { outilId: outil.id, utilisateurId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}