// app/api/avis/vote/route.ts
// ─────────────────────────────────────────────────────────────────
// Lot 20 — vote « Utile » sur un avis (bouton 👍 de section-avis.tsx).
//   • POST { avisId } : bascule le vote du membre connecté
//     (1er clic = vote, 2e clic = retrait) et notifie l'auteur de
//     l'avis in-app (modèle Notification, type "VOTE_AVIS").
//   • Répond { ok, monVote, votes } — le front met à jour le bouton.
//
// Lot 84 — DEUX DURCISSEMENTS :
//   1. FIN DE LA FUITE D'INFORMATIONS : « detail » (message d'exception
//      complet) n'est plus renvoyé au navigateur — logs serveur only.
//   2. LIMITE DE DÉBIT : 30 bascules de vote par membre et par minute.
// ─────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";
import { autoriserRequete } from "@/lib/limitation-debit"; // Lot 84

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { erreur: "Connecte-toi pour voter « Utile » sur un avis." },
        { status: 401 }
      );
    }

    // Lot 84 — 30 bascules par membre et par minute maximum.
    if (!autoriserRequete(`vote-avis:${session.user.id}`, 30, 60_000)) {
      return NextResponse.json(
        { erreur: "Trop de votes d'affilée. Réessaie dans une minute." },
        { status: 429 }
      );
    }

    // Délégué défensif : le client Prisma doit connaître VoteAvis.
    const votesAvis = (prisma as any).voteAvis;
    if (!votesAvis || typeof votesAvis.findUnique !== "function") {
      return NextResponse.json(
        {
          erreur:
            "Le client Prisma ne contient pas le modèle VoteAvis. Arrête le serveur (Ctrl+C), puis lance dans l'ordre : npx prisma validate → npx prisma generate → npx prisma db push → npm run dev.",
        },
        { status: 503 }
      );
    }

    const { avisId } = await req.json();
    if (!avisId || typeof avisId !== "string") {
      return NextResponse.json({ erreur: "Avis manquant." }, { status: 400 });
    }

    const avis = await prisma.avis.findUnique({
      where: { id: avisId },
      select: {
        id: true,
        utilisateurId: true,
        outil: { select: { slug: true, nom: true } },
      },
    });
    if (!avis) {
      return NextResponse.json({ erreur: "Avis introuvable." }, { status: 404 });
    }

    // Pas de vote sur son propre avis (le bouton est déjà désactivé côté front).
    if (avis.utilisateurId === session.user.id) {
      return NextResponse.json(
        { erreur: "Tu ne peux pas voter « Utile » sur ton propre avis." },
        { status: 400 }
      );
    }

    // Bascule : vote existant → retrait, sinon création.
    const existant = await votesAvis.findUnique({
      where: { avisId_userId: { avisId: avis.id, userId: session.user.id } },
      select: { id: true },
    });

    if (existant) {
      await votesAvis.delete({ where: { id: existant.id } });
    } else {
      await votesAvis.create({
        data: { avisId: avis.id, userId: session.user.id },
      });

      // Notification in-app pour l'auteur (jamais bloquante).
      try {
        const notifications = (prisma as any).notification;
        if (notifications && typeof notifications.create === "function") {
          const nomVotant = session.user.name?.trim() || "Un membre";
          const nonLuesSimilaires = await notifications.count({
            where: {
              userId: avis.utilisateurId,
              type: "VOTE_AVIS",
              lien: `/outil/${avis.outil.slug}`,
              lue: false,
            },
          });
          // Anti-spam : au-delà de 4 notifications identiques non lues,
          // on n'en crée plus jusqu'à ce que l'auteur les consulte.
          if (nonLuesSimilaires < 4) {
            await notifications.create({
              data: {
                userId: avis.utilisateurId,
                type: "VOTE_AVIS",
                titre: "👍 Ton avis a reçu un vote « Utile »",
                message: `${nomVotant} a trouvé ton avis sur ${avis.outil.nom} utile.`,
                lien: `/outil/${avis.outil.slug}`,
              },
            });
          }
        }
      } catch (e) {
        console.error("[/api/avis/vote] notification (non bloquant) :", e);
      }
    }

    const votes = await votesAvis.count({ where: { avisId: avis.id } });
    const monVote = !existant;

    try {
      await journaliser(
        session.user.id,
        "vote_avis",
        JSON.stringify({ avis: avis.id, outil: avis.outil.slug, vote: monVote })
      );
    } catch (e) {
      console.error("[/api/avis/vote] journaliser a échoué (non bloquant) :", e);
    }

    return NextResponse.json({ ok: true, monVote, votes });
  } catch (erreur: any) {
    console.error("[/api/avis/vote][POST] ERREUR COMPLÈTE :", erreur);
    return NextResponse.json(
      { erreur: "Erreur interne du vote." },
      { status: 500 }
    );
  }
}