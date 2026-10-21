import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { token, email, motDePasse } = await req.json();

    const courriel = String(email ?? "").trim().toLowerCase();
    const mdp = String(motDePasse ?? "");

    if (!token || !courriel || mdp.length < 8) {
      return NextResponse.json(
        {
          erreur:
            "Lien invalide ou mot de passe trop court (8 caractères minimum).",
        },
        { status: 400 }
      );
    }

    const verification = await prisma.verificationToken.findFirst({
      where: { token: String(token), identifier: courriel },
    });

    if (!verification || verification.expires < new Date()) {
      return NextResponse.json(
        {
          erreur:
            "Ce lien a expiré ou est invalide. Refaites une demande de réinitialisation.",
        },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(mdp, 10);

    await prisma.user.update({
      where: { email: courriel },
      data: { motDePasse: hash },
    });

    // Nettoyer tous les tokens de réinitialisation de ce compte
    await prisma.verificationToken.deleteMany({
      where: { identifier: courriel },
    });

    return NextResponse.json({ ok: true });
  } catch (erreur) {
    console.error("RÉINITIALISATION :", erreur);
    return NextResponse.json(
      { erreur: "Erreur serveur. Réessayez." },
      { status: 500 }
    );
  }
}