import { NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { autoriserRequete, ipClient } from "@/lib/limitation-debit"; // Lot 82

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

    // ── Lot 82 — Anti devinette de jetons ────────────────────────
    // Les jetons sont des aléas de 32 octets : impossible à deviner.
    // La limite protège surtout la base contre le martèlement.
    const ip = ipClient(req.headers);
    if (!autoriserRequete(`reinit-ip:${ip}`, 15, 15 * 60_000)) {
      return NextResponse.json(
        { erreur: "Trop de tentatives. Réessaie dans quelques minutes." },
        { status: 429 },
      );
    }

    // Lot 83 — le jeton reçu est hashé SHA-256 AVANT comparaison : la
    // base ne stocke que des empreintes (voir mot-de-passe-oublie).
    const tokenHash = createHash("sha256").update(String(token)).digest("hex");
    const verification = await prisma.verificationToken.findFirst({
      where: { token: tokenHash, identifier: courriel },
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