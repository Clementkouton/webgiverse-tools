// app/api/listes/qr/route.ts
// Lot 55 — idée 18 : QR code du lien public d'une liste, généré côté
// serveur (lib qrcode) et renvoyé en data URL. Réservé au propriétaire
// d'une liste effectivement partagée.


import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const listeId = searchParams.get("listeId");
  if (!listeId) {
    return NextResponse.json({ erreur: "Liste requise." }, { status: 400 });
  }

  const liste = await prisma.list.findUnique({
    where: { id: listeId },
    select: { userId: true, estPublique: true, slug: true },
  });
  if (!liste || liste.userId !== session.user.id) {
    return NextResponse.json({ erreur: "Liste introuvable." }, { status: 404 });
  }

  if (!liste.estPublique || !liste.slug) {
    return NextResponse.json(
      { erreur: "Cette liste n'est pas partagée publiquement." },
      { status: 400 }
    );
  }

  const origine = new URL(req.url).origin;
  const lien = `${origine}/listes/${liste.slug}`;

  const qrDataUrl = await QRCode.toDataURL(lien, {
    width: 512,
    margin: 2,
    color: { dark: "#1f2937", light: "#ffffff" },
  });

  return NextResponse.json({ ok: true, qrDataUrl, lien });
} 