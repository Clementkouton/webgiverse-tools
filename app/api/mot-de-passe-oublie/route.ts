import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { envoyerEmail, emailMotDePasseOublie } from "@/lib/email";
import { autoriserRequete, ipClient } from "@/lib/limitation-debit"; // Lot 82

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const courriel = String(email ?? "").trim().toLowerCase();

    if (!courriel) {
      return NextResponse.json({ erreur: "Email requis." }, { status: 400 });
    }

    // ── Lot 82 — Anti bombardement d'e-mails ─────────────────────
    // 3 demandes par adresse et par heure, 10 par IP : sinon un script
    // (ou un plaisantin) pouvait noyer n'importe quelle boîte — y
    // compris la vôtre via des milliers de demandes.
    const ip = ipClient(req.headers);
    if (
      !autoriserRequete(`mdp-oublie:${courriel}`, 3, 60 * 60_000) ||
      !autoriserRequete(`mdp-oublie-ip:${ip}`, 10, 60 * 60_000)
    ) {
      return NextResponse.json(
        { erreur: "Trop de demandes de réinitialisation. Réessaie dans une heure." },
        { status: 429 },
      );
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

    // Lien ABSOLU : fonctionne en local comme en production
    const base = (
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    ).replace(/\/+$/, ""); // supprime le(s) / final(aux) s'il(s) existe(nt)
    const lien = `${base}/reinitialiser?token=${token}&email=${encodeURIComponent(
      courriel
    )}`;

    // Envoi du véritable email de réinitialisation
    const envoye = await envoyerEmail({
      a: courriel,
      sujet: "Réinitialisation de votre mot de passe – Webgiverse",
      html: emailMotDePasseOublie(lien),
    });

    // Filet de sécurité : UNIQUEMENT en développement local, si l'email
    // n'a pas pu partir (Gmail non configuré), on affiche le lien à l'écran
    // pour pouvoir tester quand même. En production : jamais.
    if (!envoye && process.env.NODE_ENV !== "production") {
      return NextResponse.json({ ok: true, lien, dev: true });
    }

    return NextResponse.json({ ok: true });
  } catch (erreur) {
    console.error("MOT DE PASSE OUBLIÉ :", erreur);
    return NextResponse.json(
      { erreur: "Erreur serveur. Réessayez." },
      { status: 500 }
    );
  }
}