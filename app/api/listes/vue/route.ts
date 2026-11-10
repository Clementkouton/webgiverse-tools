// app/api/listes/vue/route.ts
// Lot 55 — idée 14 : compteur de vues des listes partagées.
// Incrémenté depuis la page publique, avec dédoublonnage :
//   • 1 signal max par session navigateur (sessionStorage côté client) ;
//   • 1 max par mois et par navigateur (cookie posé ici) ;
//   • les vues du propriétaire ne comptent pas.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { listeId } = await req.json();
  if (!listeId) {
    return NextResponse.json({ erreur: "Liste requise." }, { status: 400 });
  }

  const liste = await prisma.list.findFirst({
    where: { id: String(listeId), estPublique: true },
    select: { id: true, userId: true },
  });
  if (!liste) {
    return NextResponse.json({ erreur: "Liste introuvable." }, { status: 404 });
  }

  // Les vues du propriétaire ne comptent pas.
  const session = await auth();
  if (session?.user?.id && session.user.id === liste.userId) {
    return NextResponse.json({ ok: true, ignore: true });
  }

  const nomCookie = `wg_vue_liste_${liste.id}`;
  const dejaVue = (req.headers.get("cookie") ?? "")
    .split(";")
    .some((c) => c.trim().startsWith(`${nomCookie}=`));

  const res = NextResponse.json({ ok: true });

  if (!dejaVue) {
    const updateData: any = { vues: { increment: 1 } };
    await prisma.list.update({
      where: { id: liste.id },
      data: updateData,
    });
    res.cookies.set(nomCookie, "1", {
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      sameSite: "lax",
      path: "/",
    });
  }

  return res;
}