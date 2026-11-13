// scripts/booster-metriques.mjs
// ─────────────────────────────────────────────────────────────────
// LOT 85 — BOOST DE DÉMONSTRATION des compteurs avant la mise en
// production du site. À lancer en LOCAL, une seule fois, contre la
// base de production (Neon) : il lit DATABASE_URL du fichier .env.
//
//   node scripts/booster-metriques.mjs                → SIMULATION (rien n'est écrit)
//   node scripts/booster-metriques.mjs --go           → exécution réelle
//   node scripts/booster-metriques.mjs --nettoyer --go → supprime TOUTES
//       les données de démonstration (comptes démo + leurs votes/favoris)
//
// Ce que le script fait (en mode --go) :
//   1. VUES  : ajoute à chaque outil, article, tutoriel vidéo, prompt
//      et skill un nombre de vues plausible, proportionnel à l'âge de
//      la fiche (une fiche de 3 mois a plus de vues qu'une fiche de
//      3 jours). ⚠️ Ce boost des vues N'EST PAS réversible : les vraies
//      vues futures s'additionneront par-dessus.
//   2. COMPTES DÉMO : crée 40 comptes « Membre démo NN » identifiables
//      (e-mail demo-NN@webgiverse.demo, aucun mot de passe, aucun
//      fournisseur Google → ils ne peuvent PAS se connecter).
//   3. VOTES (likes des outils) et FAVORIS (outils, skills, prompts) :
//      crée des votes/favoris aléatoires attribués aux comptes démo.
//      Réversible à 100 % via --nettoyer (la suppression des comptes
//      démo emporte leurs votes et favoris, par cascade).
//
// Ce que le script ne fait PAS (volontairement) :
//   • aucun AVIS (texte + note affichés publiquement et repris dans
//     les données structurées Google : de faux avis = risque réel de
//     pénalité et de tromperie) ;
//   • aucun e-mail envoyé, aucune notification créée ;
//   • aucun abonnement, aucun paiement.
// ─────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

// ── Réglages (adapte librement ces nombres) ──────────────────────
const REGLAGES = {
    vuesMinParJour: 0.6, // vues ajoutées par jour d'âge de la fiche (minimum)
    vuesMaxParJour: 3.0, // (maximum) — une fiche de 60 jours gagne 36 à 180 vues
    vuesPlancher: 4, // même une fiche d'aujourd'hui a déjà quelques vues
    vuesPlafond: 900, // garde-fou : jamais plus de 900 vues ajoutées
    comptesDemo: 40, // nombre de comptes de démonstration créés
    votesMinOutil: 2, // votes « Utile » ajoutés par outil (minimum)
    votesMaxOutil: 15, // (maximum)
    favorisMinOutil: 1, // favoris outils ajoutés par outil (minimum)
    favorisMaxOutil: 8, // (maximum)
    favorisMinSkill: 1, // favoris skills ajoutés par skill (minimum)
    favorisMaxSkill: 6, // (maximum)
    favorisMinPrompt: 0, // favoris prompts ajoutés par prompt (minimum)
    favorisMaxPrompt: 4, // (maximum)
    suffixeEmailDemo: "@webgiverse.demo", // identifie les comptes démo (nettoyage)
};

const aller = process.argv.includes("--go");
const nettoyer = process.argv.includes("--nettoyer");

// ── Chargement de DATABASE_URL depuis .env (sans dépendance) ─────
if (!process.env.DATABASE_URL) {
    try {
        const env = readFileSync(new URL("../.env",
            import.meta.url), "utf8");
        for (const ligne of env.split("\n")) {
            const m = ligne.match(/^\s*DATABASE_URL\s*=\s*"?([^"\r\n]+)"?\s*$/);
            if (m) {
                process.env.DATABASE_URL = m[1];
                break;
            }
        }
    } catch {
        /* pas de fichier .env : on laisse Prisma faire son message d'erreur */
    }
}

const prisma = new PrismaClient();

const alea = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const auHasard = (liste) => liste[alea(0, liste.length - 1)];
const ilYa = (jours) => new Date(Date.now() - jours * 86_400_000);
const joursDepuis = (date) =>
    Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000));

async function main() {
    if (nettoyer) return modeNettoyage();
    return modeBoost();
}

/* ── Mode 1 : suppression de TOUTES les données de démo ─────────── */
async function modeNettoyage() {
    console.log("═ NETTOYAGE des données de démonstration ═\n");
    if (!aller) {
        console.log("(simulation — ajoute --go pour exécuter réellement)\n");
    }
    const filtre = { email: { endsWith: REGLAGES.suffixeEmailDemo } };
    const [votes, favoris, favorisSkills, favorisPrompts, comptes] = await Promise.all([
        prisma.vote.count({ where: { utilisateur: { is: filtre } } }),
        prisma.favorite.count({ where: { user: { is: filtre } } }),
        prisma.skillFavori.count({ where: { user: { is: filtre } } }),
        prisma.promptFavori.count({ where: { user: { is: filtre } } }),
        prisma.user.count({ where: filtre }),
    ]);
    console.log(`Trouvé : ${comptes} compte(s) démo, ${votes} votes, ${favoris} favoris outils, ${favorisSkills} favoris skills, ${favorisPrompts} favoris prompts.`);
    if (!aller) return;

    // La suppression des comptes démo emporte, par cascade (onDelete:
    // Cascade dans schema.prisma), tous leurs votes et favoris.
    const supprimes = await prisma.user.deleteMany({ where: filtre });
    console.log(`\n✔ ${supprimes.count} compte(s) démo supprimé(s) — votes et favoris liés supprimés en cascade.`);
    console.log("NB : les VUES ajoutées par le boost restent en place (non réversibles).");
}

/* ── Mode 2 : boost ─────────────────────────────────────────────── */
async function modeBoost() {
    console.log("═ BOOST DES COMPTEURS — DÉMONSTRATION ═\n");
    if (!aller) {
        console.log("(SIMULATION — rien n'est écrit. Ajoute --go pour exécuter)\n");
    }

    // 1 ─ Vues --------------------------------------------------------
    const [outils, articles, tutos, prompts, skills] = await Promise.all([
        prisma.tool.findMany({ where: { statut: "PUBLIE" }, select: { id: true, nom: true, vues: true, createdAt: true } }),
        prisma.article.findMany({ where: { statut: "PUBLIE" }, select: { id: true, titre: true, vues: true, creeLe: true } }),
        prisma.tuto.findMany({ select: { id: true, titre: true, vues: true, creeLe: true } }),
        prisma.prompt.findMany({ select: { id: true, titre: true, vues: true, creeLe: true } }),
        prisma.skill.findMany({ select: { id: true, vues: true, creeLe: true } }),
    ]);

    const ajouterVues = (vuesActuelles, creeLe) => {
        const jours = joursDepuis(creeLe);
        const brut = Math.round(
            jours * (REGLAGES.vuesMinParJour + Math.random() * (REGLAGES.vuesMaxParJour - REGLAGES.vuesMinParJour)),
        ) + REGLAGES.vuesPlancher + alea(0, 16);
        return Math.min(REGLAGES.vuesPlafond, brut);
    };

    const totaux = { outils: 0, articles: 0, tutos: 0, prompts: 0, skills: 0 };
    const plansVues = [];
    for (const o of outils) {
        const ajout = ajouterVues(o.vues, o.createdAt);
        totaux.outils += ajout;
        plansVues.push(() => prisma.tool.update({ where: { id: o.id }, data: { vues: { increment: ajout } } }));
    }
    for (const a of articles) {
        const ajout = ajouterVues(a.vues, a.creeLe);
        totaux.articles += ajout;
        plansVues.push(() => prisma.article.update({ where: { id: a.id }, data: { vues: { increment: ajout } } }));
    }
    for (const t of tutos) {
        const ajout = ajouterVues(t.vues, t.creeLe);
        totaux.tutos += ajout;
        plansVues.push(() => prisma.tuto.update({ where: { id: t.id }, data: { vues: { increment: ajout } } }));
    }
    for (const p of prompts) {
        const ajout = ajouterVues(p.vues, p.creeLe);
        totaux.prompts += ajout;
        plansVues.push(() => prisma.prompt.update({ where: { id: p.id }, data: { vues: { increment: ajout } } }));
    }
    for (const s of skills) {
        const ajout = ajouterVues(s.vues, s.creeLe);
        totaux.skills += ajout;
        plansVues.push(() => prisma.skill.update({ where: { id: s.id }, data: { vues: { increment: ajout } } }));
    }

    console.log(`VUES à ajouter : ${outils.length} outils (+${totaux.outils}), ${articles.length} articles (+${totaux.articles}), ${tutos.length} tutos vidéo (+${totaux.tutos}), ${prompts.length} prompts (+${totaux.prompts}), ${skills.length} skills (+${totaux.skills}).`);

    // 2 ─ Comptes de démonstration ------------------------------------
    const comptesDemo = [];
    for (let n = 1; n <= REGLAGES.comptesDemo; n++) {
        const numero = String(n).padStart(2, "0");
        comptesDemo.push({
            email: `demo-${numero}${REGLAGES.suffixeEmailDemo}`,
            name: `Membre démo ${numero}`,
        });
    }
    console.log(`COMPTES DÉMO : ${comptesDemo.length} comptes « Membre démo NN » (${REGLAGES.suffixeEmailDemo}, non connectables).`);

    // 3 ─ Votes et favoris (simulation des volumes) --------------------
    const planVotes = [];
    const planFavorisOutils = [];
    for (const o of outils) {
        planVotes.push(...piger(comptesDemo, alea(REGLAGES.votesMinOutil, REGLAGES.votesMaxOutil)).map((c) => ({
            outilId: o.id,
            utilisateurId: c.email,
            creeLe: ilYa(alea(0, 45)),
        })));
        for (const c of piger(comptesDemo, alea(REGLAGES.favorisMinOutil, REGLAGES.favorisMaxOutil))) {
            planFavorisOutils.push({
                userId: c.email,
                toolId: o.id,
                statut: auHasard(["A_TESTER", "EN_COURS", "ADOPTE"]),
                createdAt: ilYa(alea(0, 45)),
            });
        }
    }

    const planFavorisSkills = [];
    for (const s of skills) {
        for (const c of piger(comptesDemo, alea(REGLAGES.favorisMinSkill, REGLAGES.favorisMaxSkill))) {
            planFavorisSkills.push({ userId: c.email, skillId: s.id, creeLe: ilYa(alea(0, 45)) });
        }
    }

    const planFavorisPrompts = [];
    for (const p of prompts) {
        for (const c of piger(comptesDemo, alea(REGLAGES.favorisMinPrompt, REGLAGES.favorisMaxPrompt))) {
            planFavorisPrompts.push({ userId: c.email, promptId: p.id, creeLe: ilYa(alea(0, 45)) });
        }
    }

    console.log(`VOTES outils à créer : ${planVotes.length} · FAVORIS outils : ${planFavorisOutils.length} · FAVORIS skills : ${planFavorisSkills.length} · FAVORIS prompts : ${planFavorisPrompts.length}.`);

    if (!aller) {
        console.log("\nFin de la simulation. Lance « node scripts/booster-metriques.mjs --go » pour appliquer.");
        return;
    }

    // ── Exécution réelle ─────────────────────────────────────────────
    console.log("\nExécution…");
    for (const [i, maj] of plansVues.entries()) {
        await maj();
        if ((i + 1) % 50 === 0) console.log(`  vues : ${i + 1}/${plansVues.length} fiches mises à jour…`);
    }

    for (const compte of comptesDemo) {
        await prisma.user.upsert({
            where: { email: compte.email },
            update: {},
            create: { email: compte.email, name: compte.name, role: "USER" },
        });
    }
    const demo = await prisma.user.findMany({
        where: { email: { endsWith: REGLAGES.suffixeEmailDemo } },
        select: { id: true },
    });

    // Piges sans doublon (un même compte démo ne vote/favorise qu'une fois).
    function piger(liste, n) {
        return [...liste].sort(() => Math.random() - 0.5).slice(0, Math.min(n, liste.length));
    }

    // Les comptes démo doivent exister AVANT de créer votes/favoris :
    // on re-pige à partir des comptes réellement créés en base (leurs id).
    const plansFinaux = { votes: [], favorisOutils: [], favorisSkills: [], favorisPrompts: [] };
    for (const o of outils) {
        for (const c of piger(demo, alea(REGLAGES.votesMinOutil, REGLAGES.votesMaxOutil))) {
            plansFinaux.votes.push({ outilId: o.id, utilisateurId: c.id, creeLe: ilYa(alea(0, 45)) });
        }
        for (const c of piger(demo, alea(REGLAGES.favorisMinOutil, REGLAGES.favorisMaxOutil))) {
            plansFinaux.favorisOutils.push({
                userId: c.id,
                toolId: o.id,
                statut: auHasard(["A_TESTER", "EN_COURS", "ADOPTE"]),
                createdAt: ilYa(alea(0, 45)),
            });
        }
    }
    for (const s of skills) {
        for (const c of piger(demo, alea(REGLAGES.favorisMinSkill, REGLAGES.favorisMaxSkill))) {
            plansFinaux.favorisSkills.push({ userId: c.id, skillId: s.id, creeLe: ilYa(alea(0, 45)) });
        }
    }
    for (const p of prompts) {
        for (const c of piger(demo, alea(REGLAGES.favorisMinPrompt, REGLAGES.favorisMaxPrompt))) {
            plansFinaux.favorisPrompts.push({ userId: c.id, promptId: p.id, creeLe: ilYa(alea(0, 45)) });
        }
    }

    await prisma.vote.createMany({ data: plansFinaux.votes, skipDuplicates: true });
    await prisma.favorite.createMany({ data: plansFinaux.favorisOutils, skipDuplicates: true });
    await prisma.skillFavori.createMany({ data: plansFinaux.favorisSkills, skipDuplicates: true });
    await prisma.promptFavori.createMany({ data: plansFinaux.favorisPrompts, skipDuplicates: true });

    console.log("\n✔ Terminé :");
    console.log(`  · ${plansVues.length} fiches ont reçu leurs vues de démonstration ;`);
    console.log(`  · ${demo.length} comptes démo prêts (réversibles via --nettoyer --go) ;`);
    console.log(`  · ${plansFinaux.votes.length} votes, ${plansFinaux.favorisOutils.length} favoris outils, ${plansFinaux.favorisSkills.length} favoris skills, ${plansFinaux.favorisPrompts.length} favoris prompts créés.`);
    console.log("\nRappel : ne présente pas ces chiffres comme réels à des annonceurs (transparence).");
}

main()
    .catch((e) => {
        console.error("Échec :", e.message);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());