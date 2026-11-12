// app/api/admin/messages/reponse-ia/route.ts
// ─────────────────────────────────────────────────────────────────
// LOT 71 — L'ASSISTANT DE RÉDACTION DE LA MODÉRATION.
// L'admin ouvre un message de contact et clique « Générer avec
// l'assistant » : cette route relit le message EN BASE (jamais
// confiance au front), construit une consigne ancrée sur les VRAIES
// formules du site (1 semaine = 19 $, 1 mois = 49 $, activation sous
// 24 h ouvrées, critères d'acceptation) et sur les LIENS DE PAIEMENT
// Chariow configurés via l'environnement (CHARIOW_URL_SEMAINE /
// CHARIOW_URL_MOIS), puis demande à OpenRouter — la MÊME cascade de
// modèles gratuits que l'assistant public (lot 70) — de rédiger une
// réponse prête à envoyer.
//
//   • Réservé aux ADMIN (session + rôle vérifiés en base).
//   • AUCUN lien inventé : sans variable d'environnement, le modèle
//     écrit « [Lien de paiement à insérer] » à la place.
//   • Aucune sauvegarde : la suggestion remplit le formulaire, l'admin
//     la relit et la modifie avant l'envoi réel.
//   • Aucune migration, aucune dépendance nouvelle.
// ─────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tracerActionAdmin } from "@/lib/journal-admin";

// Durée maximale de la fonction sur Vercel (le plan Hobby accepte 60 s).
export const maxDuration = 60;

const URL_API = "https://openrouter.ai/api/v1/chat/completions";
// Cascade de modèles : le premier qui répond gagne (identique à la
// route de l'assistant public, lot 70). OPENROUTER_MODELE dans le .env
// permet de changer le modèle principal sans toucher au code.
const MODELES = Array.from(
  new Set(
    [
      process.env.OPENROUTER_MODELE?.trim() || "openrouter/free",
      "nvidia/nemotron-3-super-120b-a12b:free",
      "meta-llama/llama-3.3-70b-instruct:free",
    ].filter((m) => m.length > 0),
  ),
);
const MAX_TOKENS_REPONSE = 600;
const DELAI_PAR_MODELE_MS = 25000; // 25 s par modèle (60 s dispo côté Vercel)

// Mention écrite par le modèle QUAND aucun lien n'est configuré :
// l'admin la remplace ensuite via les boutons d'insertion du panneau.
const MENTION_LIEN_MANQUANT = "[Lien de paiement à insérer]";

/* ── Bloc « LIENS DE PAIEMENT » de la consigne ───────────────────── */
function blocLiens(): string {
  const semaine = process.env.CHARIOW_URL_SEMAINE?.trim() || "";
  const mois = process.env.CHARIOW_URL_MOIS?.trim() || "";
  if (!semaine && !mois) {
    return `- AUCUN lien de paiement n'est configuré : à l'endroit du paiement, écris exactement ${MENTION_LIEN_MANQUANT} (et jamais une URL inventée).`;
  }
  return [
    semaine
      ? `- LIEN DE PAIEMENT de la formule « À la une — 1 semaine ($19) » : ${semaine}`
      : `- Formule « À la une — 1 semaine ($19) » : lien non configuré → écris exactement ${MENTION_LIEN_MANQUANT} pour cette formule.`,
    mois
      ? `- LIEN DE PAIEMENT de la formule « À la une — 1 mois ($49) » : ${mois}`
      : `- Formule « À la une — 1 mois ($49) » : lien non configuré → écris exactement ${MENTION_LIEN_MANQUANT} pour cette formule.`,
  ].join("\n");
}

/* ── Consigne système : rédacteur de l'équipe Webgiverse ─────────── */
function construireConsigne(contact: {
  prenom: string;
  nom: string;
  email: string;
  sujet: string;
  texte: string;
}): string {
  return `Tu rédiges la réponse de l'équipe Webgiverse à un message reçu via le formulaire de contact du site. Webgiverse est l'annuaire francophone d'outils d'intelligence artificielle (signature de la marque : « Apprendre · Créer · Réussir »).

MESSAGE AUQUEL TU RÉPONDS
- Nom de l'expéditeur : ${contact.nom}
- Son e-mail : ${contact.email}
- Objet : ${contact.sujet}
- Contenu :
"""
 ${contact.texte}
"""

RÈGLES
- Écris UNIQUEMENT le corps de l'e-mail, prêt à envoyer : pas d'objet, pas de commentaire, pas de mise en forme Markdown (pas de ** ni de #).
- Français, ton chaleureux et professionnel, tutoiement (c'est le ton du site), 130 mots maximum.
- Commence par « Bonjour ${contact.prenom}, ». Termine par « À très vite,
L'équipe Webgiverse ».
- Ne réponds qu'à ce que dit le message. N'invente AUCUN prix, délai, fonctionnalité, code promo ni URL.
- DEMANDE DE MISE EN AVANT (annonceur) : les formules réelles du site sont « À la une — 1 semaine ($19) » (7 jours) et « À la une — 1 mois ($49) » (30 jours). Une fois le paiement reçu, la fiche rejoint « À la une » (accueil) sous 24 h ouvrées, avec priorité dans les alternatives et les outils populaires, lien direct vers le site, sans engagement ni reconduction. Si le message précise la formule (ex. « Formule souhaitée : À la une — 1 semaine ($19) »), confirme-la et résume ses avantages en une phrase ; sinon rappelle les deux formules avec leur prix exact. Termine par le paiement :
  - si le LIEN DE PAIEMENT de la formule choisie est fourni ci-dessous, écris-le EXACTEMENT tel quel (caractère pour caractère), sur sa propre ligne, précédé d'une invitation courte à payer ;
  - sinon écris exactement ${MENTION_LIEN_MANQUANT} sur sa propre ligne.
- PROBLÈME DE PAIEMENT OU D'ABONNEMENT : dis que tu regardes le dossier et invite à préciser l'e-mail du compte si besoin ; oriente vers la page /tarifs pour les plans et les moyens de paiement.
- BUG OU SUGGESTION (sujet « Signaler un bug ») : remercie sincèrement, dis que l'équipe prend le relais et répondra dès que c'est corrigé ou décidé.
- QUESTION SUR UN OUTIL OU AUTRE DEMANDE : réponds uniquement avec les informations réelles ci-dessous ; si tu ne sais pas, invite à préciser la question ou à explorer l'annuaire (page /outils). Un éditeur qui veut référencer un outil peut passer par /proposer.

INFORMATIONS RÉELLES DU SITE
- Formules de mise en avant (page /annonceurs) : « À la une — 1 semaine ($19) » (7 jours) ; « À la une — 1 mois ($49) » (30 jours). Paiement par lien sécurisé (carte bancaire via Chariow). Maximum 4 outils dans « À la une ». Activation sous 24 h ouvrées après paiement.
- Critères d'acceptation d'un outil : outil réel, fonctionnel, utilisable en français de préférence.
- Pages utiles à citer si besoin : /outils (annuaire), /proposer (référencer un outil), /annonceurs (mise en avant), /tarifs (abonnements).

LIENS DE PAIEMENT (à recopier tels quels, JAMAIS modifiés)
 ${blocLiens()}`;
}

/** Nettoyage léger : espaces de fin, balises de code éventuelles. */
function nettoyer(texte: string): string {
  let propre = texte.trim();
  if (propre.startsWith("```")) {
    propre = propre.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
  }
  return propre;
}

export async function POST(requete: NextRequest) {
  try {
    // ── 1. ADMIN UNIQUEMENT (session + rôle vérifiés en base) ───────
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { erreur: "Accès réservé aux administrateurs." },
        { status: 401 }
      );
    }
    const moi = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (moi?.role !== "ADMIN") {
      return NextResponse.json(
        { erreur: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }

    // ── 2. LECTURE DU CORPS ─────────────────────────────────────────
    const corps = (await requete.json().catch(() => ({}))) as {
      messageId?: unknown;
    };
    const id = typeof corps.messageId === "string" ? corps.messageId : "";
    if (!id) {
      return NextResponse.json({ erreur: "Message introuvable." }, { status: 400 });
    }

    // ── 3. LE MESSAGE EST RELU EN BASE (jamais confiance au front) ──
    const message = await prisma.messageContact.findUnique({
      where: { id },
      select: { nom: true, email: true, sujet: true, message: true },
    });
    if (!message) {
      return NextResponse.json(
        { erreur: "Ce message n'existe plus (déjà traité ou supprimé). Actualise la page." },
        { status: 404 }
      );
    }

    // ── 4. CLÉ OPENROUTER ───────────────────────────────────────────
    const cleApi = process.env.OPENROUTER_API_KEY;
    if (!cleApi) {
      console.error("REPONSE-IA : OPENROUTER_API_KEY absente du .env");
      return NextResponse.json(
        { erreur: "Assistant non configuré : ajoute OPENROUTER_API_KEY dans les variables d'environnement." },
        { status: 500 }
      );
    }

    // ── 5. CONSIGNE SYSTÈME ANCRÉE SUR LE SITE ──────────────────────
    const prenom = message.nom.trim().split(/\s+/)[0] || message.nom.trim();
    const consigneSysteme = construireConsigne({
      prenom,
      nom: message.nom,
      email: message.email,
      sujet: message.sujet,
      texte: message.message.slice(0, 2500),
    });

    // ── 6. APPEL OPENROUTER — cascade de modèles gratuits ───────────
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
            messages: [
              { role: "system", content: consigneSysteme },
              {
                role: "user",
                content: "Rédige la réponse au message ci-dessus, en suivant toutes les règles.",
              },
            ],
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
            console.log("REPONSE-IA modèle utilisé :", donnees?.model ?? modele);
            break; // ✅ un modèle a répondu
          }
          statutEchec = 502;
          detailEchec = `[${modele}] réponse 200 mais sans texte`;
          console.error("REPONSE-IA :", detailEchec);
          continue;
        }

        const corpsErreur = await reponseHttp.text();
        statutEchec = reponseHttp.status;
        detailEchec = `[${modele}] HTTP ${reponseHttp.status} : ${corpsErreur.slice(0, 300)}`;
        console.error("REPONSE-IA :", detailEchec);
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
        console.error("REPONSE-IA :", detailEchec);
        continue;
      }
    }

    if (!texte) {
      return NextResponse.json(
        { erreur: expliquerErreur(statutEchec, detailEchec, delaiDepasse) },
        { status: 502 }
      );
    }

    // ── 7. TRACE D'AUDIT (feu et oubli) ─────────────────────────────
    await tracerActionAdmin({
      action: "CONTACT_REPONSE_IA",
      cible: `Contact : ${message.sujet} (${message.email})`,
      details: "Brouillon de réponse généré par l'assistant.",
    });

    // ── 8. RÉPONSE (le front remplit le formulaire) ─────────────────
    return NextResponse.json({ suggestion: nettoyer(texte) });
  } catch (error) {
    console.error("=== ERREUR REPONSE-IA ===", error);
    const nom = error instanceof Error ? error.name : "";
    const messageErreur =
      nom === "TimeoutError"
        ? "L'assistant a mis trop de temps à rédiger. Réessaie."
        : "L'assistant est momentanément indisponible. Réessaie dans un instant.";
    return NextResponse.json({ erreur: messageErreur }, { status: 502 });
  }
}

function expliquerErreur(status: number, detail: string, delai: boolean): string {
  const texte = detail.toLowerCase();
  if (status === 401)
    return "Clé OpenRouter invalide. Vérifie OPENROUTER_API_KEY dans Vercel → Settings → Environment Variables.";
  if (status === 402 || texte.includes("credit") || texte.includes("insufficient"))
    return "Ce modèle nécessite des crédits. Recharge sur openrouter.ai/credits ou attends la remise à jour de la limite gratuite.";
  if (status === 429)
    return "Limite du modèle gratuit atteinte. Attends un instant puis réessaie.";
  if (status === 404 || texte.includes("no endpoints") || texte.includes("not found"))
    return "Aucun modèle gratuit n'a répondu — définis OPENROUTER_MODELE dans le .env avec un modèle gratuit de openrouter.ai/models (filtre « :free »).";
  if (delai || status === 504)
    return "L'assistant a mis trop de temps à rédiger. Réessaie dans un instant.";
  if (status === 502 || status === 503)
    return "Le modèle est surchargé. Réessaie dans un instant.";
  return "L'assistant est momentanément indisponible. Réessaie dans un instant.";
}