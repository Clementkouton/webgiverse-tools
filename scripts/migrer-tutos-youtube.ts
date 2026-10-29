// scripts/migrer-tutos-youtube.ts
// Lot 12 correctif — insère les VRAIES vidéos YouTube dans la table Tuto :
// ID YouTube, titre réel de la vidéo, durée réelle, nombre de vues réel.
// Les données viennent de tutos-youtube.json (84 tutoriels récupérés
// directement depuis YouTube — ID, titre, durée, vues, chaîne).
//
// IDEMPOTENT : appariement par slug (calculé depuis le titre du seed,
// même fonction que seed-tutos.ts) → relançable sans créer de doublons.
//
// Lancement (après « npx prisma db push » et le seed initial) :
//   npx tsx scripts/migrer-tutos-youtube.ts scripts/tutos-youtube.json

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { slugifierTuto } from "../lib/tutos-utils";

// Le client généré peut ne pas encore inclure le modèle Tuto.
const prisma = new PrismaClient() as any;

type Ligne = {
  titre: string; // titre du seed (sert au calcul du slug) — OBLIGATOIRE
  titreReel?: string; // titre réel actuel de la vidéo YouTube
  youtubeId?: string | null; // ID de la vidéo (11 caractères)
  minutes?: number | null; // durée réelle arrondie en minutes
  vues?: number | null; // nombre de vues réel au moment du scraping
  chaine?: string | null; // chaîne YouTube (information, non stockée)
};

async function main() {
  const chemin = process.argv[2] ?? "tutos-youtube.json";
  let liste: Ligne[];
  try {
    const brut: unknown = JSON.parse(readFileSync(chemin, "utf8"));
    // Accepte un tableau [{titre, youtubeId…}] ou un objet { "titre": {…} }.
    liste = Array.isArray(brut)
      ? (brut as Ligne[])
      : Object.entries(brut as Record<string, Omit<Ligne, "titre">>).map(([titre, v]) => ({
          titre,
          ...v,
        }));
  } catch {
    console.error(`✖ Impossible de lire « ${chemin} ». Place le fichier à la racine du projet ou passe son chemin en argument.`);
    process.exit(1);
  }

  let maj = 0;
  let introuvables = 0;
  for (const l of liste) {
    if (!l?.youtubeId) continue; // ligne sans vidéo : on ne touche pas à la base
    const slug = slugifierTuto(l.titre);
    const existe = await prisma.tuto.findUnique({ where: { slug }, select: { id: true } });
    if (!existe) {
      console.warn(`⚠ Introuvable en base (slug « ${slug} ») — lance d'abord scripts/seed-tutos.ts.`);
      introuvables++;
      continue;
    }
    await prisma.tuto.update({
      where: { slug },
      data: {
        youtubeId: l.youtubeId,
        // Le titre réel YouTube remplace celui du seed : ce sont les vraies
        // informations de la vidéo jouée (les slugs/URLs restent inchangés).
        ...(l.titreReel ? { titre: l.titreReel } : {}),
        ...(l.minutes ? { dureeMin: l.minutes } : {}),
        ...(l.vues ? { vues: l.vues } : {}),
        verifieLe: new Date(),
      },
    });
    maj++;
  }

  const total = await prisma.tuto.count();
  const avecVideo = await prisma.tuto.count({ where: { youtubeId: { not: null } } });
  console.log(`✔ ${maj} tutoriels enrichis avec leur vraie vidéo YouTube.`);
  if (introuvables) console.warn(`⚠ ${introuvables} slugs introuvables en base.`);
  console.log(`Base : ${total} tutoriels, dont ${avecVideo} prêts à être lus sur le site.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());