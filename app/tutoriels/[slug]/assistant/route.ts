// app/api/tutoriels/[slug]/assistant/route.ts
// Lot 36 — ASSISTANT IA DU TUTORIEL, version BLINDÉE.
// · Même contrat que le lot 35 (réservé Premium, ancré sur le contenu du
//   tutoriel, conversation éphémère), mais :
//   1. `export const maxDuration = 60` → la fonction Vercel ne meurt plus
//      avant la fin de l'appel IA (le repli « indisponible » venait aussi
//      de fonctions tuées à 10 s → page 504 HTML au lieu d'un JSON).
//   2. PLUSIEURS MODÈLES GRATUITS essayés en cascade : le premier modèle
//      :free qui répond gagne. LOT 73 — cascade actualisée (les anciens
//      modèles ont été retirés d'OpenRouter). Le premier modèle est
//      remplaçable via la variable d'environnement OPENROUTER_MODELE
//      (optionnelle).
//   3. RÉPONSE JSON DANS TOUS LES CAS : plus aucune situation où le front
//      reçoit une page HTML (404/504) sans explication. Chaque échec
//      renvoie un message précis, et tout est loggué côté serveur avec le
//      préfixe « ASSISTANT TUTO : » (visible dans Vercel → Logs).
// Lot 65 — LA CONVERSATION N'EST PLUS ÉPHÉMÈRE :
//   1. L'historique de contexte n'est plus envoyé par le front : les
//      6 derniers messages sont relus dans la table dédiée
//      MessageChatTutoriel (même principe que NoteTutoriel).
//   2. Dès qu'un échange aboutit, la question ET la réponse sont
//      enregistrées au fil de l'eau (échec de sauvegarde non
//      bloquant : la réponse reste toujours affichée).
//   3. À l'ouverture de la page, le fil est rechargé côté serveur
//      (page.tsx) — plus rien ne disparaît à l'actualisation.
// LOT 70 — L'ORDRE DES MESSAGES NE PEUT PLUS S'INVERSER :
//   1. Sauvegarde en DEUX créations successives (question PUIS
//      réponse) au lieu d'un createMany : avec createMany, les deux
//      lignes recevaient le MÊME horodatage PostgreSQL (now() est
//      figé au début de la transaction) et le tri SQL à date égale
//      ne garantit aucun ordre → après F5, la réponse s'affichait
//      AU-DESSUS de la question. Deux créations = deux horodatages.
//   2. La relecture de l'historique (contexte du modèle ET fil de la
//      page) départe en plus les horodatages identiques : question
//      AVANT réponse (lib/assistant/ordre-messages.ts) → les
//      anciens messages déjà enregistrés en base se réaffichent dans
//      le bon ordre, sans aucune migration.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";
import { autoriserRequete } from "@/lib/limitation-debit"; // Lot 83
import { accesTutoriels } from "@/lib/acces-tutoriels";
import { parserDescriptionRaffinee } from "@/lib/description-youtube";
import { formaterDuree, NIVEAUX } from "@/lib/tutos-utils";
import {
  ordonnerMessagesChronologique,
  retirerReponsesOrphelinesDebut,
} from "@/lib/assistant/ordre-messages";

// Durée maximale de la fonction sur Vercel (le plan Hobby accepte 60 s).
export const maxDuration = 60;

const URL_API = "https://openrouter.ai/api/v1/chat/completions";
// LOT 73 — CASCADE ACTUALISÉE (vérifiée en direct sur
// openrouter.ai/api/v1/models) : l'ancienne cascade
// (openrouter/free, nvidia/nemotron-3-super-120b-a12b:free,
// meta-llama/llama-3.3-70b-instruct:free) a été RETIRÉE d'OpenRouter
// → chaque appel renvoyait 404. Nouvelle cascade : le premier modèle
// :free qui répond gagne. Si tu veux changer le modèle principal sans
// toucher au code, définis OPENROUTER_MODELE dans le .env
// (ex. OPENROUTER_MODELE=google/gemma-4-31b-it:free).
const MODELES = Array.from(
  new Set(
    [
      process.env.OPENROUTER_MODELE?.trim() || "google/gemma-4-31b-it:free",
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
    ].filter((m) => m.length > 0),
  ),
);
const MAX_MESSAGE = 1000; // caractères
const MAX_HISTORIQUE = 6; // messages de contexte relus en base (Lot 65)
// Lot 83 — même limite que l'assistant principal (40 questions/heure) :
// un compte Premium pouvait marteler cette route et consommer le quota
// OpenRouter (coûts) sans aucune barrière côté serveur.
const MAX_QUESTIONS_TUTO_PAR_HEURE = 40;
const MAX_TOKENS_REPONSE = 700;
const DELAI_PAR_MODELE_MS = 25000; // 25 s par modèle (60 s dispo côté Vercel)

/** Construit le bloc « CONTENU DU TUTORIEL » injecté dans le système. */
function contexteTuto(tuto: {
  titre: string;
  niveau: string;
  dureeMin: number;
  outils: string[];
  descriptionRaffinee: unknown;
}): string {
  const lignes: string[] = [];
  lignes.push(`Titre : ${tuto.titre}`);
  lignes.push(`Niveau : ${NIVEAUX[tuto.niveau as keyof typeof NIVEAUX]?.libelle ?? tuto.niveau}`);
  lignes.push(`Durée : ${formaterDuree(tuto.dureeMin)}`);
  if (tuto.outils.length > 0) lignes.push(`Outils abordés : ${tuto.outils.join(", ")}`);

  const description = parserDescriptionRaffinee(tuto.descriptionRaffinee);
  if (description) {
    if (description.chapitres.length > 0) {
      lignes.push(
        `Chapitres de la vidéo :\n${description.chapitres
          .map((c) => `- ${c.temps} — ${c.titre}`)
          .join("\n")}`,
      );
    }
    if (description.ressources.length > 0) {
      lignes.push(
        `Ressources citées dans le tutoriel :\n${description.ressources
          .map((r) => `- ${r.label ?? "Lien"} : ${r.url}`)
          .join("\n")}`,
      );
    }
    if (description.paragraphes.length > 0) {
      lignes.push(`Extraits de la description :\n${description.paragraphes.join("\n")}`);
    }
  } else {
    lignes.push(
      "(La description détaillée de cette vidéo n'est pas disponible : appuie-toi uniquement sur le titre, le niveau, la durée et les outils. Dis-le franchement si une question demande plus de détails.)",
    );
  }
  return lignes.join("\n");
}

export async function POST(
  requete: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    // ── 1. Corps de la requête ──────────────────────────────────────
    const corps = (await requete.json().catch(() => null)) as
      | { message?: unknown }
      | null;
    const message = typeof corps?.message === "string" ? corps.message.trim() : "";
    if (!message) {
      return NextResponse.json({ erreur: "Message vide." }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE) {
      return NextResponse.json(
        { erreur: `Question trop longue (${MAX_MESSAGE} caractères maximum).` },
        { status: 400 },
      );
    }

    // ── 2. Session + capacité Premium (côté serveur, non contournable) ─
    const session = await auth();
    const utilisateurId = session?.user?.id ?? null;
    if (!utilisateurId) {
      return NextResponse.json(
        { erreur: "Connecte-toi pour discuter avec l'assistant du tutoriel.", raison: "non-connecte" },
        { status: 401 },
      );
    }
    const acces = await accesTutoriels(utilisateurId);
    if (!acces.peut("assistantTuto")) {
      return NextResponse.json(
        {
          erreur:
            "L'assistant IA des tutoriels est inclus dans les plans Pro et Entreprise. Passe Premium pour l'utiliser.",
          raison: "premium",
        },
        { status: 403 },
      );
    }

    // ── 2bis. Lot 83 — Limite de débit (coûts OpenRouter) ───────────
    // 40 questions par compte et par heure, comme l'assistant principal.
    if (!autoriserRequete(`assistant-tuto:${utilisateurId}`, MAX_QUESTIONS_TUTO_PAR_HEURE, 60 * 60_000)) {
      return NextResponse.json(
        { erreur: "Tu as atteint la limite de 40 questions par heure sur les assistants. Réessaie dans un instant." },
        { status: 429 },
      );
    }

    // ── 3. Le tutoriel existe-t-il ? ────────────────────────────────
    const { slug } = await params;
    const tuto = await prisma.tuto.findUnique({
      where: { slug },
      select: {
        id: true, // Lot 65 — nécessaire pour lier les messages au tuto
        titre: true,
        niveau: true,
        dureeMin: true,
        outils: true,
        descriptionRaffinee: true,
      },
    });
    if (!tuto) {
      return NextResponse.json({ erreur: "Tutoriel introuvable." }, { status: 404 });
    }

    // ── 4. Historique relu depuis la base (Lot 65, ordre Lot 70) ────
    // Le front n'envoie plus l'historique : source de vérité unique
    // = table MessageChatTutoriel. On prend les derniers messages
    // de CE membre sur CE tutoriel. LOT 70 : le tri chronologique
    // DÉTERMINISTE (lib/assistant/ordre-messages.ts) départe les
    // horodatages identiques laissés par l'ancien createMany — la
    // question passe toujours AVANT sa réponse, et une réponse
    // orpheline coupée par la fenêtre est retirée de la tête.
    // Si la table est absente (migration oubliée) : fil vide, la
    // conversation fonctionne quand même, sans crash.
    let historique: { role: string; contenu: string }[] = [];
    try {
      const historiqueBdd = await prisma.messageChatTutoriel.findMany({
        where: { userId: utilisateurId, tutoId: tuto.id },
        orderBy: { creeLe: "desc" },
        take: MAX_HISTORIQUE + 2, // marge : ne jamais couper une paire
        select: { role: true, contenu: true, creeLe: true },
      });
      historique = retirerReponsesOrphelinesDebut(
        ordonnerMessagesChronologique(historiqueBdd).slice(-MAX_HISTORIQUE),
      )
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, contenu: m.contenu }));
    } catch (erreurHistorique) {
      console.error("ASSISTANT TUTO : lecture de l'historique impossible :", erreurHistorique);
    }

    // ── 5. Clé OpenRouter ───────────────────────────────────────────
    const cleApi = process.env.OPENROUTER_API_KEY;
    if (!cleApi) {
      console.error("ASSISTANT TUTO : OPENROUTER_API_KEY absente du .env");
      return NextResponse.json(
        { erreur: "L'assistant n'est pas configuré : clé OpenRouter manquante dans le .env." },
        { status: 500 },
      );
    }

    // ── 6. Consigne système ancrée sur le tutoriel ──────────────────
    const consigneSysteme = `Tu es l'assistant pédagogique du tutoriel « ${tuto.titre} » sur Webgiverse, un annuaire francophone d'outils d'intelligence artificielle.
Ta connaissance se limite AU CONTENU DU TUTORIEL fourni ci-dessous.
Règles :
- Réponds toujours en français, clair et concis (environ 150 mots maximum).
- Base-toi UNIQUEMENT sur le contenu du tutoriel (titre, niveau, outils, chapitres, ressources, extraits). N'invente jamais d'étape, de lien, de chiffre ou d'outil.
- Si l'information demandée ne figure pas dans le tutoriel, dis-le honnêtement et oriente vers la partie de la vidéo la plus proche (cite le chapitre correspondant si tu en connais un).
- Pour une demande de résumé : donne un résumé structuré de 3 à 6 puces, dans l'ordre des chapitres.
- Pour un plan d'apprentissage : appuie-toi sur l'ordre des chapitres du tutoriel.
- Ne recommande ni autre tutoriel ni outil externe, sauf s'ils figurent dans les ressources du tutoriel.
- Ne mentionne jamais de clés API ni de détails techniques internes.

CONTENU DU TUTORIEL :
 ${contexteTuto(tuto)}`;

    const messagesApi = [
      { role: "system", content: consigneSysteme },
      ...historique.map((m) => ({ role: m.role, content: m.contenu })),
      { role: "user", content: message },
    ];

    // ── 7. Appel OpenRouter — cascade de modèles gratuits ───────────
    let texte = "";
    let statutEchec = 0;
    let detailEchec = "";
    let delaiDepasse = false;

    for (const modele of MODELES) {
      try {
        const reponseHttp = await fetch(URL_API, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cleApi}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXTAUTH_URL ?? "http://localhost:3000",
            "X-Title": "Webgiverse Outils IA",
          },
          body: JSON.stringify({
            model: modele,
            max_tokens: MAX_TOKENS_REPONSE,
            messages: messagesApi,
          }),
          signal: AbortSignal.timeout(DELAI_PAR_MODELE_MS),
        });

        if (reponseHttp.ok) {
          const donnees = (await reponseHttp.json().catch(() => null)) as
            | { choices?: Array<{ message?: { content?: string } }> }
            | null;
          const candidat = donnees?.choices?.[0]?.message?.content ?? "";
          if (candidat.trim()) {
            texte = candidat;
            break; // ✅ un modèle a répondu
          }
          statutEchec = 502;
          detailEchec = `[${modele}] réponse 200 mais sans texte`;
          console.error("ASSISTANT TUTO :", detailEchec);
          continue;
        }

        // Erreur HTTP du modèle courant
        const corpsErreur = await reponseHttp.text();
        statutEchec = reponseHttp.status;
        detailEchec = `[${modele}] HTTP ${reponseHttp.status} : ${corpsErreur.slice(0, 300)}`;
        console.error("ASSISTANT TUTO :", detailEchec);
        if (reponseHttp.status === 401) break; // clé invalide : inutile d'essayer les autres
        // 402 / 404 / 429 / 5xx → on tente le modèle suivant
      } catch (erreurModele) {
        const nom = erreurModele instanceof Error ? erreurModele.name : "Erreur";
        if (nom === "TimeoutError" || nom === "AbortError") {
          statutEchec = 504;
          delaiDepasse = true;
          detailEchec = `[${modele}] délai de ${DELAI_PAR_MODELE_MS / 1000} s dépassé`;
        } else {
          statutEchec = 502;
          detailEchec = `[${modele}] erreur réseau : ${String(erreurModele).slice(0, 200)}`;
        }
        console.error("ASSISTANT TUTO :", detailEchec);
        continue;
      }
    }

    if (texte) {
      // ── 8. Sauvegarde de l'échange en base (Lot 65) ───────────────
      // Au fil de l'eau : question + réponse enregistrées ensemble
      // dès que la réponse aboutit — jamais de question orpheline
      // (si le modèle échoue, rien n'est enregistré, exactement
      // comme dans l'affichage qui retire la question sans réponse).
      // LOT 70 — question PUIS réponse, en DEUX créations successives
      // (et non plus un createMany) : chaque ligne reçoit son propre
      // horodatage → la relecture ne peut plus inverser la paire.
      // Échec de sauvegarde NON bloquant : la réponse reste affichée
      // quoi qu'il arrive ; seul le rechargement perdrait l'échange.
      try {
        await prisma.messageChatTutoriel.create({
          data: { userId: utilisateurId, tutoId: tuto.id, role: "user", contenu: message },
        });
        await prisma.messageChatTutoriel.create({
          data: { userId: utilisateurId, tutoId: tuto.id, role: "assistant", contenu: texte },
        });
      } catch (erreurSauvegarde) {
        console.error(
          "ASSISTANT TUTO : sauvegarde de la conversation impossible :",
          erreurSauvegarde,
        );
      }

      // ── 8bis. Journal (jamais bloquant) ───────────────────────────
      await journaliser(utilisateurId, "assistant_tuto", slug).catch(() => {});
      return NextResponse.json({ reponse: texte });
    }

    // ── 9. Aucun modèle n'a répondu → message précis en JSON ────────
    const messageErreur = expliquerErreur(statutEchec, detailEchec, delaiDepasse);
    return NextResponse.json({ erreur: messageErreur }, { status: 502 });
  } catch (erreur) {
    console.error("=== ERREUR ASSISTANT TUTO ===", erreur);
    const nom = erreur instanceof Error ? erreur.name : "";
    const messageErreur =
      nom === "TimeoutError"
        ? "L'assistant a mis trop de temps à répondre. Réessaie."
        : "L'assistant est momentanément indisponible. Réessaie dans un instant.";
    return NextResponse.json({ erreur: messageErreur }, { status: 502 });
  }
}

function expliquerErreur(status: number, detail: string, delai: boolean): string {
  const texte = detail.toLowerCase();
  if (status === 401)
    return "Clé OpenRouter invalide. Vérifie OPENROUTER_API_KEY dans le .env (et dans Vercel → Settings → Environment Variables).";
  if (status === 402 || texte.includes("credit") || texte.includes("insufficient"))
    return "Ce modèle nécessite des crédits. Recharge sur openrouter.ai/credits (10 $ débloquent aussi la limite élevée) ou attends la remise à jour de la limite gratuite.";
  if (status === 429)
    return "Limite du modèle gratuit atteinte (environ 20 requêtes/minute et 50/jour sans crédits). Réessaie dans un instant.";
  if (status === 404 || texte.includes("no endpoints") || texte.includes("not found"))
    return "Aucun modèle gratuit n'a répondu — les modèles :free changent parfois. Vérifie la liste à jour sur openrouter.ai/models (filtre « :free ») et adapte OPENROUTER_MODELE ou la cascade.";
  if (delai || status === 504)
    return "L'assistant a mis trop de temps à répondre. Réessaie dans un instant.";
  if (status === 502 || status === 503)
    return "Le modèle est surchargé. Réessaie dans un instant.";
  return "L'assistant est momentanément indisponible. Réessaie dans un instant.";
}