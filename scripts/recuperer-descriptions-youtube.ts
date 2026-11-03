// scripts/recuperer-descriptions-youtube.ts
// ─────────────────────────────────────────────────────────────────
// Lot 28 — Récupération LOCALE des descriptions YouTube des tutoriels
// et stockage dans la colonne Tuto.descriptionRaffinee.
//
// À lancer depuis le PC (IP résidentielle, plus fiable que Vercel) :
//   npx tsx scripts/recuperer-descriptions-youtube.ts            (10 tutos sans description)
//   npx tsx scripts/recuperer-descriptions-youtube.ts --limite 30
//   npx tsx scripts/recuperer-descriptions-youtube.ts --force    (refait tout le monde)
//
// Pour chaque tutoriel : description BRUTE (endpoint /next, puis page
// watch, puis InnerTube — voir lib/description-youtube.ts) → RAFFINE
// (chapitres / ressources / paragraphes, sans hashtags ni bavardage)
// → enregistre. Un tutoriel sans contenu exploitable reçoit
// {"vide": true} : il ne sera pas re-scrappé inutilement.
// ─────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  descriptionEstVide,
  recupererDescriptionBrute,
  raffinerDescriptionYouTube,
} from "../lib/description-youtube";

/* ── Chargement minimal de .env (sans dépendance) ────────────────── */
function chargerEnv(): void {
  try {
    const contenu = readFileSync(".env", "utf8");
    for (const ligne of contenu.split("\n")) {
      const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const cle = m[1];
      let valeur = m[2].trim();
      if (
        (valeur.startsWith('"') && valeur.endsWith('"')) ||
        (valeur.startsWith("'") && valeur.endsWith("'"))
      ) {
        valeur = valeur.slice(1, -1);
      }
      if (!(cle in process.env)) process.env[cle] = valeur;
    }
  } catch {
    // pas de .env → on s'appuie sur l'environnement existant
  }
}

async function main(): Promise<void> {
  chargerEnv();
  const force = process.argv.includes("--force");
  const iLimite = process.argv.indexOf("--limite");
  const limite = iLimite >= 0 ? Number(process.argv[iLimite + 1]) || 10 : 10;

  if (!process.env.DATABASE_URL) {
    console.error("✗ DATABASE_URL absent (fichier .env manquant ?)");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  const tutos = await prisma.tuto.findMany({
    where: {
      youtubeId: { not: null },
      ...(force ? {} : { descriptionRaffinee: { equals: Prisma.AnyNull } }),
    },
    orderBy: { ordre: "asc" },
    select: { id: true, titre: true, youtubeId: true },
    take: limite,
  });

  console.log(
    `${tutos.length} tutoriel(s) à traiter${force ? " (mode --force)" : ""}\n`,
  );

  let ok = 0;
  let vides = 0;
  let echecs = 0;

  for (const [index, tuto] of tutos.entries()) {
    const etiquette = `[${index + 1}/${tutos.length}] ${tuto.titre.slice(0, 60)}`;
    try {
      const brute = await recupererDescriptionBrute(tuto.youtubeId as string);
      if (!brute) {
        echecs++;
        console.log(`${etiquette} — ✗ description introuvable (retenté au prochain lancement)`);
        continue;
      }
      const raffinee = raffinerDescriptionYouTube(brute);
      if (descriptionEstVide(raffinee)) {
        await prisma.tuto.update({
          where: { id: tuto.id },
          data: { descriptionRaffinee: { vide: true } as Prisma.InputJsonValue },
        });
        vides++;
        console.log(`${etiquette} — vide (rien d'utile) → {"vide": true}`);
      } else {
        await prisma.tuto.update({
          where: { id: tuto.id },
          data: { descriptionRaffinee: raffinee as unknown as Prisma.InputJsonValue },
        });
        ok++;
        console.log(
          `${etiquette} — ✓ ${raffinee.chapitres.length} chap. / ${raffinee.ressources.length} ress. / ${raffinee.paragraphes.length} §`,
        );
      }
    } catch (erreur) {
      echecs++;
      console.log(`${etiquette} — ✗ ${String(erreur).slice(0, 90)}`);
    }
    // Politesse : YouTube tolère mal les rafales.
    await new Promise((r) => setTimeout(r, 400));
  }

  await prisma.$disconnect();
  console.log(`\n═══ Terminé : ${ok} renseignées / ${vides} vides / ${echecs} échecs.`);
  if (echecs > 0) console.log("Relance la commande pour retenter les échecs.");
}

void main();
