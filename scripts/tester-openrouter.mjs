// scripts/tester-openrouter.mjs
// Lot 36 — TEST AUTONOME DE LA CONNEXION OPENROUTER (sans Next.js).
// Usage, dans le dossier du projet :
//     node scripts/tester-openrouter.mjs
// La clé est cherchée dans cet ordre :
//   1. la variable d'environnement OPENROUTER_API_KEY,
//   2. le 1er argument passé : node scripts/tester-openrouter.mjs sk-or-v1-xxxx,
//   3. le fichier .env.local,  4. le fichier .env.
// Il teste : la validité de la clé (GET /api/v1/auth/key), puis un mini
// appel à chaque modèle candidat utilisé par l'assistant du tutoriel.
// Aucune dépendance à installer : Node 18+ suffit (fetch intégré).
import { readFileSync, existsSync } from "node:fs";

const URL_CLE = "https://openrouter.ai/api/v1/auth/key";
const URL_CHAT = "https://openrouter.ai/api/v1/chat/completions";
const MODELES = [

    // 1 à 10 : Les incontournables et phares
    "openrouter/free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "meta-llama/llama-3-8b-instruct:free",
    "deepseek/deepseek-chat:free",
    "deepseek/deepseek-r1:free",
    "deepseek/deepseek-r1-distill-llama-70b:free",
    "qwen/qwen-2.5-72b-instruct:free",
    "qwen/qwen-2.5-coder-32b-instruct:free",
    "qwen/qwen-2-7b-instruct:free",

    // 11 à 20 : Google, Mistral & NVIDIA
    "google/gemma-2-9b-it:free",
    "google/gemma-7b-it:free",
    "mistralai/mistral-7b-instruct:free",
    "mistralai/mistral-small-24b-instruct-2501:free",
    "mistralai/pixtral-12b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "microsoft/phi-3-medium-128k-instruct:free",
    "microsoft/phi-3-mini-4k-instruct:free",
    "microsoft/phi-4:free",
    "nousresearch/hermes-3-llama-3.1-70b:free",

    // 21 à 30 : Communauté et architectures spécialisées
    "nousresearch/hermes-2-pro-llama-3-8b:free",
    "cohere/command-r-plus:free",
    "cohere/command-r:free",
    "databricks/dbrx-instruct:free",
    "cognitivecomputations/dolphin-mixtral-8x7b:free",
    "openchat/openchat-7b:free",
    "huggingfaceh4/zephyr-7b-beta:free",
    "liquid/lfm-7b:free",
    "liquid/lfm-40b:free",
    "anthropic/claude-3-haiku:free",

    // 31 à 40 : Modèles open-weights et régionaux
    "airesearch/bielik-7b-instruct:free",
    "kwaipilot/kwai-kolors-instruct:free",
    "sao10k/l3-stheno-8b-v1.1:free",
    "undi95/remm-slerp-l2-13b:free",
    "gryphe/mythomax-l2-13b:free",
    "recursal/eagle-7b:free",
    "openrouter/cinematika-7b:free",
    "lynn/soliloquy-l3:free",
    "shisa-ai/shisa-gamma-7b-v1:free",
    "tokeking/llama-3-70b-instruct:free",

    // 41 à 50 : Alternatifs et sauvegardes additionnelles
    "santacoder/santacoder:free",
    "deepseek/deepseek-coder:free",
    "Qwen/QwQ-32B-Preview:free",
    "mistralai/mixtral-8x7b-instruct:free",
    "google/gemma-2-27b-it:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "meta-llama/llama-3.2-1b-instruct:free",
    "microsoft/phi-3.5-mini-instruct:free",
    "inflection/inflection-3-pi:free",
    "inflection/inflection-3-productivity:free"

];

// ── 1. Récupération de la clé ─────────────────────────────────────────
let cle = process.env.OPENROUTER_API_KEY || process.argv[2] || "";
if (!cle) {
    for (const fichier of[".env.local", ".env"]) {
        if (!existsSync(fichier)) continue;
        const lignes = readFileSync(fichier, "utf8").split(/\r?\n/);
        const ligne = lignes.find(
            (l) => l.trim().startsWith("OPENROUTER_API_KEY=") && l.includes("="),
        );
        if (ligne) {
            cle = ligne.slice(ligne.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
            console.log(`✓ Clé trouvée dans ${fichier}`);
            break;
        }
    }
} else {
    console.log("✓ Clé trouvée via l'environnement ou l'argument");
}
if (!cle) {
    console.error(
        "✗ AUCUNE clé trouvée.\n" +
        "  → Ajoute OPENROUTER_API_KEY=sk-or-v1-… dans .env.local\n" +
        "  (ou lance : node scripts/tester-openrouter.mjs sk-or-v1-xxxx)",
    );
    process.exit(1);
}
console.log(
    `  Clé : ${cle.slice(0, 12)}…${cle.slice(-4)} (${cle.length} caractères)` +
    (cle.startsWith("sk-or-v1-") ? "" : "  ⚠ Les clés OpenRouter commencent par « sk-or-v1- »"),
);

// ── 2. La clé est-elle valide ? ───────────────────────────────────────
try {
    const r = await fetch(URL_CLE, {
        headers: { Authorization: `Bearer ${cle}` },
        signal: AbortSignal.timeout(15000),
    });
    const corps = await r.text();
    if (!r.ok) {
        console.error(`✗ Clé REFUSÉE par OpenRouter (HTTP ${r.status}) : ${corps.slice(0, 300)}`);
        process.exit(1);
    }
    const donnees = JSON.parse(corps)?.data ?? {};
    console.log("✓ Clé VALIDE");
    if (donnees.limit !== undefined) {
        const utilisation = Number(donnees.usage ?? 0);
        const limite = Number(donnees.limit);
        console.log(
            `  Crédits : ${limite - utilisation >= 0 ? "$" + (limite - utilisation).toFixed(2) + " restants" : "illimités ?"}` +
            ` (usage $${utilisation.toFixed(2)} / limite $${limite.toFixed(2)})`,
        );
    }
    if (donnees.is_free_tier === true) {
        console.log(
            "  ⚠ Compte gratuit : les modèles « :free » sont limités (~20 req/min, ~50 req/jour).",
        );
    }
} catch (erreur) {
    console.error(
        "✗ Impossible de joindre openrouter.ai :",
        erreur instanceof Error ? erreur.message : erreur,
    );
    process.exit(1);
}

// ── 3. Test d'un vrai appel sur chaque modèle candidat ────────────────
console.log("\nTest des modèles (message : « Réponds uniquement : OK ») :");
let auMoinsUn = false;
for (const modele of MODELES) {
    const t0 = Date.now();
    try {
        const r = await fetch(URL_CHAT, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${cle}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Webgiverse test assistant",
            },
            body: JSON.stringify({
                model: modele,
                max_tokens: 40,
                messages: [{ role: "user", content: "Réponds uniquement : OK" }],
            }),
            signal: AbortSignal.timeout(30000),
        });
        const corps = await r.text();
        if (r.ok) {
            const donnees = JSON.parse(corps);
            const texte = donnees?.choices?.[0]?.message?.content?.trim() ?? "(vide)";
            console.log(
                `✓ ${modele} → « ${texte.slice(0, 60)} » en ${Date.now() - t0} ms` +
                (donnees?.model && donnees.model !== modele ? `  [modèle réel : ${donnees.model}]` : ""),
            );
            auMoinsUn = true;
        } else {
            console.error(`✗ ${modele} → HTTP ${r.status} : ${corps.slice(0, 240)}`);
        }
    } catch (erreur) {
        console.error(
            `✗ ${modele} → ${erreur instanceof Error ? erreur.name + " : " + erreur.message : erreur}`,
        );
    }
}

console.log(
    auMoinsUn ?
    "\n✅ AU MOINS UN modèle répond : la connexion OpenRouter FONCTIONNE.\n" +
    "   Si l'assistant du site échoue encore, la cause est côté Next.js :\n" +
    "   route absente (404), variable d'env absente dans Vercel, ou déploiement non relancé." :
    "\n❌ AUCUN modèle ne répond : le problème est la CLÉ ou le COMPTE OpenRouter,\n" +
    "   pas le code du site. Corrige d'abord ce test.",
);