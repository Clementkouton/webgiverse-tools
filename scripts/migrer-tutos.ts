// scripts/migrer-tutos.ts
// Lot 12 — complète la base avec les IDs YouTube et miniatures extraits de
// la page Aixploria à l'aide du script console scripts/extraire-aixploria.js.
//
// Utilisation :
//   1. Sur la page Aixploria des tutoriels, exécute scripts/extraire-aixploria.js
//      dans la console du navigateur (F12 → Console) → télécharge tutos-aixploria.json
//   2. Place le fichier à la racine du projet puis lance :
//        npx tsx scripts/migrer-tutos.ts tutos-aixploria.json
//
// Le script APPARIE par titre : un tuto déjà en base (importé par seed-tutos.ts)
// reçoit son ID YouTube et sa miniature ; un tuto inconnu est CRÉÉ (les ~219
// tutoriels supplémentaires du bouton « Voir plus » viendront donc compléter
// automatiquement la collection). Idempotent : relançable sans doublons.

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { slugifierTuto } from "../lib/tutos-utils";

const prisma = new PrismaClient() as PrismaClient & { tuto: any };

type NiveauTuto = "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE";

type TutoExtrait = {
  titre?: string;
  duree?: string; // "32 min", "1h34", "94"…
  minutes?: number; // déjà converti (optionnel)
  niveau?: string; // "Beginner" | "Intermediate" | "Advanced" | "Débutant"…
  tags?: string[] | string; // ["ChatGPT", "Prompt"] ou "#ChatGPT#Prompt"
  vues?: number;
  youtubeId?: string | null;
  miniature?: string | null;
};

/** "1h34" → 94 ; "32 min" → 32 ; "3" → 3. */
function versMinutes(d?: string): number | null {
  if (!d) return null;
  const propre = d.toLowerCase().replace(/\s/g, "");
  const h = /(\d+)h/.exec(propre);
  const m = /(\d+)min/.exec(propre) ?? /(?:^|[^\d])(\d{1,3})$/.exec(propre);
  if (h) return Number(h[1]) * 60 + (m ? Number(m[1]) : 0);
  if (m) return Number(m[1]);
  return null;
}

function versNiveau(n?: string): NiveauTuto | null {
  const v = (n ?? "").toLowerCase();
  if (/(^|de)butant|beginner/.test(v)) return "DEBUTANT";
  if (/interm|intermediate/.test(v)) return "INTERMEDIAIRE";
  if (/avance|advanced/.test(v)) return "AVANCE";
  return null;
}

function versTags(t?: string[] | string): string[] {
  if (Array.isArray(t)) return t.map((x) => String(x).trim()).filter(Boolean);
  if (typeof t === "string")
    return t
      .split("#")
      .map((x) => x.trim())
      .filter(Boolean);
  return [];
}

/** Nettoie une URL d'image archive (préfixe web.archive.org) vers l'URL d'origine. */
function nettoyageMiniature(u?: string | null): string | null {
  if (!u) return null;
  const m = /https?:\/\/web\.archive\.org\/web\/\d+(?:id_)?\/(https?:\/\/.+)$/.exec(u);
  return m ? m[1] : u;
}

async function main() {
  const chemin = process.argv[2] ?? "tutos-aixploria.json";
  let brut: unknown;
  try {
    brut = JSON.parse(readFileSync(chemin, "utf8"));
  } catch {
    console.error(`✖ Impossible de lire « ${chemin} ». Vérifie le nom du fichier.`);
    process.exit(1);
  }

  const liste: TutoExtrait[] = Array.isArray(brut)
    ? (brut as TutoExtrait[])
    : ((brut as { tutos?: TutoExtrait[] })?.tutos ?? []);
  if (!liste.length) {
    console.error("✖ Aucun tutoriel dans ce fichier JSON.");
    process.exit(1);
  }

  let maj = 0;
  let crees = 0;
  let sansId = 0;

  // Le prochain ordre pour les nouveaux : après le dernier existant.
  const dernier = await prisma.tuto.aggregate({ _max: { ordre: true } });
  let ordreSuivant = (dernier._max.ordre ?? 0) + 1;

  for (const t of liste) {
    const titre = (t.titre ?? "").trim();
    if (!titre) continue;
    const slug = slugifierTuto(titre);

    const minutes = t.minutes ?? versMinutes(t.duree) ?? null;
    const niveau = versNiveau(t.niveau);
    const outils = versTags(t.tags);
    const youtubeId = t.youtubeId?.trim() || null;
    const miniature = nettoyageMiniature(t.miniature);
    if (!youtubeId) sansId++;

    const existe = await prisma.tuto.findUnique({ where: { slug } });
    if (existe) {
      await prisma.tuto.update({
        where: { slug },
        data: {
          // On ne remplace jamais une valeur existante par du vide.
          ...(youtubeId ? { youtubeId } : {}),
          ...(miniature ? { miniature } : {}),
          ...(minutes ? { dureeMin: minutes } : {}),
          ...(niveau ? { niveau } : {}),
          ...(outils.length ? { outils } : {}),
          ...(t.vues ? { vues: t.vues } : {}),
        },
      });
      maj++;
    } else {
      await prisma.tuto.create({
        data: {
          slug,
          titre,
          youtubeId,
          miniature,
          dureeMin: minutes ?? 0,
          niveau: niveau ?? "DEBUTANT",
          outils,
          vues: t.vues ?? 0,
          ordre: ordreSuivant++,
        },
      });
      crees++;
    }
  }

  const total = await prisma.tuto.count();
  const avecId = await prisma.tuto.count({ where: { youtubeId: { not: null } } });
  console.log(`✔ Terminé : ${maj} mis à jour, ${crees} créés, ${sansId} sans ID YouTube.`);
  console.log(`Base actuelle : ${total} tutoriels, dont ${avecId} avec vidéo prête à lire.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
