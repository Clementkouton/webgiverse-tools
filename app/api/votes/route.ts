// app/api/votes/route.ts
//
// Lot 84 — DEUX DURCISSEMENTS :
//   1. FIN DE LA FUITE D'INFORMATIONS : l'ancienne réponse d'erreur
//      500 renvoyait « detail » avec le message d'exception complet
//      (messages Prisma, noms de tables et de champs…) au navigateur.
//      Le VRAI message reste dans les logs serveur ; le client reçoit
//      un message générique.
//   2. LIMITE DE DÉBIT sur le vote : 30 bascules par membre et par
//      minute — un script ne peut plus marteler la route (chaque vote
//      écrit en base + une ligne de journal).

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";
import { autoriserRequete } from "@/lib/limitation-debit"; // Lot 84

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("outil");
    if (!slug) {
      return NextResponse.json({ erreur: "Slug requis." }, { status: 400 });
    }

    const votes = (prisma as any).vote;
    if (!votes || typeof votes.count !== "function") {
      return NextResponse.json(
        {
          erreur:
            "Le client Prisma ne contient pas le modèle Vote. Arrêtez le serveur (Ctrl+C), puis lancez dans l'ordre : npx prisma validate → npx prisma generate → npx prisma db push → npm run dev.",
        },
        { status: 503 }
      );
    }

    const outil = await prisma.tool.findUnique({ where: { slug } });
    if (!outil) {
      return NextResponse.json({ erreur: "Outil introuvable." }, { status: 404 });
    }

    const session = await auth();
    const nombre = await votes.count({ where: { outilId: outil.id } });

    const vote = session?.user?.id
      ? Boolean(
          await votes.findUnique({
            where: {
              outilId_utilisateurId: {
                outilId: outil.id,
                utilisateurId: session.user.id,
              },
            },
          })
        )
      : false;

    return NextResponse.json({
      connecte: Boolean(session?.user?.id),
      vote,
      nombre,
    });
  } catch (erreur: any) {
    // Le VRAI message d'erreur s'affiche dans le terminal / les logs
    // Vercel — jamais dans la réponse HTTP (Lot 84).
    console.error("[/api/votes][GET] ERREUR COMPLÈTE :", erreur);
    return NextResponse.json(
      { erreur: "Erreur interne /api/votes." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { erreur: "Connectez-vous pour recommander cet outil." },
        { status: 401 }
      );
    }

    // Lot 84 — 30 bascules de vote par membre et par minute maximum.
    if (!autoriserRequete(`vote:${session.user.id}`, 30, 60_000)) {
      return NextResponse.json(
        { erreur: "Trop de votes d'affilée. Réessaie dans une minute." },
        { status: 429 }
      );
    }

    const votes = (prisma as any).vote;
    if (!votes || typeof votes.count !== "function") {
      return NextResponse.json(
        {
          erreur:
            "Le client Prisma ne contient pas le modèle Vote. Arrêtez le serveur (Ctrl+C), puis lancez dans l'ordre : npx prisma validate → npx prisma generate → npx prisma db push → npm run dev.",
        },
        { status: 503 }
      );
    }

    const { outil: slug } = await req.json();
    if (!slug) {
      return NextResponse.json({ erreur: "Slug requis." }, { status: 400 });
    }

    const outil = await prisma.tool.findUnique({ where: { slug } });
    if (!outil) {
      return NextResponse.json({ erreur: "Outil introuvable." }, { status: 404 });
    }

    const existant = await votes.findUnique({
      where: {
        outilId_utilisateurId: {
          outilId: outil.id,
          utilisateurId: session.user.id,
        },
      },
    });

    let vote: boolean;
    if (existant) {
      await votes.delete({ where: { id: existant.id } });
      vote = false;
    } else {
      await votes.create({
        data: { outilId: outil.id, utilisateurId: session.user.id },
      });
      vote = true;
    }

    const nombre = await votes.count({ where: { outilId: outil.id } });

    try {
      await journaliser(
        session.user.id,
        "vote",
        JSON.stringify({ outil: outil.slug, vote })
      );
    } catch (e) {
      // Le journal ne doit jamais faire échouer un vote.
      console.error("[/api/votes][POST] journaliser a échoué (non bloquant) :", e);
    }

    return NextResponse.json({ ok: true, vote, nombre });
  } catch (erreur: any) {
    console.error("[/api/votes][POST] ERREUR COMPLÈTE :", erreur);
    return NextResponse.json(
      { erreur: "Erreur interne /api/votes." },
      { status: 500 }
    );
  }
}