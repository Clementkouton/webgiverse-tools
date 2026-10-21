// app/api/avis/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("outil");
    if (!slug) {
      return NextResponse.json({ erreur: "Slug requis." }, { status: 400 });
    }

    // Le délégué « avis » n'existe que si le client Prisma a été régénéré.
    const avis = (prisma as any).avis;
    if (!avis || typeof avis.findMany !== "function") {
      return NextResponse.json(
        {
          erreur:
            "Le client Prisma ne contient pas le modèle Avis. Arrêtez le serveur (Ctrl+C), puis lancez dans l'ordre : npx prisma validate → npx prisma generate → npx prisma db push → npm run dev.",
        },
        { status: 503 }
      );
    }

    const outil = await prisma.tool.findUnique({ where: { slug } });
    if (!outil) {
      return NextResponse.json({ erreur: "Outil introuvable." }, { status: 404 });
    }

    const session = await auth();

    const listeAvis = await avis.findMany({
      where: { outilId: outil.id },
      include: { utilisateur: { select: { name: true, image: true } } },
      orderBy: { creeLe: "desc" },
    });

    const nombre = listeAvis.length;
    const moyenne =
      nombre > 0
        ? Math.round(
            (listeAvis.reduce((s: number, a: { note: number }) => s + a.note, 0) / nombre) * 10
          ) / 10
        : 0;

    const monAvis = session?.user?.id
      ? listeAvis.find((a: { utilisateurId: string }) => a.utilisateurId === session.user.id) ?? null
      : null;

    return NextResponse.json({
      connecte: Boolean(session?.user?.id),
      nombre,
      moyenne,
      monAvis,
      avis: listeAvis.map(
        (a: {
          id: string;
          note: number;
          contenu: string;
          creeLe: Date;
          utilisateurId: string;
          utilisateur: { name: string | null; image: string | null } | null;
        }) => ({
          id: a.id,
          note: a.note,
          contenu: a.contenu,
          creeLe: a.creeLe,
          nom: a.utilisateur?.name ?? "Membre",
          image: a.utilisateur?.image ?? null,
          aMoi: a.utilisateurId === session?.user?.id,
        })
      ),
    });
  } catch (erreur: any) {
    // Le VRAI message d'erreur s'affiche désormais dans le terminal
    console.error("[/api/avis][GET] ERREUR COMPLÈTE :", erreur);
    return NextResponse.json(
      {
        erreur: "Erreur interne /api/avis.",
        detail: String(erreur?.message ?? erreur),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { erreur: "Connectez-vous pour laisser un avis." },
        { status: 401 }
      );
    }

    const avis = (prisma as any).avis;
    if (!avis || typeof avis.upsert !== "function") {
      return NextResponse.json(
        {
          erreur:
            "Le client Prisma ne contient pas le modèle Avis. Arrêtez le serveur (Ctrl+C), puis lancez dans l'ordre : npx prisma validate → npx prisma generate → npx prisma db push → npm run dev.",
        },
        { status: 503 }
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

    const avisEnregistre = await avis.upsert({
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

    try {
      await journaliser(
        session.user.id,
        "avis_publie",
        JSON.stringify({ outil: outil.slug, note: n })
      );
    } catch (e) {
      // Le journal ne doit jamais faire échouer un avis.
      console.error("[/api/avis][POST] journaliser a échoué (non bloquant) :", e);
    }

    return NextResponse.json({ ok: true, avis: avisEnregistre });
  } catch (erreur: any) {
    console.error("[/api/avis][POST] ERREUR COMPLÈTE :", erreur);
    return NextResponse.json(
      {
        erreur: "Erreur interne /api/avis.",
        detail: String(erreur?.message ?? erreur),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
    }

    const avis = (prisma as any).avis;
    if (!avis || typeof avis.deleteMany !== "function") {
      return NextResponse.json(
        {
          erreur:
            "Le client Prisma ne contient pas le modèle Avis. Arrêtez le serveur (Ctrl+C), puis lancez dans l'ordre : npx prisma validate → npx prisma generate → npx prisma db push → npm run dev.",
        },
        { status: 503 }
      );
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

    await avis.deleteMany({
      where: { outilId: outil.id, utilisateurId: session.user.id },
    });

    return NextResponse.json({ ok: true });
  } catch (erreur: any) {
    console.error("[/api/avis][DELETE] ERREUR COMPLÈTE :", erreur);
    return NextResponse.json(
      {
        erreur: "Erreur interne /api/avis.",
        detail: String(erreur?.message ?? erreur),
      },
      { status: 500 }
    );
  }
}