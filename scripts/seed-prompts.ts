// scripts/seed-prompts.ts
// Lot 17 — seed de la bibliothèque de prompts IA en français
// (données lues dans scripts/donnees-prompts.json, générées depuis
// le catalogue scrapé puis traduites). IDEMPOTENT : relançable sans
// créer de doublons (upsert par slug). Les catégories sont créées
// d'abord (upsert par slug), les prompts sont reliés par connect.
//
// Lancement (après « npx prisma db push ») :
//   npx tsx scripts/seed-prompts.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient, TypePrompt } from "@prisma/client";

const prisma = new PrismaClient();

// Client Prisma tolérant à un generate pas encore relancé :
// on garde un typage minimal pour upsert/count.
const promptCategorie = (prisma as unknown as {
  promptCategorie: {
    upsert: (args: unknown) => Promise<{ id: string }>;
    count: () => Promise<number>;
  };
}).promptCategorie;
const prompt = (prisma as unknown as {
  prompt: {
    upsert: (args: unknown) => Promise<unknown>;
    count: () => Promise<number>;
  };
}).prompt;

type DonneePrompt = {
  slug: string;
  titre: string;
  emoji: string;
  description: string;
  contenu: string;
  type: "TEXTE" | "IMAGE" | "CODE";
  modeles: string[];
  categorieSlug: string;
  sousCategorie: string;
  roles: string[];
  conseils: string;
  utilisation: string;
  vues: number;
  ordre: number;
  nouveau: boolean;
};

type Donnees = {
  categories: { slug: string; nom: string; ordre: number }[];
  prompts: DonneePrompt[];
};

async function main() {
  const chemin = join(__dirname, "donnees-prompts.json");
  const donnees: Donnees = JSON.parse(readFileSync(chemin, "utf8"));

  // ── 1. Catégories ─────────────────────────────────────────────────
  for (const c of donnees.categories) {
    await promptCategorie.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, nom: c.nom, ordre: c.ordre },
      update: { nom: c.nom, ordre: c.ordre },
    });
  }
  console.log(`catégories : ${donnees.categories.length} traitées`);

  // ── 2. Prompts ────────────────────────────────────────────────────
  let i = 0;
  for (const p of donnees.prompts) {
    const contenu = p.contenu.trim();
    if (contenu.length < 200) {
      console.warn(`  !! prompt ignoré (contenu trop court) : ${p.slug}`);
      continue;
    }
    await prompt.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        titre: p.titre,
        emoji: p.emoji || "✨",
        description: p.description,
        contenu,
        type: p.type as TypePrompt,
        modeles: p.modeles,
        sousCategorie: p.sousCategorie,
        roles: p.roles,
        conseils: p.conseils,
        utilisation: p.utilisation,
        vues: p.vues,
        ordre: p.ordre,
        nouveau: p.nouveau,
        categorie: { connect: { slug: p.categorieSlug } },
      },
      update: {
        titre: p.titre,
        emoji: p.emoji || "✨",
        description: p.description,
        contenu,
        type: p.type as TypePrompt,
        modeles: p.modeles,
        sousCategorie: p.sousCategorie,
        roles: p.roles,
        conseils: p.conseils,
        utilisation: p.utilisation,
        vues: p.vues,
        ordre: p.ordre,
        nouveau: p.nouveau,
        categorie: { connect: { slug: p.categorieSlug } },
      },
    });
    i++;
    if (i % 25 === 0) console.log(`  … ${i}/${donnees.prompts.length} prompts`);
  }

  const totalPrompts = await prompt.count();
  const totalCategories = await promptCategorie.count();
  console.log(`✅ Seed prompts terminé : ${totalPrompts} prompts dans ${totalCategories} catégories.`);
}

main()
  .catch((e) => {
    console.error("Échec du seed prompts :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
