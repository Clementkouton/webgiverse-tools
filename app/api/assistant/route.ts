// app/api/assistant/route.ts
// ─────────────────────────────────────────────────────────────────
// LOT 70 — L'ASSISTANT RÉPOND À PARTIR DU CATALOGUE RÉEL DU SITE.
// Améliorations importées de l'assistant des tutoriels (lots 36, 64,
// 65, 67) et demandes du lot 70 :
//
//   1. ANCRAGE SUR LE SITE : la consigne système est construite à
//      partir des 12 fiches d'outils les plus pertinentes pour la
//      question (lib/assistant/contexte.ts → outilsPertinents, avec
//      le VRAI tarif, la version gratuite, l'open source, les
//      catégories) + des CODES PROMO ACTIFS (table CodePromo, les
//      réductions Chariow sur les plans Premium). Le modèle ne
//      recommande plus des outils « connus de mémoire » : uniquement
//      des outils réellement référencés, et il fournit le lien de
//      réduction exact /tarifs?promo=CODE quand une réduction existe.
//      Le front transforme « **Nom** (slug : xxx) » en lien vers la
//      fiche (components/assistant/rendu-reponse.tsx).
//
//   2. CASCADE DE MODÈLES GRATUITS : le premier modèle :free qui
//      répond gagne. LOT 73 — cascade actualisée (les anciens modèles
//      ont été retirés d'OpenRouter) ; le premier modèle est
//      remplaçable sans toucher au code via OPENROUTER_MODELE.
//
//   3. maxDuration = 60 (Vercel Hobby) : la fonction ne meurt plus
//      avant la fin de l'appel IA.
//
//   4. ORDRE DES MESSAGES RÉPARÉ : la sauvegarde se fait en DEUX
//      créations successives (question PUIS réponse) au lieu d'un
//      createMany. Avec createMany, les deux lignes recevaient le
//      MÊME horodatage PostgreSQL (now() est figé au début de la
//      transaction) et la relecture triait les paires dans un ordre
//      aléatoire → après actualisation (F5), la réponse s'affichait
//      AU-DESSUS de la question. La lecture (GET /api/conversations/
//      [id]) départe en plus les horodatages déjà identiques en base
//      → les anciennes conversations se réaffichent dans le bon ordre,
//      sans aucune migration (lib/assistant/ordre-messages.ts).
// ─────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";
import { LIMITES_DECOUVERTE, quotaAssistant } from "@/lib/premium";
import { outilsPertinents, tokeniser } from "@/lib/assistant/contexte";
import { autoriserRequete } from "@/lib/limitation-debit"; // Lot 82

const URL_API = "https://openrouter.ai/api/v1/chat/completions";
// LOT 73 — CASCADE ACTUALISÉE (vérifiée en direct sur
// openrouter.ai/api/v1/models) : l'ancienne cascade
// (openrouter/free, nvidia/nemotron-3-super-120b-a12b:free,
// meta-llama/llama-3.3-70b-instruct:free) a été RETIRÉE d'OpenRouter
// → chaque appel renvoyait 404. Nouvelle cascade : le premier modèle
// :free qui répond gagne. Définis OPENROUTER_MODELE dans le .env pour
// changer le modèle principal sans toucher au code.
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
const MAX_TOKENS_REPONSE = 700;
const DELAI_PAR_MODELE_MS = 25000; // 25 s par modèle (60 s dispo côté Vercel)
const NB_FICHES = 12; // fiches injectées dans la consigne système

/* ── Bloc « FICHES OUTILS » : les fiches les plus pertinentes ────── */
async function blocFiches(message: string): Promise<string> {
  let fiches: Awaited<ReturnType<typeof outilsPertinents>> = [];
  try {
    fiches = await outilsPertinents(message, NB_FICHES);
  } catch (erreurCatalogue) {
    console.error("ASSISTANT : lecture du catalogue impossible :", erreurCatalogue);
  }

  if (fiches.length === 0) {
    return "(Aucune fiche du catalogue n'a pu être lue pour cette question : dis-le franchement, ne recommande aucun outil et invite le membre à explorer l'annuaire — page /outils.)";
  }

  return fiches
    .map((o) => {
      const categories = o.categories
        .map((c) => c.categorie.nom)
        .filter(Boolean)
        .join(", ");
      const description =
        o.description.length > 180
          ? `${o.description.slice(0, 180).trimEnd()}…`
          : o.description;
      return [
        `- **${o.nom}** (slug : ${o.slug})`,
        `tarif : ${o.tarif}`,
        o.gratuit ? "version gratuite : oui" : null,
        o.openSource ? "open source : oui" : null,
        categories ? `catégories : ${categories}` : null,
        `description : ${description}`,
      ]
        .filter(Boolean)
        .join(" — ");
    })
    .join("\n");
}

/* ── Bloc « RÉDUCTIONS ACTIVES » : codes promo Chariow valides ───── */
async function blocReductions(): Promise<string> {
  try {
    const maintenant = new Date();
    const promos = await prisma.codePromo.findMany({ where: { actif: true } });
    const valides = promos.filter((p) => {
      if (p.dateDebut && p.dateDebut > maintenant) return false;
      if (p.dateFin && p.dateFin < maintenant) return false;
      return true;
    });
    if (valides.length === 0) {
      return "(aucune réduction active — ne parle d'aucune réduction et n'invente aucun code)";
    }
    return valides
      .map((p) => {
        let libelle = p.typeRemise.toLowerCase();
        if (p.typeRemise === "POURCENTAGE") {
          libelle = `-${p.valeur} %`;
        } else if (p.typeRemise === "MONTANT") {
          // montant stocké en centimes (500 = -5,00 $), comme lib/plans.ts
          libelle = `-${(p.valeur / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} $`;
        } else if (p.typeRemise === "MOIS_OFFERTS") {
          libelle = `${p.valeur} mois offert${p.valeur > 1 ? "s" : ""}`;
        }
        return `- code ${p.code} : ${libelle} sur l'abonnement Premium — lien de réduction : /tarifs?promo=${p.code}`;
      })
      .join("\n");
  } catch (erreurPromo) {
    console.error("ASSISTANT : lecture des codes promo impossible :", erreurPromo);
    return "(aucune réduction active — ne parle d'aucune réduction et n'invente aucun code)";
  }
}

/* ── Consigne système ancrée sur le catalogue ────────────────────── */
function construireConsigne(fiches: string, reductions: string): string {
  return `Tu es l'assistant de Webgiverse, l'annuaire francophone d'outils d'intelligence artificielle. Signature de la marque : « Apprendre · Créer · Réussir ».
Ta connaissance des outils se limite AUX FICHES fournies ci-dessous : ce sont les données réelles du catalogue du site (tarifs inclus).

Règles :
- Réponds toujours en français, ton direct et pédagogique, environ 150 mots maximum.
- Recommande 2 à 3 outils au maximum, choisis UNIQUEMENT parmi les fiches. Cite chaque outil avec son nom EXACT au format **Nom** (slug : xxx) : ce format crée le lien cliquable vers la fiche de l'outil.
- N'invente JAMAIS un outil, un tarif, une fonction, une langue ou un lien : utilise uniquement les fiches. Si une information manque, dis « à vérifier sur la fiche de l'outil ».
- Précise quand la fiche l'indique si l'outil propose une version gratuite.
- Si aucune fiche ne correspond au besoin, dis-le honnêtement en une phrase et invite le membre à explorer l'annuaire (page /outils) ou à préciser son besoin. Ne cite aucun outil hors catalogue.
- RÉDUCTIONS : parle d'une réduction UNIQUEMENT si elle figure dans la section « RÉDUCTIONS ACTIVES » ci-dessous, et seulement si le membre parle de prix, de budget ou d'abonnement Premium (ou si c'est vraiment pertinent). Donne alors le lien EXACT au format [Voir les plans Premium](/tarifs?promo=CODE) en remplaçant CODE par le code réel. N'invente JAMAIS un code ni un lien de réduction.
- Si la question sort du sujet des outils IA, réponds brièvement et ramène vers le sujet.
- Ne mentionne jamais de clés API ni de détails techniques internes.
- Structure : une phrase de contexte, puis une liste courte (une ligne par outil : nom au format lien + une phrase d'explication avec le tarif réel), puis au besoin une question courte pour préciser le besoin.

FICHES OUTILS DU CATALOGUE WEBGIVERSE (données réelles) :
 ${fiches}

RÉDUCTIONS ACTIVES (codes promo Webgiverse, plans Premium) :
 ${reductions}`;
}

// Durée maximale de la fonction sur Vercel (le plan Hobby accepte 60 s).
export const maxDuration = 60;

// Lot 82 — longueur maximum d'une question (anti gaspillage de jetons).
const MAX_LONGUEUR_MESSAGE = 4000;
// Lot 82 — anti rafale : 40 questions par utilisateur et par heure en
// PLUS du quota mensuel (plan Découverte). Plafond d'abus, ajustable.
const MAX_QUESTIONS_PAR_HEURE = 40;

export async function POST(requete: NextRequest) {
  try {
    // ── 1. LECTURE DU CORPS ─────────────────────────────────────────
    // Lot 82 — le corps brut n'est plus loggé : il contient les
    // questions des membres (données privées), qui n'ont rien à faire
    // dans les journaux de la plateforme.
    const corps = (await requete.json().catch(() => ({}))) as Record<string, unknown>;

    // ── 2. EXTRACTION TOLÉRANTE DU MESSAGE ──────────────────────────
    const brut =
      corps?.message ?? corps?.question ?? corps?.texte ??
      corps?.contenu ?? corps?.prompt ?? corps?.query ?? "";
    let message: string = typeof brut === "string" ? brut.trim() : "";

    if (!message && Array.isArray(corps?.messages)) {
      const dernier = [...corps.messages]
        .reverse()
        .find((m) => {
          const texte = m?.contenu ?? m?.content;
          return m?.role === "user" && typeof texte === "string" && texte.trim();
        });
      if (dernier) {
        message = String(dernier.contenu ?? dernier.content ?? "").trim();
      }
    }

    if (!message) {
      return NextResponse.json({ erreur: "Message vide." }, { status: 400 });
    }
    if (message.length > MAX_LONGUEUR_MESSAGE) {
      return NextResponse.json(
        { erreur: "Ta question est trop longue (4000 caractères maximum)." },
        { status: 400 }
      );
    }

    // ── 3. SESSION (obligatoire pour discuter) ──────────────────────
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        {
          erreur: "Connectez-vous pour discuter avec l'assistant.",
          raison: "non-connecte",
        },
        { status: 401 }
      );
    }
    const utilisateurId: string = session.user.id;
    let conversationId: string | null =
      typeof corps?.conversationId === "string" ? corps.conversationId : null;

    // ── 3.5 QUOTA (plan Découverte : 10 questions/mois) ─────────────
    // On bloque AVANT d'appeler OpenRouter : chaque question coûte de l'argent.
    const quota = await quotaAssistant(utilisateurId);
    if (quota.restantes !== null && quota.restantes <= 0) {
      await journaliser(
        utilisateurId,
        "assistant",
        "Quota mensuel atteint (plan Découverte)"
      );
      return NextResponse.json(
        {
          erreur: `Vous avez utilisé vos ${LIMITES_DECOUVERTE.assistantMois} questions de ce mois-ci avec le plan Découverte. Passez au plan Pro pour des questions illimitées.`,
          raison: "limite",
        },
        { status: 429 }
      );
    }

    // ── 3.6 ANTI RAFALE (Lot 82) ─────────────────────────────────
    // Même les plans illimités passent par ce plafond : 40 questions
    // par heure et par compte suffit largement à un humain, et empêche
    // un script de marteler OpenRouter avec ta clé.
    if (!autoriserRequete(`assistant:${utilisateurId}`, MAX_QUESTIONS_PAR_HEURE, 60 * 60_000)) {
      await journaliser(
        utilisateurId,
        "assistant",
        "Plafond horaire de l'assistant atteint"
      ).catch(() => {});
      return NextResponse.json(
        {
          erreur: "Trop de questions à la suite. Fais une pause et reviens dans un instant.",
          raison: "limite",
        },
        { status: 429 }
      );
    }

    // ── 4. CLÉ API ──────────────────────────────────────────────────
    const cleApi = process.env.OPENROUTER_API_KEY;
    if (!cleApi) {
      console.error("ASSISTANT : OPENROUTER_API_KEY absente du .env");
      return NextResponse.json(
        { erreur: "L'assistant n'est pas configuré : clé OpenRouter manquante dans le .env." },
        { status: 500 }
      );
    }

    // ── 5. MOTS-CLÉS (journal de recherche) ─────────────────────────
    const motsCles = tokeniser(message);
    console.log("ASSISTANT mots-clés :", motsCles.join(", ") || "(aucun)");

    // ── 6. HISTORIQUE ENVOYÉ PAR LE FRONT (ordre déjà correct) ──────
    const brutHistorique = Array.isArray(corps?.historique)
      ? corps.historique
      : Array.isArray(corps?.messages)
        ? corps.messages
        : [];

    const historique = brutHistorique
      .slice(-7)
      .map((m: Record<string, unknown>) => ({
        role: m?.role === "assistant" ? "assistant" : "user",
        contenu: String(m?.contenu ?? m?.content ?? "").trim(),
      }))
      .filter((m: { role: string; contenu: string }) => m.contenu);

    // LOT 70 — la question courante était envoyée DEUX fois (dernier
    // élément de l'historique + message final) : gaspillage de jetons.
    // On la retire de l'historique — elle est réajoutée juste après.
    const dernierHistorique = historique[historique.length - 1];
    if (
      dernierHistorique &&
      dernierHistorique.role === "user" &&
      dernierHistorique.contenu === message
    ) {
      historique.pop();
    }

    // ── 6bis. CONTEXTE RÉEL DU SITE (lot 70) ────────────────────────
    // Fiches d'outils pertinentes + codes promo actifs, lus en base
    // à CHAQUE question : le catalogue évolue, l'assistant suit.
    const [fiches, reductions] = await Promise.all([
      blocFiches(message),
      blocReductions(),
    ]);
    const consigneSysteme = construireConsigne(fiches, reductions);

    const messagesApi = [
      { role: "system", content: consigneSysteme },
      ...historique.map((m: { role: string; contenu: string }) => ({
        role: m.role as "assistant" | "user",
        content: m.contenu,
      })),
      { role: "user", content: message },
    ];

    // ── 7. APPEL OPENROUTER — cascade de modèles gratuits ───────────
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
            | { choices?: Array<{ message?: { content?: string } }>; model?: string }
            | null;
          const candidat = donnees?.choices?.[0]?.message?.content ?? "";
          if (candidat.trim()) {
            texte = candidat;
            console.log("ASSISTANT modèle utilisé :", donnees?.model ?? modele);
            break; // ✅ un modèle a répondu
          }
          statutEchec = 502;
          detailEchec = `[${modele}] réponse 200 mais sans texte`;
          console.error("ASSISTANT :", detailEchec);
          continue;
        }

        // Erreur HTTP du modèle courant
        const corpsErreur = await reponseHttp.text();
        statutEchec = reponseHttp.status;
        detailEchec = `[${modele}] HTTP ${reponseHttp.status} : ${corpsErreur.slice(0, 300)}`;
        console.error("ASSISTANT :", detailEchec);
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
        console.error("ASSISTANT :", detailEchec);
        continue;
      }
    }

    if (!texte) {
      // ── 8. Aucun modèle n'a répondu → message précis en JSON ──────
      return NextResponse.json(
        { erreur: expliquerErreur(statutEchec, detailEchec, delaiDepasse) },
        { status: 502 }
      );
    }

    // ── 9. SAUVEGARDE EN BASE (lot 70 : 2 créations, ordre garanti) ─
    try {
      // Vérifie que la conversation appartient bien à l'utilisateur
      if (conversationId) {
        const conv = await prisma.conversation.findFirst({
          where: { id: conversationId, utilisateurId },
          select: { id: true },
        });
        if (!conv) conversationId = null;
      }

      // Sinon, crée une nouvelle conversation (titre = début du message)
      if (!conversationId) {
        const titre = message.slice(0, 60) || "Nouvelle conversation";
        const conv = await prisma.conversation.create({
          data: { utilisateurId, titre },
        });
        conversationId = conv.id;
        await journaliser(utilisateurId, "assistant", `Nouvelle conversation : ${titre}`);
      }

      // LOT 70 — question PUIS réponse, en DEUX créations successives
      // (et non plus un createMany) : chaque ligne reçoit son propre
      // horodatage → la relecture ne peut plus inverser la paire.
      await prisma.message.create({
        data: { conversationId, role: "user", contenu: message },
      });
      await prisma.message.create({
        data: { conversationId, role: "assistant", contenu: texte },
      });
    } catch (erreurDb) {
      // L'IA a répondu : ne pas faire échouer la requête pour la sauvegarde
      console.error("ASSISTANT : échec de sauvegarde :", erreurDb);
    }

    // ── 10. RÉPONSE (avec l'id de conversation + quota restant) ─────
    // La question qu'on vient de traiter sera comptée au prochain appel :
    // on affiche donc restantes - 1 (sans jamais descendre sous 0).
    const restantesAffichees =
      quota.restantes === null ? null : Math.max(0, quota.restantes - 1);

    return NextResponse.json({
      reponse: texte,
      conversationId,
      restantes: restantesAffichees,
    });
  } catch (error) {
    console.error("=== ERREUR ASSISTANT ===", error);
    const nom = error instanceof Error ? error.name : "";
    const messageErreur =
      nom === "TimeoutError"
        ? "L'assistant a mis trop de temps à répondre. Réessayez."
        : "L'assistant est momentanément indisponible. Réessayez dans un instant.";
    return NextResponse.json({ erreur: messageErreur }, { status: 502 });
  }
}

function expliquerErreur(status: number, detail: string, delai: boolean): string {
  const texte = detail.toLowerCase();
  if (status === 401)
    return "Clé OpenRouter invalide. Vérifiez OPENROUTER_API_KEY dans le .env (et dans Vercel → Settings → Environment Variables).";
  if (status === 402 || texte.includes("credit") || texte.includes("insufficient"))
    return "Ce modèle nécessite des crédits. Rechargez sur openrouter.ai/credits ou attendez la remise à jour de la limite gratuite.";
  if (status === 429)
    return "Limite du modèle gratuit atteinte. Attendez un instant puis réessayez.";
  if (status === 404 || texte.includes("no endpoints") || texte.includes("not found"))
    return "Aucun modèle gratuit n'a répondu — les modèles :free changent parfois. Vérifiez la liste à jour sur openrouter.ai/models (filtre « :free ») et adaptez OPENROUTER_MODELE ou la cascade.";
  if (delai || status === 504)
    return "L'assistant a mis trop de temps à répondre. Réessayez dans un instant.";
  if (status === 502 || status === 503)
    return "Le modèle est surchargé. Réessayez dans un instant.";
  return "L'assistant est momentanément indisponible. Réessayez dans un instant.";
}