// scripts/importer-descriptions-youtube.mjs
// ─────────────────────────────────────────────────────────────────
// Lot 31 — IMPORT DES 84 DESCRIPTIONS YOUTUBE RAFFINÉES en base.
//
// REMPLACE le collage géant de migration-descriptions-raffinees.sql
// dans le SQL Editor de Neon (méthode lot 28) : plus fiable, plus
// lisible, rejouable à volonté (idempotent).
//
// Ce que fait le script :
//   1. Lit descriptions-raffinees.json (à la racine du projet) ;
//   2. Pour chaque tutoriel : UPDATE par "youtubeId" de la colonne
//      Tuto."descriptionRaffinee" (via prisma.tuto.updateMany —
//      youtubeId n'étant pas unique dans le schéma, updateMany est
//      la seule écriture valide) ;
//   3. Affiche un rapport clair : importés / introuvables / erreurs,
//      puis le comptage final en base.
//
// AUCUN changement de schéma, AUCUN db push nécessaire.
// Le contenu apparaît ensuite tout seul sous le cadre de notes
// (« Chapitres & ressources ») sur chaque page tutoriel.
//
// LANCEMENT (PowerShell, à la racine du projet) :
//     node scripts/importer-descriptions-youtube.mjs
// (le fichier .env du projet est chargé automatiquement ; si ta
// version de Node est ancienne, lance plutôt :
//     node --env-file=.env scripts/importer-descriptions-youtube.mjs)
// ─────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

// ── 1. Chargement du .env (comme Next.js) ─────────────────────────
const racine = join(dirname(fileURLToPath(
    import.meta.url)), "..");

if (!process.env.DATABASE_URL) {
    for (const fichier of[".env", ".env.local"]) {
        const chemin = join(racine, fichier);
        if (existsSync(chemin)) {
            try {
                process.loadEnvFile(chemin); // Node ≥ 20.12
            } catch {
                // Node plus ancien : contenu lu manuellement
                for (const ligne of readFileSync(chemin, "utf8").split(/\r?\n/)) {
                    const m = ligne.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"?([^"]*)"?\s*$/);
                    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
                }
            }
        }
    }
}

if (!process.env.DATABASE_URL) {
    console.error(
        "\n✖ DATABASE_URL introuvable.\n" +
        "  Lance le script à la racine du projet, ou avec :\n" +
        "  node --env-file=.env scripts/importer-descriptions-youtube.mjs\n",
    );
    process.exit(1);
}

// ── 2. Lecture du JSON de descriptions ────────────────────────────
const cheminJson = join(racine, "descriptions-raffinees.json");
if (!existsSync(cheminJson)) {
    console.error(
        `\n✖ Fichier introuvable : ${cheminJson}\n` +
        "  Place descriptions-raffinees.json (lot 28/31) à la racine du projet.\n",
    );
    process.exit(1);
}

const entrees = JSON.parse(readFileSync(cheminJson, "utf8"));
console.log(`\n── Import des descriptions YouTube raffinées ──────────────`);
console.log(`   ${entrees.length} tutoriels dans descriptions-raffinees.json\n`);

// ── 3. Import ligne par ligne (par youtubeId) ─────────────────────
const prisma = new PrismaClient();

let ok = 0;
let introuvables = 0;
let erreurs = 0;

try {
    for (const [i, entree] of entrees.entries()) {
        const numero = String(i + 1).padStart(2, "0");
        const titre = (entree.titre ?? entree.slug ?? "?").slice(0, 58);
        const raffinee = entree.descriptionRaffinee;

        if (!entree.youtubeId || !raffinee) {
            introuvables++;
            console.log(`   ⚠ ${numero}/${entrees.length}  ${titre} — pas de youtubeId ou pas de description`);
            continue;
        }

        try {
            const resultat = await prisma.tuto.updateMany({
                where: { youtubeId: entree.youtubeId },
                data: { descriptionRaffinee: raffinee },
            });
            if (resultat.count > 0) {
                ok++;
                console.log(`   ✔ ${numero}/${entrees.length}  ${titre}`);
            } else {
                introuvables++;
                console.log(`   ⚠ ${numero}/${entrees.length}  ${titre} — youtubeId ${entree.youtubeId} absent de la table Tuto`);
            }
        } catch (erreur) {
            erreurs++;
            console.log(`   ✖ ${numero}/${entrees.length}  ${titre} — ${erreur?.message ?? erreur}`);
        }
    }
} finally {
    // ── 4. Rapport final + comptage en base ─────────────────────────
    // Comptage en JavaScript (évite les subtilités Prisma des filtres
    // null sur les colonnes Json? : DbNull / JsonNull).
    const avecDescription = await prisma.tuto
        .findMany({ select: { descriptionRaffinee: true } })
        .then((lignes) => lignes.filter((t) => t.descriptionRaffinee != null).length)
        .catch(() => null);

    console.log(`\n───────────────────────────────────────────────────────────`);
    console.log(`   Importés            : ${ok}`);
    console.log(`   Introuvables/vides  : ${introuvables}`);
    console.log(`   Erreurs             : ${erreurs}`);
    if (avecDescription !== null) {
        console.log(`   En base, avec description : ${avecDescription} tutoriel(s)`);
    }
    console.log(`───────────────────────────────────────────────────────────`);

    if (ok > 0 && introuvables === 0 && erreurs === 0) {
        console.log(`\n✔ Terminé ! Ouvre une page tutoriel : « Chapitres & ressources »\n  s'affiche maintenant SOUS le cadre « Mes notes ». (Ctrl+Shift+R\n  dans le navigateur pour vider le cache.)\n`);
    } else if (ok === 0) {
        console.log(`\n✖ Rien n'a été importé. Vérifie que la colonne "descriptionRaffinee"\n  existe bien (npx prisma db push) et que les youtubeId correspondent.\n`);
    }

    await prisma.$disconnect();
}