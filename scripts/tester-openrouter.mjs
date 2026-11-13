// scripts/tester-openrouter.mjs
// ─────────────────────────────────────────────────────────────────
// Lot 88-bis — TESTEUR DE LA CLÉ OPENROUTER ET DES MODÈLES DE LA
// CASCADE (l'assistant admin IA ET l'assistant des tutoriels).
//
// Utilisation (à la racine du projet, dans le terminal) :
//     node scripts/tester-openrouter.mjs
//
// Ce que fait le script :
//   1. lit OPENROUTER_API_KEY dans .env.local ou .env (jamais affichée) ;
//   2. interroge openrouter.ai/api/v1/key : crédits utilisés, limite ;
//   3. teste CHAQUE modèle de la cascade avec une mini-question
//      (« Réponds uniquement : OK ») et affiche OK / la cause de l'échec.
//
// Aucune dépendance : Node 18+ (fetch natif).
// ─────────────────────────────────────────────────────────────────
import { readFileSync, existsSync } from "node:fs";

const MODELES = [
    "google/gemma-4-31b-it:free",
    "nvidia/nemotron-3.5-lightning:free",
    "google/gemma-4-26b-a4b-it:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
];

/** Lit la clé dans .env.local puis .env, sans jamais l'afficher. */
function lireCle() {
    for (const fichier of[".env.local", ".env"]) {
        if (!existsSync(fichier)) continue;
        for (const ligne of readFileSync(fichier, "utf8").split("\n")) {
            const m = ligne.match(/^\s*OPENROUTER_API_KEY\s*=\s*"?([^"\s#]+)"?/);
            if (m) return m[1];
        }
    }
    return process.env.OPENROUTER_API_KEY ? ? "";
}

const cle = lireCle();
if (!cle) {
    console.error("✗ Aucune OPENROUTER_API_KEY trouvée dans .env.local / .env.");
    process.exit(1);
}
console.log(`✓ Clé trouvée (${cle.slice(0, 6)}…${cle.slice(-4)}, ${cle.length} caractères).`);

// 1. État du compte : crédits, limites (renseigne sur le quota :free).
try {
    const reponse = await fetch("https://openrouter.ai/api/v1/key", {
        headers: { Authorization: `Bearer ${cle}` },
        signal: AbortSignal.timeout(15 _000),
    });
    const donnees = await reponse.json().catch(() => null);
    if (reponse.ok && donnees ? .data) {
        const d = donnees.data;
        const credits = (Number(d.limit ? ? 0) - Number(d.usage ? ? 0)).toFixed(2);
        console.log(`  Compte : ${d.label ?? "sans nom"} · crédits restants ≈ ${credits} $ · palier gratuit : ${d.is_free_tier ? "OUI" : "non"}`);
        if (d.is_free_tier) {
            console.log("  Rappel : compte sans crédits → 50 appels :free par jour, 20 par minute.");
            console.log("  Avec 10 $ de crédits achetés → 1 000 appels :free par jour.");
        }
    } else {
        console.error(`  ✗ /api/v1/key : HTTP ${reponse.status} — ${donnees?.error?.message ?? "réponse illisible"}`);
        if (reponse.status === 401) {
            console.error("  → La clé est REFUSÉE : vérifie qu'elle commence par « sk-or- » et qu'elle est active sur openrouter.ai/keys.");
        }
    }
} catch (e) {
    console.error(`  ✗ /api/v1/key injoignable : ${String(e).slice(0, 120)}`);
}

// 2. Test de chaque modèle de la cascade.
console.log("\nTest de la cascade (mini-question, max 20 s par modèle) :");
for (const modele of MODELES) {
    const depart = Date.now();
    try {
        const reponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${cle}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://webgiverse-tools.vercel.app",
                "X-Title": "Test cascade Webgiverse",
            },
            body: JSON.stringify({
                model: modele,
                max_tokens: 10,
                messages: [{ role: "user", content: "Réponds uniquement : OK" }],
            }),
            signal: AbortSignal.timeout(20 _000),
        });
        const duree = ((Date.now() - depart) / 1000).toFixed(1);
        const donnees = await reponse.json().catch(() => null);
        if (reponse.ok) {
            const texte = donnees ? .choices ? .[0] ? .message ? .content ? .trim() ? ? "(vide)";
            console.log(`  ✓ ${modele} — ${duree} s — réponse : ${texte.slice(0, 40)}`);
        } else {
            console.log(`  ✗ ${modele} — HTTP ${reponse.status} — ${duree} s — ${donnees?.error?.message?.slice(0, 140) ?? "réponse illisible"}`);
        }
    } catch (e) {
        const duree = ((Date.now() - depart) / 1000).toFixed(1);
        console.log(`  ✗ ${modele} — échec réseau après ${duree} s : ${String(e).slice(0, 120)}`);
    }
}
console.log("\nFin du test. Un modèle « ✓ » suffit à faire fonctionner l'assistant.");