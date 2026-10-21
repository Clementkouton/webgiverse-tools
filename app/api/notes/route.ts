// app/api/notes/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("outil");
    if (!slug) {
      return NextResponse.json({ erreur: "Slug requis." }, { status: 400 });
    }

    // Le délégué « avis » n'existe que si le client Prisma a été régénéré.
    const avis = (prisma as any).avis;
    if (!avis || typeof avis.aggregate !== "function") {
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
      return NextResponse.json({ moyenne: null, nombre: 0 });
    }

    const agregat = await avis.aggregate({
      where: { outilId: outil.id },
      _avg: { note: true },
      _count: true,
    });

    const nombre = agregat?._count ?? 0;
    const moyenneBrute = agregat?._avg?.note ?? 0;

    return NextResponse.json({
      moyenne: nombre > 0 ? Math.round(moyenneBrute * 10) / 10 : null,
      nombre,
    });
  } catch (erreur: any) {
    // Le VRAI message d'erreur s'affiche désormais dans le terminal
    console.error("[/api/notes] ERREUR COMPLÈTE :", erreur);
    return NextResponse.json(
      {
        erreur: "Erreur interne /api/notes.",
        detail: String(erreur?.message ?? erreur),
      },
      { status: 500 }
    );
  }
}