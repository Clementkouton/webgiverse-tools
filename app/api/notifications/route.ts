// app/api/notifications/route.ts
// ─────────────────────────────────────────────────────────────────
// Lot 20 — notifications in-app de la cloche (topbar Metis).
//   • GET  : renvoie { nonLues, items[…] } ; au passage, génère
//     (non bloquant) une notification « NOUVEAU_TUTO » si un tuto
//     récent correspond à un outil favori du membre (max 1 par
//     appel, jamais de doublon grâce au lien).
//   • POST : marque une notification ({ id }) ou toutes
//     ({ toutes: true }) comme lues.
// ─────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Génère (défensivement) une notification « nouveau tuto » pertinente. */
async function genererNouveauTuto(userId: string): Promise<void> {
  try {
    const notifications = (prisma as any).notification;
    if (!notifications || typeof notifications.findFirst !== "function") return;

    // Pas de spam : si une notification de tuto est déjà non lue, on attend.
    const enAttente = await notifications.findFirst({
      where: { userId, type: "NOUVEAU_TUTO", lue: false },
      select: { id: true },
    });
    if (enAttente) return;

    // Outils favoris du membre (noms utilisés pour la correspondance).
    const favoris = await prisma.favorite.findMany({
      where: { userId },
      select: { tool: { select: { nom: true } } },
      take: 50,
    });
    const nomsFavoris = favoris
      .map((f: { tool: { nom: string } }) => f.tool.nom)
      .filter(Boolean);
    if (nomsFavoris.length === 0) return;

    // Tutoriels récents (14 derniers jours, vidéo publiée).
    const depuis = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const tutos = await prisma.tuto.findMany({
      where: { creeLe: { gte: depuis }, youtubeId: { not: null } },
      orderBy: { creeLe: "desc" },
      take: 20,
      select: { slug: true, titre: true, outils: true },
    });
    if (tutos.length === 0) return;

    // Correspondance souple entre outils favoris et tuto.outils.
    const norm = (s: string) => s.toLowerCase().trim();
    const candidats = tutos.filter((t: { outils: string[] }) =>
      (t.outils ?? []).some((o: string) =>
        nomsFavoris.some(
          (n: string) =>
            norm(o).includes(norm(n)) || norm(n).includes(norm(o))
        )
      )
    );
    if (candidats.length === 0) return;

    // Crée au maximum UNE notification par appel, jamais de doublon.
    for (const t of candidats) {
      const lien = `/tutoriels/${t.slug}`;
      const deja = await notifications.findFirst({
        where: { userId, type: "NOUVEAU_TUTO", lien },
        select: { id: true },
      });
      if (!deja) {
        await notifications.create({
          data: {
            userId,
            type: "NOUVEAU_TUTO",
            titre: "🎬 Un nouveau tuto t'attend",
            message: `En lien avec tes outils favoris : « ${t.titre} ».`,
            lien,
          },
        });
        return;
      }
    }
  } catch (e) {
    console.error("[/api/notifications] génération NOUVEAU_TUTO (non bloquant) :", e);
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
    }

    const notifications = (prisma as any).notification;
    if (!notifications || typeof notifications.findMany !== "function") {
      // Table pas encore créée : on répond vide plutôt que de casser la cloche.
      return NextResponse.json({ nonLues: 0, items: [] });
    }

    // Génération défensive d'une notification « nouveau tuto » si pertinent.
    await genererNouveauTuto(session.user.id);

    const [items, nonLues] = await Promise.all([
      notifications.findMany({
        where: { userId: session.user.id },
        orderBy: { creeLe: "desc" },
        take: 20,
      }),
      notifications.count({ where: { userId: session.user.id, lue: false } }),
    ]);

    return NextResponse.json({ nonLues, items });
  } catch (erreur: any) {
    console.error("[/api/notifications][GET] ERREUR COMPLÈTE :", erreur);
    // La cloche ne doit jamais casser le dashboard : on répond vide.
    return NextResponse.json({
      nonLues: 0,
      items: [],
      erreur: String(erreur?.message ?? erreur),
    });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
    }

    const notifications = (prisma as any).notification;
    if (!notifications || typeof notifications.updateMany !== "function") {
      return NextResponse.json({ ok: false }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    if (body?.toutes) {
      await notifications.updateMany({
        where: { userId: session.user.id, lue: false },
        data: { lue: true },
      });
    } else if (typeof body?.id === "string" && body.id) {
      await notifications.updateMany({
        where: { userId: session.user.id, id: body.id },
        data: { lue: true },
      });
    } else {
      return NextResponse.json({ erreur: "Rien à marquer." }, { status: 400 });
    }

    const nonLues = await notifications.count({
      where: { userId: session.user.id, lue: false },
    });
    return NextResponse.json({ ok: true, nonLues });
  } catch (erreur: any) {
    console.error("[/api/notifications][POST] ERREUR COMPLÈTE :", erreur);
    return NextResponse.json(
      { erreur: "Erreur interne des notifications." },
      { status: 500 }
    );
  }
}