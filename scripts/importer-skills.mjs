// scripts/importer-skills.mjs
// ─────────────────────────────────────────────────────────────────
// Lot 38 — IMPORT DES 29 SKILLS TRADUITES en base (table "Skill").
//
// PRÉ-REQUIS (dans l'ordre) :
//   1. Coller le modèle Skill (prisma/schema-skills.prisma) à la fin
//      de prisma/schema.prisma
//   2. Exécuter prisma/migration-skills.sql dans le SQL Editor de Neon
//   3. npx prisma generate
//   4. Copier donnees/skills-fr.json À LA RACINE DU PROJET
//
// LANCEMENT (PowerShell, à la racine du projet) :
//     node scripts/importer-skills.mjs
// (le fichier .env du projet est chargé automatiquement ; si ta
// version de Node est ancienne : node --env-file=.env scripts/importer-skills.mjs)
//
// Idempotent : relancer met à jour les skills existantes (upsert par
// slug) au lieu de créer des doublons.
// ─────────────────────────────────────────────────────────────────
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

// ── 1. Chargement du .env (comme Next.js) ─────────────────────────
const racine = join(dirname(fileURLToPath(import.meta.url)), "..");

if (!process.env.DATABASE_URL) {
  for (const fichier of [".env", ".env.local"]) {
    const chemin = join(racine, fichier);
    if (existsSync(chemin)) {
      try {
        process.loadEnvFile(chemin); // Node ≥ 20.12
      } catch {
        // Node plus ancien : lecture manuelle des lignes CLÉ=valeur
        for (const ligne of readFileSync(chemin, "utf-8").split("\n")) {
          const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i.exec(ligne);
          if (m && !process.env[m[1]]) {
            process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
          }
        }
      }
    }
  }
}
if (!process.env.DATABASE_URL) {
  console.error("✗ DATABASE_URL introuvable (.env / .env.local). Lance depuis la racine du projet.");
  process.exit(1);
}

// ── 2. Lecture du JSON ────────────────────────────────────────────
const candidats = [join(racine, "skills-fr.json"), join(racine, "donnees", "skills-fr.json")];
const cheminJson = candidats.find((c) => existsSync(c));
if (!cheminJson) {
  console.error("✗ skills-fr.json introuvable : copie-le à la racine du projet (ou dans donnees/).");
  process.exit(1);
}
const { skills, total } = JSON.parse(readFileSync(cheminJson, "utf-8"));
console.log(`Import de ${skills.length} skills (attendu: ${total})…`);

// ── 3. Upsert par slug ────────────────────────────────────────────
const prisma = new PrismaClient();
let crees = 0;
let maj = 0;
let echecs = 0;

for (const s of skills) {
  const donnees = {
    slug: s.slug,
    titre: s.titre,
    description: s.description,
    categorie: s.categorie || "Autres",
    tags: Array.isArray(s.tags) ? s.tags.slice(0, 12) : [],
    auteur: s.auteur || "",
    popularite: Math.trunc(s.popularite) || 0,
    featured: Boolean(s.featured),
    image: s.image || "",
    imageAlt: s.imageAlt || "",
    lienSource: s.lienSource,
    depotUrl: s.depotUrl || null,
    demarrage: s.demarrage || null,
    articleTitre: s.articleTitre || "",
    article: Array.isArray(s.article) ? s.article : undefined,
    ordre: Math.trunc(s.ordre) || 0,
    ...(s.majLe ? { majLe: new Date(s.majLe) } : {}),
  };
  try {
    const avant = await prisma.skill.findUnique({ where: { slug: s.slug }, select: { id: true } });
    await prisma.skill.upsert({
      where: { slug: s.slug },
      update: donnees,
      create: donnees,
    });
    if (avant) maj++;
    else crees++;
  } catch (e) {
    echecs++;
    console.error(`  ✗ ${s.slug}: ${e.message.slice(0, 120)}`);
  }
}

// ── 4. Rapport ────────────────────────────────────────────────────
const final = await prisma.skill.count();
console.log("\n═══════════════════════════════════");
console.log(`Créées : ${crees}`);
console.log(`Mises à jour : ${maj}`);
console.log(`Échecs : ${echecs}`);
console.log(`Total "Skill" en base : ${final}`);
console.log("═══════════════════════════════════");
console.log(final > 0
  ? "✓ Import terminé. Lance `npm run dev`, ouvre /skills et connecte-toi avec un compte Premium."
  : "⚠ Aucune skill en base : vérifie l'étape 2 (table créée ?) et les erreurs ci-dessus.");
await prisma.$disconnect();
