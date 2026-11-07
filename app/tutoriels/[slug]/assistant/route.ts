// app/api/tutoriels/[slug]/assistant/route.ts
// Lot 35 — API de l'ASSISTANT IA DU TUTORIEL (résumé + questions/réponses).
// · Connecté obligatoire ; capacité « assistantTuto » re-vérifiée ICI
//   côté serveur : un appel direct par un non-abonné est refusé.
// · Ancré sur le CONTENU DU TUTORIEL (titre, niveau, durée, outils +
//   description raffinée du lot 28/31). Réutilise OpenRouter.
// · Conversation éphémère : pas d'écriture en base.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";
import { accesTutoriels } from "@/lib/acces-tutoriels";
import { parserDescriptionRaffinee } from "@/lib/description-youtube";
import { formaterDuree, NIVEAUX } from "@/lib/tutos-utils";

const MODELE = "openrouter/free";
const URL_API = "https://openrouter.ai/api/v1/chat/completions";
const MAX_MESSAGE = 1000; // caractères
const MAX_HISTORIQUE = 6; // messages renvoyés par le front

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
      | { message?: unknown; historique?: unknown }
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

    // ── 3. Le tutoriel existe-t-il ? ────────────────────────────────
    const { slug } = await params;
    const tuto = await prisma.tuto.findUnique({
      where: { slug },
      select: {
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

    // ── 4. Historique renvoyé par le front (6 derniers, assaini) ────
    const historique = Array.isArray(corps?.historique)
      ? (corps.historique as unknown[])
          .slice(-MAX_HISTORIQUE)
          .map((m) => {
            const entree = m as { role?: unknown; contenu?: unknown };
            return {
              role: entree?.role === "assistant" ? ("assistant" as const) : ("user" as const),
              contenu: typeof entree?.contenu === "string" ? entree.contenu.slice(0, 1500).trim() : "",
            };
          })
          .filter((m) => m.contenu.length > 0)
      : [];

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

    // ── 7. Appel OpenRouter (même config que l'assistant global) ────
    const reponseHttp = await fetch(URL_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cleApi}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Webgiverse Outils IA",
      },
      body: JSON.stringify({ model: MODELE, max_tokens: 700, messages: messagesApi }),
      signal: AbortSignal.timeout(30000),
    });

    if (!reponseHttp.ok) {
      const texteErreur = await reponseHttp.text();
      console.error(`ASSISTANT TUTO : erreur OpenRouter ${reponseHttp.status} : ${texteErreur}`);
      return NextResponse.json({ erreur: expliquerErreur(reponseHttp.status, texteErreur) }, { status: 502 });
    }

    const donnees = (await reponseHttp.json().catch(() => null)) as
      | { choices?: Array<{ message?: { content?: string } }> }
      | null;
    const texte: string = donnees?.choices?.[0]?.message?.content ?? "";
    if (!texte) {
      console.error("ASSISTANT TUTO : réponse OpenRouter sans texte");
      return NextResponse.json(
        { erreur: "L'assistant a renvoyé une réponse vide — réessaie dans un instant." },
        { status: 502 },
      );
    }

    // ── 8. Journal (jamais bloquant) ────────────────────────────────
    await journaliser(utilisateurId, "assistant_tuto", slug);

    return NextResponse.json({ reponse: texte });
  } catch (erreur) {
    console.error("=== ERREUR ASSISTANT TUTO ===", erreur);
    const messageErreur =
      erreur instanceof Error && erreur.name === "TimeoutError"
        ? "L'assistant a mis trop de temps à répondre. Réessaie."
        : "L'assistant est momentanément indisponible. Réessaie dans un instant.";
    return NextResponse.json({ erreur: messageErreur }, { status: 502 });
  }
}

function expliquerErreur(status: number, texteErreur: string): string {
  const texte = texteErreur.toLowerCase();
  if (status === 401) return "Clé OpenRouter invalide. Vérifie OPENROUTER_API_KEY dans le .env.";
  if (status === 402 || texte.includes("credit") || texte.includes("insufficient"))
    return "Ce modèle nécessite des crédits. Recharge sur openrouter.ai/credits ou utilise openrouter/free.";
  if (status === 404 || texte.includes("model"))
    return `Le modèle "${MODELE}" n'est pas disponible. Modifie la constante MODELE.`;
  if (status === 429)
    return "Limite du modèle gratuit atteinte. Attends un instant puis réessaie.";
  if (status === 502 || status === 503)
    return "Le modèle est surchargé. Réessaie dans un instant.";
  return "L'assistant est momentanément indisponible. Réessaie dans un instant.";
}