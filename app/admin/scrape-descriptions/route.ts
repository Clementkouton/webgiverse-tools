// app/api/admin/scrape-descriptions/route.ts
// ─────────────────────────────────────────────────────────────────
// Lot 28 — Récupération des descriptions YouTube des tutoriels.
// POST /api/admin/scrape-descriptions, réservé aux admins :
//   • prend 10 tutoriels par lancement (youtubeId présent, aucune
//     description raffinée en base encore) ;
//   • pour chaque tuto : récupère la description BRUTE (page watch,
//     puis API interne InnerTube en repli — voir lib/description-
//     youtube.ts), la RAFFINE (chapitres / ressources / paragraphes,
//     sans hashtags ni appels à l'abonnement) et l'enregistre dans
//     la colonne Tuto.descriptionRaffinee ;
//   • séquentiel avec budget temps (~50 s) : YouTube tolère mal le
//     parallélisme et Vercel limite la durée des fonctions ;
//   • s'arrête proprement au budget (interrompu = relancer).
// ⚠ YouTube bloque parfois les IP de serveurs (HTTP 429 ou mur
//   LOGIN_REQUIRED). Dans ce cas : echecs > 0 — les tutoriels en
//   échec restent « sans description » et seront retentés au
//   prochain clic, ou remplis depuis le PC avec :
//     npx tsx scripts/recuperer-descriptions-youtube.ts
// ─────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tracerConsultation } from "@/lib/journal-admin";
import {
  recupererDescriptionBrute,
  raffinerDescriptionYouTube,
} from "@/lib/description-youtube";

export const maxDuration = 60; // Vercel — temps laissé à la récupération

const PAR_LANCEMENT = 10;
const BUDGET_TOTAL_MS = 50_000;

export async function POST() {
  // ── Accès réservé aux admins ─────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
  }
  const moi = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (moi?.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  const debut = Date.now();

  // Priorité : tutoriels qui ont une vidéo mais jamais traités.
  let tutos;
  try {
    tutos = await prisma.tuto.findMany({
      where: { youtubeId: { not: null }, descriptionRaffinee: { equals: Prisma.AnyNull } },
      orderBy: { ordre: "asc" },
      select: { id: true, titre: true, youtubeId: true },
      take: PAR_LANCEMENT,
    });
  } catch {
    // Colonne absente (db push pas encore lancé) → réponse claire
    return NextResponse.json(
      {
        erreur:
          "Colonne descriptionRaffinee absente : lance « npx prisma db push » puis recharge.",
      },
      { status: 503 },
    );
  }

  if (tutos.length === 0) {
    return NextResponse.json({
      traites: 0,
      avecRessources: 0,
      echecs: 0,
      restants: 0,
      interrompu: false,
    });
  }

  let traites = 0;
  let avecRessources = 0;
  let echecs = 0;
  let interrompu = false;

  for (const tuto of tutos) {
    if (Date.now() - debut > BUDGET_TOTAL_MS) {
      interrompu = true;
      break;
    }
    if (!tuto.youtubeId) continue;
    const brute = await recupererDescriptionBrute(tuto.youtubeId);
    if (!brute) {
      // YouTube a bloqué la requête (429 / LOGIN_REQUIRED) ou vidéo
      // introuvable : on N'ENREGISTRE RIEN → le tuto sera retenté.
      echecs += 1;
      continue;
    }
    const raffinee = raffinerDescriptionYouTube(brute);
    try {
      await prisma.tuto.update({
        where: { id: tuto.id },
        data: { descriptionRaffinee: raffinee },
      });
      traites += 1;
      if (raffinee.ressources.length > 0 || raffinee.chapitres.length > 0) avecRessources += 1;
    } catch {
      echecs += 1;
    }
  }

  let restants = 0;
  try {
    restants = await prisma.tuto.count({
      where: { youtubeId: { not: null }, descriptionRaffinee: { equals: Prisma.AnyNull } },
    });
  } catch {
    restants = 0;
  }

  try {
    await tracerConsultation(
      "DESCRIPTIONS_YOUTUBE",
      `${traites} description(s) raffinée(s), ${echecs} échec(s)${interrompu ? " (interrompu, à relancer)" : ""}`,
    );
  } catch {
    /* le journal ne bloque jamais */
  }
  revalidatePath("/admin");
  revalidatePath("/tutoriels");

  return NextResponse.json({ traites, avecRessources, echecs, restants, interrompu });
}
