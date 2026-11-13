// app/api/admin/ia/route.ts
// ─────────────────────────────────────────────────────────────────
// Lot 88 — L'ASSISTANT IA DE L'ADMIN (articles de blog).
// C'était la route MANQUANTE : le formulaire admin appelait
// POST /api/admin/ia depuis le Lot 25, mais le fichier n'existait
// jamais → Next renvoyait sa page HTML 404 et le front plantait avec
// « Unexpected token '<', "<!DOCTYPE"… is not valid JSON ».
//
// 4 TÂCHES (tâche = `tache` dans le corps JSON) :
//   • extrait   → résumé de 1 à 2 phrases (20–300 caractères)
//   • titres    → 3 propositions de titres, une par ligne
//   • motsCles  → 15 à 20 mots-clés SEO secondaires, à virgules
//   • ameliorer → réécriture enrichie du CONTENU HTML de l'article,
//                 avec le ton choisi (persuasif, professionnel,
//                 engageant, simple). Le HTML renvoyé est assaini
//                 (sanitize-html, même filtre que l'enregistrement).
//
// Sécurité (mêmes garde-fous que les autres routes admin) :
//   • réservé aux admins (session + rôle vérifié EN BASE) ;
//   • limite de débit : 30 appels IA par admin et par heure ;
//   • réponse TOUJOURS en JSON (plus jamais de page HTML au front) ;
//   • cascade de modèles OpenRouter gratuits (comme l'assistant des
//     tutoriels, Lot 73) — le premier qui répond gagne ;
//   • chaque appel réussi est tracé dans le journal admin.
// ─────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { autoriserRequete } from "@/lib/limitation-debit";
import { tracerActionAdmin } from "@/lib/journal-admin";
import { nettoyerHtml } from "@/lib/html";

// Vercel Hobby : 60 s maximum par appel (l'IA peut être lente).
export const maxDuration = 60;

const URL_API = "https://openrouter.ai/api/v1/chat/completions";

// Même cascade que l'assistant des tutoriels (Lot 73, actualisée) :
// le modèle principal est remplaçable via OPENROUTER_MODELE dans le .env.
const MODELES = Array.from(
  new Set(
    [
      process.env.OPENROUTER_MODELE?.trim() || "google/gemma-4-31b-it:free",
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "nvidia/nemotron-3.5-lightning:free",
    ].filter((m) => m.length > 0),
  ),
);

const APPELS_MAX_PAR_HEURE = 30; // par admin — protège le quota OpenRouter
const DELAI_PAR_MODELE_MS = 25_000; // 25 s par modèle, 60 s dispo au total
const MAX_TOKENS_TEXTE = 700; // extrait / titres / mots-clés
const MAX_TOKENS_CONTENU = 3000; // réécriture complète de l'article
const MAX_TAILLE_TEXTE = 8_000; // texte analysé pour extrait / titres / mots-clés
const MAX_TAILLE_CONTENU = 15_000; // HTML envoyé pour l'amélioration

const TONS_AUTORISES = ["persuasif", "professionnel", "engageant", "simple"] as const;
type Ton = (typeof TONS_AUTORISES)[number];

/** Description du ton attendu, injectée dans la consigne système. */
const CONSIGNE_TON: Record<Ton, string> = {
  persuasif:
    "Ton PERSUASIF : phrases qui convainquent, bénéfices concrets mis en avant, appels à l'action naturels. Le lecteur doit avoir envie d'essayer les outils mentionnés.",
  professionnel:
    "Ton PROFESSIONNEL : vocabulaire précis, phrases posées, aucune familiarité. Style d'expert reconnu du secteur.",
  engageant:
    "Ton ENGAGEANT : tutoiement chaleureux, questions directes au lecteur, exemples du quotidien. Style de blog vivant et accessible.",
  simple:
    "Ton SIMPLE : mots courants, phrases courtes, concepts expliqués sans jargon. Compréhensible par un grand débutant.",
};

type TacheIa = "extrait" | "titres" | "motsCles" | "ameliorer";

export async function POST(requete: Request) {
  try {
    // ── 1. Accès réservé aux admins (session + rôle EN BASE) ────────
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, erreur: "Non connecté." }, { status: 401 });
    }
    const moi = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (moi?.role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, erreur: "Accès réservé aux administrateurs." },
        { status: 403 },
      );
    }

    // ── 2. Limite de débit (coûts OpenRouter) ────────────────────────
    if (!autoriserRequete(`assistant-admin-ia:${session.user.id}`, APPELS_MAX_PAR_HEURE, 60 * 60_000)) {
      return NextResponse.json(
        { ok: false, erreur: "Limite de 30 appels IA par heure atteinte. Réessaie dans un moment." },
        { status: 429 },
      );
    }

    // ── 3. Corps de la requête (toujours tolérant) ──────────────────
    const corps = (await requete.json().catch(() => null)) as
      | { tache?: unknown; titre?: unknown; texte?: unknown; contenu?: unknown; ton?: unknown }
      | null;

    const tache = typeof corps?.tache === "string" ? (corps.tache as TacheIa) : "";
    if (!["extrait", "titres", "motsCles", "ameliorer"].includes(tache)) {
      return NextResponse.json({ ok: false, erreur: "Tâche IA inconnue." }, { status: 400 });
    }

    const titre =
      typeof corps?.titre === "string" ? corps.titre.trim().slice(0, 200) : "";
    const texteSource =
      typeof corps?.texte === "string" ? corps.texte.trim().slice(0, MAX_TAILLE_TEXTE) : "";
    const contenu =
      typeof corps?.contenu === "string" ? corps.contenu.trim().slice(0, MAX_TAILLE_CONTENU) : "";
    const ton: Ton = TONS_AUTORISES.includes(corps?.ton as Ton)
      ? (corps?.ton as Ton)
      : "persuasif";

    // Il faut de la matière : titre + contenu texte pour les tâches
    // « texte », ou du contenu HTML pour la réécriture.
    if (tache === "ameliorer") {
      if (contenu.replace(/<[^>]*>/g, " ").trim().length < 50) {
        return NextResponse.json(
          { ok: false, erreur: "Écris d'abord ton article (au moins quelques phrases) avant de demander une amélioration." },
          { status: 400 },
        );
      }
    } else if (texteSource.length < 20 && titre.length < 4) {
      return NextResponse.json(
        { ok: false, erreur: "Donne un titre ou écris le début de l'article pour guider l'IA." },
        { status: 400 },
      );
    }

    // ── 4. Clé OpenRouter ───────────────────────────────────────────
    const cleApi = process.env.OPENROUTER_API_KEY;
    if (!cleApi) {
      console.error("ASSISTANT ADMIN : OPENROUTER_API_KEY absente du .env");
      return NextResponse.json(
        { ok: false, erreur: "L'assistant n'est pas configuré : clé OpenRouter manquante (OPENROUTER_API_KEY dans le .env / Variables Vercel)." },
        { status: 500 },
      );
    }

    // ── 5. Consignes par tâche ──────────────────────────────────────
    let consigneSysteme = "";
    let messageUtilisateur = "";

    if (tache === "extrait") {
      consigneSysteme = `Tu es l'éditeur en chef du blog Webgiverse, annuaire francophone d'outils d'intelligence artificielle.
Rédige le RÉSUMÉ de l'article fourni : une ou deux phrases en français, entre 60 et 280 caractères, qui donne envie de lire la suite.
Règles : ne commence JAMAIS par « Cet article » ni « Ce tutoriel » ; va droit au bénéfice du lecteur ; aucune invention ; réponds UNIQUEMENT avec le résumé, sans guillemets ni préambule.`;
      messageUtilisateur = `TITRE : ${titre || "(sans titre)"}\n\nCONTENU :\n${texteSource || "(vide)"}`;
    } else if (tache === "titres") {
      consigneSysteme = `Tu es l'éditeur en chef du blog Webgiverse, annuaire francophone d'outils d'intelligence artificielle.
Propose 3 TITRES alternatifs pour l'article fourni : accrocheurs, clairs, orientés bénéfice lecteur, 80 caractères maximum chacun.
Réponds UNIQUEMENT avec les 3 titres : une ligne par titre, sans numérotation, sans tiret, sans guillemets, sans commentaire.`;
      messageUtilisateur = `TITRE ACTUEL : ${titre || "(sans titre)"}\n\nCONTENU :\n${texteSource || "(vide)"}`;
    } else if (tache === "motsCles") {
      consigneSysteme = `Tu es un consultant SEO spécialisé dans l'intelligence artificielle.
Propose une liste de 15 à 20 MOTS-CLÉS SEO SECONDAIRES pour l'article fourni : requêtes longue traîne et variantes naturelles que taperaient les internautes français (ex : « meilleur outil IA gratuit pour rédiger », « alternative gratuite à ChatGPT »).
Réponds UNIQUEMENT avec les mots-clés : séparés par des virgules, en minuscules, sans numérotation, sans commentaire.`;
      messageUtilisateur = `TITRE : ${titre || "(sans titre)"}\n\nCONTENU :\n${texteSource || "(vide)"}`;
    } else {
      // ameliorer — réécriture enrichie du contenu HTML
      consigneSysteme = `Tu es un rédacteur web senior du blog Webgiverse, annuaire francophone d'outils d'intelligence artificielle.
AMÉLIORE et ENRICHIS l'article HTML fourni, sans en changer le sens ni inventer de faits, chiffres, noms d'outils ou liens.
 ${CONSIGNE_TON[ton]}
Attendus : une intro accrocheuse, des sous-titres <h2> pour structurer, des paragraphes <p> développés, des listes <ul>/<li> quand c'est utile, des transitions fluides, une conclusion qui invite à passer à l'action, et quelques mots en <strong> sur les points clés.
Format de réponse STRICT : UNIQUEMENT du HTML simple utilisant seulement <p>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em> — sans markdown, sans balise <html>/<body>, sans commentaire ni explication.`;
      messageUtilisateur = `TITRE : ${titre || "(sans titre)"}\n\nARTICLE HTML À AMÉLIORER :\n${contenu}`;
    }

    // ── 6. Appel OpenRouter — cascade de modèles gratuits ───────────
    let reponseIa = "";
    let statutEchec = 0;
    let detailEchec = "";

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
            max_tokens: tache === "ameliorer" ? MAX_TOKENS_CONTENU : MAX_TOKENS_TEXTE,
            messages: [
              { role: "system", content: consigneSysteme },
              { role: "user", content: messageUtilisateur },
            ],
          }),
          signal: AbortSignal.timeout(DELAI_PAR_MODELE_MS),
        });

        if (reponseHttp.ok) {
          const donnees = (await reponseHttp.json().catch(() => null)) as
            | { choices?: Array<{ message?: { content?: string } }> }
            | null;
          const candidat = donnees?.choices?.[0]?.message?.content ?? "";
          if (candidat.trim()) {
            reponseIa = candidat.trim();
            break; // un modèle a répondu
          }
          statutEchec = 502;
          detailEchec = `[${modele}] réponse 200 mais sans texte`;
          console.error("ASSISTANT ADMIN :", detailEchec);
          continue;
        }

        const corpsErreur = await reponseHttp.text();
        statutEchec = reponseHttp.status;
        detailEchec = `[${modele}] HTTP ${reponseHttp.status} : ${corpsErreur.slice(0, 300)}`;
        console.error("ASSISTANT ADMIN :", detailEchec);
        if (reponseHttp.status === 401) break; // clé invalide : inutile d'insister
      } catch (erreurModele) {
        const nom = erreurModele instanceof Error ? erreurModele.name : "Erreur";
        if (nom === "TimeoutError" || nom === "AbortError") {
          statutEchec = 504;
          detailEchec = `[${modele}] délai de ${DELAI_PAR_MODELE_MS / 1000} s dépassé`;
        } else {
          statutEchec = 502;
          detailEchec = `[${modele}] erreur réseau : ${String(erreurModele).slice(0, 200)}`;
        }
        console.error("ASSISTANT ADMIN :", detailEchec);
        continue;
      }
    }

    if (!reponseIa) {
      return NextResponse.json(
        {
          ok: false,
          erreur:
            statutEchec === 401
              ? "Clé OpenRouter refusée (401) : vérifie OPENROUTER_API_KEY."
              : statutEchec === 504
                ? "L'IA n'a pas répondu à temps. Réessaie dans un instant."
                : "Aucun modèle IA n'a répondu. Réessaie dans un instant (détail dans les logs Vercel).",
        },
        { status: 502 },
      );
    }

    // ── 7. Mise en forme de la réponse selon la tâche ───────────────
    if (tache === "ameliorer") {
      // Le HTML de l'IA est assaini avec la MÊME liste blanche que
      // l'enregistrement des articles (sanitize-html, Lot 82).
      const htmlPropre = nettoyerHtml(reponseIa);
      if (htmlPropre.replace(/<[^>]*>/g, " ").trim().length < 50) {
        return NextResponse.json(
          { ok: false, erreur: "La réponse de l'IA était vide après nettoyage. Réessaie." },
          { status: 502 },
        );
      }
      await tracerActionAdmin({
        action: "IA_ARTICLE_AMELIORE",
        cible: `Article : ${titre || "(sans titre)"}`,
        details: `ton : ${ton} · ${htmlPropre.length} caractères générés`,
      });
      return NextResponse.json({ ok: true, resultat: htmlPropre });
    }

    if (tache === "extrait") {
      // Résumé propre : sans guillemets d'habillage, coupé à 300.
      const resume = reponseIa.replace(/^["«»\s]+|["«»\s]+$/g, "").slice(0, 300);
      await tracerActionAdmin({
        action: "IA_EXTRAIT",
        cible: `Article : ${titre || "(sans titre)"}`,
        details: `${resume.length} caractères générés`,
      });
      return NextResponse.json({ ok: true, resultat: resume });
    }

    // titres / motsCles : nettoyage simple des lignes vides et puces
    const lignes = reponseIa
      .split("\n")
      .map((l) => l.replace(/^[-*•\d.)\s"«»]+/, "").replace(/["«»]+$/, "").trim())
      .filter(Boolean);

    if (tache === "titres") {
      const titres = lignes.slice(0, 3);
      if (titres.length === 0) {
        return NextResponse.json(
          { ok: false, erreur: "L'IA n'a proposé aucun titre exploitable. Réessaie." },
          { status: 502 },
        );
      }
      await tracerActionAdmin({
        action: "IA_TITRES",
        cible: `Article : ${titre || "(sans titre)"}`,
        details: `${titres.length} titres proposés`,
      });
      return NextResponse.json({ ok: true, resultat: titres.join("\n") });
    }

    // motsCles : on normalise en une ligne à virgules (max 400 caractères)
    const motsCles = lignes
      .flatMap((l) => l.split(/[,;]/))
      .map((m) => m.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 20)
      .join(", ")
      .slice(0, 400);
    if (!motsCles) {
      return NextResponse.json(
        { ok: false, erreur: "L'IA n'a proposé aucun mot-clé exploitable. Réessaie." },
        { status: 502 },
      );
    }
    await tracerActionAdmin({
      action: "IA_MOTS_CLES",
      cible: `Article : ${titre || "(sans titre)"}`,
      details: `${motsCles.split(",").length} mots-clés générés`,
    });
    return NextResponse.json({ ok: true, resultat: motsCles });
  } catch (erreur) {
    console.error("ASSISTANT ADMIN : erreur inattendue :", erreur);
    return NextResponse.json(
      { ok: false, erreur: "Erreur inattendue de l'assistant IA. Réessaie dans un instant." },
      { status: 500 },
    );
  }
}