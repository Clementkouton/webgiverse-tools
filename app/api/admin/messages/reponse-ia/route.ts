// app/api/admin/messages/reponse-ia/route.ts
// ─────────────────────────────────────────────────────────────────
// LOT 71 — L'ASSISTANT DE RÉDACTION DE LA MODÉRATION.
// LOT 72 — CORRECTIFS DE ROBUSTESSE (après l'anomalie « l'assistant
// n'a pas réussi à rédiger une réponse ») :
//   1. le fichier DOIT vivre ici : app/api/admin/messages/reponse-ia/
//      route.ts (dans le dossier app/API — s'il est posé directement
//      sous app/admin/, l'URL /api/admin/messages/reponse-ia renvoie
//      une 404 et le panneau affiche l'erreur générique) ;
//   2. BUDGET DE TEMPS : 15 s max par modèle et 40 s au total, pour
//      rester sous les 60 s de Vercel (3 modèles × 25 s pouvaient
//      dépasser le plafond du plan Hobby → fonction tuée → réponse
//      HTML illisible pour le panneau) ;
//   3. BROUILLON DE SECOURS : si l'IA échoue (modèles saturés, clé
//      absente…), la route renvoie quand même un brouillon utilisable
//      construit à partir du VRAI message (formule détectée, lien de
//      paiement Chariow réel ou « [Lien de paiement à insérer] »),
//      avec source: "gabarit" — le panneau affiche un bandeau et
//      l'admin relit avant d'envoyer. Plus jamais d'impasse.
//
//   • Réservé aux ADMIN (session + rôle vérifiés en base).
//   • AUCUN lien inventé : sans variable d'environnement, le gabarit
//     écrit « [Lien de paiement à insérer] » à la place.
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
const DELAI_PAR_MODELE_MS = 15000; // LOT 72 : 15 s par modèle (était 25 s)
const BUDGET_GLOBAL_MS = 40000; // LOT 72 : on ne DÉMARRE plus de modèle après 40 s

// Mention écrite QUAND aucun lien n'est configuré : l'admin la remplace
// ensuite via les boutons d'insertion du panneau.
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

/* ═══════════════════════════════════════════════════════════════════
   LOT 72 — BROUILLON DE SECOURS (sans IA)
   Construit à partir du VRAI message : la formule y est détectée
   (le formulaire annonceur écrit « Formule souhaitée : À la une — … »)
   et le lien de paiement réel est inséré s'il est configuré.
   ═══════════════════════════════════════════════════════════════════ */
const RX_FORMULE_SEMAINE = /À la une\s*—\s*1 semaine\s*\(\$19\)/i;
const RX_FORMULE_MOIS = /À la une\s*—\s*1 mois\s*\(\$49\)/i;

function brouillonSecours(contact: { prenom: string; sujet: string; texte: string }): string {
  const annonceur =
    /^Demande mise en avant/i.test(contact.sujet.trim()) ||
    RX_FORMULE_SEMAINE.test(contact.texte) ||
    RX_FORMULE_MOIS.test(contact.texte);

  if (!annonceur) {
    return `Bonjour ${contact.prenom},

Merci pour ton message ! On l'a bien reçu et l'équipe revient vers toi très vite avec une réponse détaillée.

À très vite,
L'équipe Webgiverse`;
  }

  const semaine = RX_FORMULE_SEMAINE.test(contact.texte);
  const mois = RX_FORMULE_MOIS.test(contact.texte);

  // Formule non précisée (ou les deux) : on rappelle les deux formules.
  if (semaine === mois) {
    return `Bonjour ${contact.prenom},

Merci pour ta demande de mise en avant ! Les formules sont « À la une — 1 semaine ($19) » (7 jours) et « À la une — 1 mois ($49) » (30 jours) : diffusion sur l'accueil sous 24 h ouvrées après paiement, lien direct vers ton site, sans engagement ni reconduction.

Confirme simplement la formule souhaitée et je t'envoie aussitôt le lien de paiement sécurisé.

À très vite,
L'équipe Webgiverse`;
  }

  // Formule précise détectée : on confirme et on donne le lien réel.
  const formule = semaine ? "« À la une — 1 semaine ($19) »" : "« À la une — 1 mois ($49) »";
  const duree = semaine ? "7 jours de diffusion" : "30 jours de diffusion";
  const lien = semaine
    ? process.env.CHARIOW_URL_SEMAINE?.trim() || MENTION_LIEN_MANQUANT
    : process.env.CHARIOW_URL_MOIS?.trim() || MENTION_LIEN_MANQUANT;

  return `Bonjour ${contact.prenom},

Merci pour ta demande de mise en avant ! Ta formule ${formule} est bien notée : dès la réception du paiement, ta fiche rejoint « À la une » sur l'accueil sous 24 h ouvrées — ${duree}, lien direct vers ton site, sans engagement ni reconduction.

Pour activer la diffusion, voici le lien de paiement sécurisé :
 ${lien}

Dès que c'est réglé, on met tout en place. Une question ? Réponds directement à cet e-mail.

À très vite,
L'équipe Webgiverse`;
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

    const prenom = message.nom.trim().split(/\s+/)[0] || message.nom.trim();

    // ── 4. CLÉ OPENROUTER (absente → brouillon de secours) ──────────
    const cleApi = process.env.OPENROUTER_API_KEY;
    if (!cleApi) {
      console.error("REPONSE-IA : OPENROUTER_API_KEY absente du .env");
      const suggestion = brouillonSecours({ prenom, sujet: message.sujet, texte: message.message });
      await tracerActionAdmin({
        action: "CONTACT_REPONSE_IA",
        cible: `Contact : ${message.sujet} (${message.email})`,
        details: "Brouillon de secours (OPENROUTER_API_KEY absente).",
      });
      return NextResponse.json({
        suggestion,
        source: "gabarit",
        raison:
          "Assistant non configuré : ajoute OPENROUTER_API_KEY dans les variables d'environnement.",
      });
    }

    // ── 5. CONSIGNE SYSTÈME ANCRÉE SUR LE SITE ──────────────────────
    const consigneSysteme = construireConsigne({
      prenom,
      nom: message.nom,
      email: message.email,
      sujet: message.sujet,
      texte: message.message.slice(0, 2500),
    });

    // ── 6. APPEL OPENROUTER — cascade + budget de temps global ──────
    let texte = "";
    let statutEchec = 0;
    let detailEchec = "";
    let delaiDepasse = false;
    const depart = Date.now();

    for (const modele of MODELES) {
      // LOT 72 — on ne DÉMARRE plus de modèle si le budget global est
      // épuisé (Vercel tue la fonction à 60 s : autant renvoyer le
      // brouillon de secours tout de suite).
      if (Date.now() - depart > BUDGET_GLOBAL_MS) {
        statutEchec = statutEchec || 504;
        detailEchec = detailEchec || `budget global de ${BUDGET_GLOBAL_MS / 1000} s dépassé`;
        console.error("REPONSE-IA :", detailEchec);
        break;
      }

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

    // ── 7. IA EN ÉCHEC → BROUILLON DE SECOURS (jamais d'impasse) ────
    if (!texte) {
      const raison = expliquerErreur(statutEchec, detailEchec, delaiDepasse);
      const suggestion = brouillonSecours({ prenom, sujet: message.sujet, texte: message.message });
      console.error("REPONSE-IA : brouillon de secours fourni —", raison);
      await tracerActionAdmin({
        action: "CONTACT_REPONSE_IA",
        cible: `Contact : ${message.sujet} (${message.email})`,
        details: `Brouillon de secours (IA indisponible) — ${raison}`.slice(0, 2000),
      });
      return NextResponse.json({ suggestion, source: "gabarit", raison });
    }

    // ── 8. TRACE D'AUDIT (feu et oubli) ─────────────────────────────
    await tracerActionAdmin({
      action: "CONTACT_REPONSE_IA",
      cible: `Contact : ${message.sujet} (${message.email})`,
      details: "Brouillon de réponse généré par l'assistant.",
    });

    // ── 9. RÉPONSE (le front remplit le formulaire) ─────────────────
    return NextResponse.json({ suggestion: nettoyer(texte), source: "modele" });
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
    return "L'assistant a mis trop de temps à rédiger (modèles saturés). Réessaie dans un instant.";
  if (status === 502 || status === 503)
    return "Le modèle est surchargé. Réessaie dans un instant.";
  return "L'assistant est momentanément indisponible. Réessaie dans un instant.";
}