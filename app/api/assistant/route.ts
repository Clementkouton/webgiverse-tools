// app/api/assistant/route.ts
import { NextRequest, NextResponse } from "next/server";
import { tokeniser } from "@/lib/assistant/contexte";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";
import { LIMITES_DECOUVERTE, quotaAssistant } from "@/lib/premium";

const MODELE = "openrouter/free";
const URL_API = "https://openrouter.ai/api/v1/chat/completions";

const CONSIGNE_SYSTEME = `Tu es l'assistant de Webgiverse, un annuaire francophone d'outils d'intelligence artificielle.
Ton rôle : aider l'utilisateur à trouver l'outil IA adapté à son besoin.
Règles :
- Réponds toujours en français, de façon concise (environ 100 mots maximum).
- Recommande uniquement des outils IA réels et connus (ChatGPT, Claude, Gemini, Midjourney, Canva, Notion AI, ElevenLabs, Runway, Perplexity, Gamma, CapCut...).
- Précise quand tu le sais si l'outil propose une offre gratuite.
- Propose 2 à 4 outils maximum, en liste courte : nom + une phrase d'explication.
- Si la question sort du sujet des outils IA, réponds brièvement et ramène vers le sujet.
- Ne mentionne jamais de clés API ni de détails techniques internes.`;

export async function POST(requete: NextRequest) {
  try {
    // ── 1. LECTURE DU CORPS ─────────────────────────────────────────
    const corpsBrut = await requete.text();
    console.log("ASSISTANT : corps brut reçu =", corpsBrut || "(CORPS VIDE)");
    const corps = JSON.parse(corpsBrut || "{}");

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

    // ── 4. CLÉ API ──────────────────────────────────────────────────
    const cleApi = process.env.OPENROUTER_API_KEY;
    if (!cleApi) {
      console.error("ASSISTANT : OPENROUTER_API_KEY absente du .env");
      return NextResponse.json(
        { erreur: "L'assistant n'est pas configuré : clé OpenRouter manquante dans le .env." },
        { status: 500 }
      );
    }

    // ── 5. MOTS-CLÉS ────────────────────────────────────────────────
    const motsCles = tokeniser(message);
    console.log("ASSISTANT mots-clés :", motsCles.join(", ") || "(aucun)");

    // ── 6. HISTORIQUE ENVOYÉ PAR LE FRONT ───────────────────────────
    const brutHistorique = Array.isArray(corps?.historique)
      ? corps.historique
      : Array.isArray(corps?.messages)
        ? corps.messages
        : [];

    const historique = brutHistorique
      .slice(-6)
      .map((m: Record<string, unknown>) => ({
        role: m?.role === "assistant" ? "assistant" : "user",
        contenu: String(m?.contenu ?? m?.content ?? "").trim(),
      }))
      .filter((m: { role: string; contenu: string }) => m.contenu);

    const messagesApi = [
      { role: "system", content: CONSIGNE_SYSTEME },
      ...historique.map((m: { role: string; contenu: string }) => ({
        role: m.role as "assistant" | "user",
        content: m.contenu,
      })),
      { role: "user", content: message },
    ];

    // ── 7. APPEL OPENROUTER ─────────────────────────────────────────
    const reponseHttp = await fetch(URL_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cleApi}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Webgiverse Outils IA",
      },
      body: JSON.stringify({ model: MODELE, max_tokens: 600, messages: messagesApi }),
      signal: AbortSignal.timeout(30000),
    });

    if (!reponseHttp.ok) {
      const texteErreur = await reponseHttp.text();
      console.error(`OPENROUTER ERREUR ${reponseHttp.status} : ${texteErreur}`);
      return NextResponse.json(
        { erreur: expliquerErreur(reponseHttp.status, texteErreur) },
        { status: 502 }
      );
    }

    const donnees = await reponseHttp.json();
    console.log("ASSISTANT modèle utilisé :", donnees?.model ?? "(inconnu)");
    const texte: string = donnees?.choices?.[0]?.message?.content ?? "";

    if (!texte) {
      console.error("OPENROUTER : réponse sans texte :", JSON.stringify(donnees));
      return NextResponse.json(
        { erreur: "L'assistant a renvoyé une réponse vide." },
        { status: 502 }
      );
    }

    // ── 8. SAUVEGARDE EN BASE (si utilisateur connecté) ─────────────
    if (utilisateurId) {
      try {
        // Le client Prisma généré n'expose pas ce modèle dans ses types.
        const conversations = (prisma as any).conversation;

        // Vérifie que la conversation appartient bien à l'utilisateur
        if (conversationId) {
          const conv = await conversations.findFirst({
            where: { id: conversationId, utilisateurId },
            select: { id: true },
          });
          if (!conv) conversationId = null;
        }

        // Sinon, crée une nouvelle conversation (titre = début du message)
        if (!conversationId) {
          const titre = message.slice(0, 60) || "Nouvelle conversation";
          const conv = await conversations.create({
            data: { utilisateurId, titre },
          });
          conversationId = conv.id;
          await journaliser(utilisateurId, "assistant", `Nouvelle conversation : ${titre}`);
        }

        // Enregistre l'échange : question + réponse
        await (prisma as any).message.createMany({
          data: [
            { conversationId, role: "user", contenu: message },
            { conversationId, role: "assistant", contenu: texte },
          ],
        });
      } catch (erreurDb) {
        // L'IA a répondu : ne pas faire échouer la requête pour la sauvegarde
        console.error("ASSISTANT : échec de sauvegarde :", erreurDb);
      }
    }

    // ── 9. RÉPONSE (avec l'id de conversation + quota restant) ──────
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
    const messageErreur =
      error instanceof Error && error.name === "TimeoutError"
        ? "L'assistant a mis trop de temps à répondre. Réessayez."
        : "L'assistant est momentanément indisponible. Réessayez dans un instant.";
    return NextResponse.json({ erreur: messageErreur }, { status: 502 });
  }
}

function expliquerErreur(status: number, texteErreur: string): string {
  const texte = texteErreur.toLowerCase();
  if (status === 401) return "Clé OpenRouter invalide. Vérifiez OPENROUTER_API_KEY dans le .env.";
  if (status === 402 || texte.includes("credit") || texte.includes("insufficient"))
    return "Ce modèle nécessite des crédits. Rechargez sur openrouter.ai/credits ou utilisez openrouter/free.";
  if (status === 404 || texte.includes("model"))
    return `Le modèle "${MODELE}" n'est pas disponible. Modifiez la constante MODELE.`;
  if (status === 429)
    return "Limite du modèle gratuit atteinte. Attendez un instant puis réessayez.";
  if (status === 502 || status === 503)
    return "Le modèle est surchargé. Réessayez dans un instant.";
  return "L'assistant est momentanément indisponible. Réessayez dans un instant.";
}