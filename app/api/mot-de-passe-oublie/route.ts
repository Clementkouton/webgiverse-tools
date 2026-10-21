import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const courriel = String(email ?? "").trim().toLowerCase();

    if (!courriel) {
      return NextResponse.json({ erreur: "Email requis." }, { status: 400 });
    }

    const utilisateur = await prisma.user.findUnique({
      where: { email: courriel },
    });

    if (!utilisateur) {
      // On ne révèle pas si le compte existe (sécurité)
      return NextResponse.json({ ok: true });
    }

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    await prisma.verificationToken.create({
      data: { identifier: courriel, token, expires },
    });

    const lien = `/reinitialiser?token=${token}&email=${encodeURIComponent(
      courriel
    )}`;

    // En développement : on renvoie le lien directement (pas encore de service email).
    // En production, ce lien serait envoyé par email.
    return NextResponse.json({ ok: true, lien, dev: true });
  } catch (erreur) {
    console.error("MOT DE PASSE OUBLIÉ :", erreur);
    return NextResponse.json(
      { erreur: "Erreur serveur. Réessayez." },
      { status: 500 }
    );
  }
}