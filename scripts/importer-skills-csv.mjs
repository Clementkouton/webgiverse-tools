// scripts/importer-skills-csv.mjs
// ─────────────────────────────────────────────────────────────────
// Lot 40 — IMPORT DES SKILLS DEPUIS UN FICHIER CSV (table "Skill").
//
// Les skills importées obtiennent EXACTEMENT le même rendu que les
// 29 skills scrapées du lot 38 : le script construit le champ JSONB
// « article » ([{titre, paragraphes[], images[{src, alt}]}]) à partir
// d'une syntaxe simple dans la colonne « sections » :
//
//     ## Titre de la section        → ouvre une nouvelle section
//     Une ligne                     → un paragraphe (1 ligne = 1 paro.)
//     Une autre ligne               → un autre paragraphe
//     ![alt de l'image](https://…)  → une image affichée en <img>
//     • une puce en début de ligne  → rendue comme une puce
//
// PRÉ-REQUIS (déjà faits avec le lot 38 — rien de nouveau) :
//   · table Skill créée + modèle collé dans prisma/schema.prisma
//   · npx prisma generate déjà lancé au moins une fois
//
// LANCEMENT (PowerShell, à la racine du projet) :
//     node scripts/importer-skills-csv.mjs donnees/modele-skills.csv
//     node scripts/importer-skills-csv.mjs mon-import.csv
//     node scripts/importer-skills-csv.mjs mon-import.csv --apercu
//         (--apercu : vérifie le CSV et affiche le résultat SANS
//          toucher à la base — idéal avant un vrai import)
//
// Séparateur « ; » ou « , » détecté automatiquement.
// Idempotent : relancer met à jour les skills existantes (upsert par
// slug) au lieu de créer des doublons. Le compteur de vues est
// conservé lors des mises à jour.
// ─────────────────────────────────────────────────────────────────
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const APERCU = process.argv.includes("--apercu");

// ── 1. Chargement du .env (comme Next.js) ─────────────────────────
const racine = join(dirname(fileURLToPath(import.meta.url)), "..");

if (!APERCU && !process.env.DATABASE_URL) {
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
if (!APERCU && !process.env.DATABASE_URL) {
  console.error("✗ DATABASE_URL introuvable (.env / .env.local). Lance depuis la racine du projet.");
  process.exit(1);
}

// ── 2. Fichier CSV à lire ─────────────────────────────────────────
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const cheminCsv = args[0]
  ? join(racine, args[0])
  : join(racine, "donnees", "modele-skills.csv");
if (!existsSync(cheminCsv)) {
  console.error(`✗ Fichier introuvable : ${args[0] ?? "donnees/modele-skills.csv"}`);
  process.exit(1);
}
const brut = readFileSync(cheminCsv, "utf-8").replace(/^\uFEFF/, ""); // retire le BOM

// ── 3. Parseur CSV (guillemets, "" échappés, retours à la ligne) ──
function detecterSeparateur(entete) {
  const pv = (entete.match(/;/g) || []).length;
  const vg = (entete.match(/,/g) || []).length;
  return pv >= vg ? ";" : ",";
}

function analyserCsv(texte, separateur) {
  const lignes = [];
  let champ = "";
  let ligne = [];
  let entreGuillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (entreGuillemets) {
      if (c === '"') {
        if (texte[i + 1] === '"') { champ += '"'; i++; } // "" → "
        else entreGuillemets = false;
      } else champ += c;
    } else if (c === '"') entreGuillemets = true;
    else if (c === separateur) { ligne.push(champ); champ = ""; }
    else if (c === "\n") { ligne.push(champ); champ = ""; lignes.push(ligne); ligne = []; }
    else if (c === "\r") { /* ignoré (fins de ligne Windows) */ }
    else champ += c;
  }
  if (champ.length > 0 || ligne.length > 0) { ligne.push(champ); lignes.push(ligne); }
  return lignes;
}

// ── 4. Aides ──────────────────────────────────────────────────────
function slugifier(texte) {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function versBooleen(valeur, defaut = false) {
  const v = (valeur ?? "").trim().toLowerCase();
  if (!v) return defaut;
  return ["oui", "vrai", "true", "1", "x", "yes", "y"].includes(v);
}

function versEntier(valeur, defaut = 0) {
  const n = parseInt((valeur ?? "").trim(), 10);
  return Number.isFinite(n) ? n : defaut;
}

/** Colonne « sections » → article JSONB identique aux 29 skills scrapées. */
function parserSections(texte) {
  const article = [];
  let section = null;
  for (const brut of (texte ?? "").split("\n")) {
    const ligne = brut.trim();
    if (!ligne) continue; // lignes vides ignorées
    if (ligne.startsWith("##")) {
      // "## Titre" ou "##" (première section sans titre, comme les scrapées)
      section = { titre: ligne.replace(/^##+\s*/, "").trim(), paragraphes: [], images: [] };
      article.push(section);
      continue;
    }
    const image = /^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/.exec(ligne);
    if (image) {
      if (!section) { section = { titre: "", paragraphes: [], images: [] }; article.push(section); }
      section.images.push({ src: image[2], alt: image[1].trim() });
      continue;
    }
    if (!section) { section = { titre: "", paragraphes: [], images: [] }; article.push(section); }
    section.paragraphes.push(ligne);
  }
  return article;
}

// ── 5. Lecture + validation ───────────────────────────────────────
const separateur = detecterSeparateur(brut.split("\n")[0] || "");
const lignes = analyserCsv(brut, separateur);
if (lignes.length < 2) {
  console.error("✗ Le CSV ne contient aucune ligne de données (en-tête seul).");
  process.exit(1);
}

const entetes = lignes[0].map((e) => e.trim().toLowerCase().replace(/\s+/g, "_"));
if (!entetes.includes("titre") || !entetes.includes("sections")) {
  console.error('✗ Colonnes obligatoires absentes : il faut au moins "titre" et "sections".');
  console.error(`  En-têtes trouvés : ${entetes.join(" | ")}`);
  process.exit(1);
}

const COLONNES_CONNUES = [
  "titre", "slug", "categorie", "tags", "auteur", "popularite", "featured",
  "image", "image_alt", "lien_source", "depot_url", "demarrage",
  "article_titre", "sections", "ordre",
];
const inconnues = entetes.filter((e) => e && !COLONNES_CONNUES.includes(e));
if (inconnues.length) {
  console.warn(`⚠ Colonnes ignorées (inconnues) : ${inconnues.join(", ")}`);
}

/** Construit les données Prisma d'une ligne (lève une erreur lisible). */
function versDonneesSkill(ligne, numero) {
  const c = {};
  entetes.forEach((h, i) => { c[h] = (ligne[i] ?? "").trim(); });

  if (!c.titre) throw new Error(`ligne donnée n°${numero} : "titre" manquant`);
  const slug = slugifier(c.slug || c.titre);
  if (!slug) throw new Error(`ligne donnée n°${numero} : slug impossible à construire`);

  const article = parserSections(c.sections);
  const nbParagraphes = article.reduce((n, s) => n + s.paragraphes.length, 0);
  const nbImages = article.reduce((n, s) => n + s.images.length, 0);
  if (nbParagraphes + nbImages === 0) {
    throw new Error(`ligne donnée n°${numero} : "sections" vide (au moins un paragraphe ou une image)`);
  }

  const tags = (c.tags || "")
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);

  return {
    slug,
    titre: c.titre,
    description:
      c.description || // si tu ajoutes une colonne description un jour
      (article.flatMap((s) => s.paragraphes).find((p) => !p.startsWith("•")) || c.titre).slice(0, 220),
    categorie: c.categorie || "Autres",
    tags,
    auteur: c.auteur || "",
    popularite: versEntier(c.popularite, 0),
    featured: versBooleen(c.featured, false),
    image: c.image || "",
    imageAlt: c.image_alt || c.titre,
    lienSource: c.lien_source || `https://openagentskills.dev/skills/${slug}`,
    depotUrl: c.depot_url || null,
    demarrage: c.demarrage || null,
    articleTitre: c.article_titre || "",
    article: article.length ? article : undefined,
    ordre: versEntier(c.ordre, 0),
    _stats: { sections: article.length, paragraphes: nbParagraphes, images: nbImages },
  };
}

// ── 6. Aperçu (sans base de données) ou import réel ───────────────
const donnees = [];
let erreurs = 0;
for (let i = 1; i < lignes.length; i++) {
  if (lignes[i].every((c) => !c || !c.trim())) continue; // ligne vide
  try {
    donnees.push(versDonneesSkill(lignes[i], i));
  } catch (e) {
    erreurs++;
    console.error(`✗ ${e.message}`);
  }
}
if (erreurs) {
  console.error(`\n${erreurs} ligne(s) en erreur : corrige le CSV puis relance. Rien n'a été importé.`);
  process.exit(2);
}

console.log(`\nRésumé du CSV — ${donnees.length} skill(s) valide(s), séparateur « ${separateur} »`);
for (const d of donnees) {
  console.log(
    `  · ${d.titre}\n    slug=${d.slug} | catégorie=${d.categorie} | tags=[${d.tags.join(", ")}] | ` +
    `${d._stats.sections} section(s), ${d._stats.paragraphes} paragraphe(s), ${d._stats.images} image(s) | ` +
    `couverture=${d.image ? "oui" : "non"} | à la une=${d.featured ? "oui" : "non"}`,
  );
}

if (APERCU) {
  console.log("\n✓ Aperçu terminé (--apercu) : rien n'a été écrit en base.");
  process.exit(0);
}

// ── 7. Upsert par slug (idempotent, vues conservées) ──────────────
const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
let crees = 0;
let maj = 0;

for (const d of donnees) {
  const { _stats, ...champs } = d;
  try {
    const avant = await prisma.skill.findUnique({ where: { slug: d.slug }, select: { id: true } });
    await prisma.skill.upsert({
      where: { slug: d.slug },
      update: champs, // sans « vues » → le compteur est conservé
      create: champs,
    });
    if (avant) maj++;
    else crees++;
    console.log(`${avant ? "♻ Mise à jour" : "✓ Créée"} : ${d.titre} (/skills/${d.slug})`);
  } catch (e) {
    erreurs++;
    console.error(`✗ ${d.slug} : ${e.message.slice(0, 140)}`);
  }
}

// ── 8. Rapport ────────────────────────────────────────────────────
const final = await prisma.skill.count();
console.log("\n═══════════════════════════════════");
console.log(`Créées : ${crees}`);
console.log(`Mises à jour : ${maj}`);
console.log(`Échecs : ${erreurs}`);
console.log(`Total "Skill" en base : ${final}`);
console.log("═══════════════════════════════════");
console.log(
  final > 0
    ? "✓ Import terminé. Relance `npm run dev`, ouvre /skills (compte Premium) : le rendu est identique aux 29 skills scrapées."
    : "⚠ Aucune skill en base : vérifie la migration (lot 38) et les erreurs ci-dessus.",
);
await prisma.$disconnect();
