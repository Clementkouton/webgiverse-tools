// scripts/seed-tutos.ts
// Lot 12 — seed initial de la collection de tutoriels vidéo IA
// (données réelles extraites de la page Aixploria : titres, durées,
// niveaux, tags d'outils, popularité et ordre de pertinence).
// IDEMPOTENT : relançable sans créer de doublons (upsert par slug).
// Les IDs YouTube ne sont PAS touchés par ce script : ils seront
// complétés par scripts/migrer-tutos.ts avec le JSON du script console.
//
// Lancement (après « npx prisma db push ») :
//   npx tsx scripts/seed-tutos.ts

import { PrismaClient } from "@prisma/client";
import { slugifierTuto } from "../lib/tutos-utils";

const prisma = new PrismaClient();
// Keep this seed usable when the generated Prisma client is stale.
const tuto = (prisma as unknown as {
  tuto: {
    upsert: (args: any) => Promise<unknown>;
    count: () => Promise<number>;
  };
}).tuto;

type TutoSeed = {
  titre: string;
  dureeMin: number;
  niveau: "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE";
  outils: string[];
  vues: number;
  nouveau?: boolean;
};

const TUTOS: TutoSeed[] = [
  { titre: "ChatGPT : Comment Rédiger un bon Prompt en 2026 ?", dureeMin: 32, niveau: "DEBUTANT", outils: ["ChatGPT", "Prompt", "OpenAI"], vues: 7288 },
  { titre: "Google Gemini : Le Guide Ultime | Tutoriel pour débutants", dureeMin: 26, niveau: "DEBUTANT", outils: ["Gemini", "Google", "IA"], vues: 6952 },
  { titre: "Comment utiliser Google Veo 3 comme un PRO : le prompt JSON (le seul guide dont tu as besoin)", dureeMin: 12, niveau: "DEBUTANT", outils: ["Veo", "Google", "Vidéo"], vues: 8365 },
  { titre: "Claude Cowork : La méthode complète (vous loupez le meilleur de l'IA !!)", dureeMin: 94, niveau: "INTERMEDIAIRE", outils: ["Claude", "Cowork", "Anthropic"], vues: 10002 },
  { titre: "Tutoriel Canva 2026 pour les débutants - Découvrir l'interface et prendre en main l'outil pas à pas", dureeMin: 25, niveau: "DEBUTANT", outils: ["Canva", "Design"], vues: 6599 },
  { titre: "ChatGPT : 10 min pour le MAITRISER en 2026", dureeMin: 11, niveau: "DEBUTANT", outils: ["ChatGPT", "OpenAI"], vues: 9123 },
  { titre: "Claude Design : le guide complet pour les non designers (2026)", dureeMin: 25, niveau: "INTERMEDIAIRE", outils: ["Claude", "Design", "Anthropic"], vues: 7725 },
  { titre: "Maitriser TOUT NotebookLM en 26 minutes (Tuto Complet)", dureeMin: 26, niveau: "INTERMEDIAIRE", outils: ["NotebookLM", "Google"], vues: 7319 },
  { titre: "CAPCUT 🎥 Tutoriel Complet pour Débutants sur Ordinateur 🎬", dureeMin: 33, niveau: "DEBUTANT", outils: ["CapCut", "Vidéo", "Montage"], vues: 7396 },
  { titre: "Tuto Notion Simplifié : Apprenez les Bases en 10 Minutes", dureeMin: 16, niveau: "DEBUTANT", outils: ["Notion", "Productivité"], vues: 7427 },
  { titre: "Notion Simplifié | Formation COMPLÈTE Gratuite (90 min)", dureeMin: 99, niveau: "AVANCE", outils: ["Notion", "Formation"], vues: 8912 },
  { titre: "Claude Code : Tout comprendre", dureeMin: 55, niveau: "INTERMEDIAIRE", outils: ["Claude", "Code", "Anthropic"], vues: 6604 },
  { titre: "Créer une appli sans coder en 30 min chrono avec l'IA (guide Lovable débutant)", dureeMin: 18, niveau: "DEBUTANT", outils: ["Lovable", "NoCode", "App"], vues: 6134 },
  { titre: "Lancez votre app e-commerce SaaS en 60 minutes – Tutoriel Lovable", dureeMin: 66, niveau: "INTERMEDIAIRE", outils: ["Lovable", "SaaS", "NoCode"], vues: 6235 },
  { titre: "Nano Banana 2 : la méthode simple pour créer des images au TOP", dureeMin: 23, niveau: "INTERMEDIAIRE", outils: ["Nano", "Banana", "Image"], vues: 7815 },
  { titre: "Claude Skills : Automatiser ce que vous pensiez impossible.", dureeMin: 22, niveau: "AVANCE", outils: ["Claude", "Skills", "Anthropic"], vues: 7127 },
  { titre: "Voici Gamma 3.0, la création ULTIME de vos slides avec l'IA !", dureeMin: 15, niveau: "DEBUTANT", outils: ["Gamma", "Slides", "Présentation"], vues: 6961 },
  { titre: "Claude Cowork Dispatch : c'est juste incroyable ! Voici comment l'utiliser", dureeMin: 19, niveau: "AVANCE", outils: ["Claude", "Dispatch", "Cowork"], vues: 7274 },
  { titre: "Google AI Studio : Tutoriel complet pour tout maîtriser en 2026", dureeMin: 36, niveau: "AVANCE", outils: ["Google", "AI", "Studio"], vues: 6509 },
  { titre: "HIGGSFIELD - LE GUIDE ULTIME (Intelligence Artificielle)", dureeMin: 44, niveau: "INTERMEDIAIRE", outils: ["Higgsfield", "Vidéo"], vues: 7849 },
  { titre: "Comment utiliser ANTIGRAVITY mieux que 99% des gens (Gemini)", dureeMin: 27, niveau: "INTERMEDIAIRE", outils: ["Antigravity", "Gemini", "Google"], vues: 5690 },
  { titre: "Comment utiliser OpenClaw, Tuto facile complet sécurisé", dureeMin: 68, niveau: "AVANCE", outils: ["OpenClaw", "Tuto"], vues: 7641 },
  { titre: "J'ai testé Seedance 2.0 sur Dreamina Le Meilleur Générateur Vidéo IA?", dureeMin: 10, niveau: "DEBUTANT", outils: ["Seedance", "Dreamina", "Vidéo"], vues: 7091 },
  { titre: "Utilisez mieux Perplexity que 97% des gens", dureeMin: 26, niveau: "INTERMEDIAIRE", outils: ["Perplexity", "Recherche"], vues: 4852 },
  { titre: "TUTO / COURS Claude Code COMPLET : Maîtrise Claude Code en 4 heures", dureeMin: 250, niveau: "AVANCE", outils: ["Claude", "Code", "Formation"], vues: 7213 },
  { titre: "Perplexity : Le Guide Ultime | Tutoriel pour débutants", dureeMin: 30, niveau: "AVANCE", outils: ["Perplexity", "Guide"], vues: 5412 },
  { titre: "Maîtrisez Google Gemini : Tout ce qu'il faut savoir (Tutoriel complet)", dureeMin: 23, niveau: "INTERMEDIAIRE", outils: ["Gemini", "Google"], vues: 5261 },
  { titre: "SUNO V5.5 : un système exceptionnel à tous les niveaux. GUIDE ULTRA COMPLET !!!", dureeMin: 71, niveau: "INTERMEDIAIRE", outils: ["Suno", "Musique", "IA"], vues: 6243 },
  { titre: "Nano Banana : Le Tuto COMPLET (validé par Google !)", dureeMin: 29, niveau: "DEBUTANT", outils: ["Nano", "Banana", "Google"], vues: 5169 },
  { titre: "Comment Faire une Bonne Voix OFF Gratuitement avec ElevenLabs en 4 Étapes ? (Tutoriel)", dureeMin: 9, niveau: "DEBUTANT", outils: ["ElevenLabs", "Voix", "TTS"], vues: 5368 },
  { titre: "Maîtrisez les vidéos IA avec InVideo AI en 15 minutes ai video generator", dureeMin: 17, niveau: "DEBUTANT", outils: ["InVideo", "Vidéo", "IA"], vues: 6264 },
  { titre: "Comment cloner une voix facilement avec l'IA d'ElevenLabs ?#ElevenLabs#Clone#Voix", dureeMin: 17, niveau: "INTERMEDIAIRE", outils: ["ElevenLabs", "Clone", "Voix"], vues: 5561 },
  { titre: "22 minutes pour bien utiliser ChatGPT en 2026 (Tuto Complet)", dureeMin: 22, niveau: "INTERMEDIAIRE", outils: ["ChatGPT", "OpenAI", "Tuto"], vues: 4225 },
  { titre: "Codex : La Formation Complète pour Coder avec l'IA d'OpenAI", dureeMin: 15, niveau: "AVANCE", outils: ["Codex", "OpenAI", "Code"], vues: 5851 },
  { titre: "SEO + IA : optimiser sa visibilité Google et ChatGPT (Semrush One)", dureeMin: 25, niveau: "AVANCE", outils: ["SEO", "Semrush", "IA"], vues: 4972 },
  { titre: "La meilleure IA pour apprendre, synthétiser et créer - NotebookLM Tutoriel Complet", dureeMin: 31, niveau: "DEBUTANT", outils: ["NotebookLM", "Apprentissage"], vues: 4228 },
  { titre: "GOOGLE GEMINI dévoile son générateur musical aux multiples options : LYRIA 3", dureeMin: 18, niveau: "DEBUTANT", outils: ["Lyria", "Gemini", "Musique"], vues: 4851 },
  { titre: "Tutoriel Hubspot CRM débutant 2025 Français 🇫🇷", dureeMin: 32, niveau: "DEBUTANT", outils: ["Hubspot", "CRM"], vues: 5535 },
  { titre: "59 MINUTES pour connaître TOUTES LES BASES ( Photoshop 2026)", dureeMin: 59, niveau: "DEBUTANT", outils: ["Photoshop", "Adobe", "Bases"], vues: 3661 },
  { titre: "🎧 Gérer ses balises comme un PRO avec SUNO STUDIO 🎶 (Tuto complet)", dureeMin: 43, niveau: "AVANCE", outils: ["Suno", "Studio", "Balises"], vues: 3658 },
  { titre: "MASHUP SUNO : TOUT SAVOIR SUR LA DERNIÈRE MISE À JOUR (TUTO COMPLET)", dureeMin: 47, niveau: "INTERMEDIAIRE", outils: ["Suno", "Mashup", "Musique"], vues: 3339 },
  { titre: "Kling 3.0 : Maîtrise l'IA Vidéo N°1 en 2026 (Tuto Complet)", dureeMin: 22, niveau: "INTERMEDIAIRE", outils: ["Kling", "Vidéo", "IA"], vues: 4045 },
  { titre: "PHOTOSHOP 2026 : Le Guide Complet des Nouveautés", dureeMin: 61, niveau: "INTERMEDIAIRE", outils: ["Photoshop", "Adobe", "Nouveautés"], vues: 3544 },
  { titre: "TUTO PREMIERE PRO CC POUR LES DEBUTANTS : FORMATION COMPLÈTE EN MONTAGE VIDÉO (1H GRATUITE)", dureeMin: 60, niveau: "AVANCE", outils: ["Premiere", "Pro", "Montage"], vues: 4597 },
  { titre: "J'ai découvert une fonction SECRÈTE sur Windsurf… et ça change TOUT 🤯", dureeMin: 15, niveau: "AVANCE", outils: ["Windsurf", "Code", "IDE"], vues: 3938 },
  { titre: "Midjourney a changé : voici comment l'utiliser en 2026", dureeMin: 22, niveau: "INTERMEDIAIRE", outils: ["Midjourney", "Image"], vues: 3460 },
  { titre: "DeepFake Vidéo ULTRA Réalistes en 13 minutes ! (Tuto IA Facile)", dureeMin: 13, niveau: "DEBUTANT", outils: ["DeepFake", "Vidéo", "IA"], vues: 3356 },
  { titre: "Tutoriel HeyGen 2026 : Comment créer des vidéos avec avatars IA (Pas à pas)", dureeMin: 24, niveau: "INTERMEDIAIRE", outils: ["HeyGen", "Avatar", "Vidéo"], vues: 3510 },
  { titre: "Créer une vidéo en 5min avec VEED.IO", dureeMin: 12, niveau: "DEBUTANT", outils: ["VEED", "Vidéo", "Édition"], vues: 2844 },
  { titre: "Tutoriel Base44 Complet - Créer une App Web Sans Coder en 2026", dureeMin: 80, niveau: "INTERMEDIAIRE", outils: ["Base44", "NoCode", "App"], vues: 3866 },
  { titre: "Ma méthode pour créer des Apps avec Cursor (Débutant)", dureeMin: 12, niveau: "DEBUTANT", outils: ["Cursor", "Code", "App"], vues: 3867 },
  { titre: "COURS COMPLET de A à Z sur Cursor AI (Formation Gratuite 2025)", dureeMin: 76, niveau: "AVANCE", outils: ["Cursor", "Code", "Formation"], vues: 2613 },
  { titre: "n8n : De DÉBUTANT à PRO en 5h30", dureeMin: 333, niveau: "AVANCE", outils: ["n8n", "Automatisation"], vues: 3254 },
  { titre: "Formation n8n : Apprendre l'automation n8n à partir de zéro (2026)", dureeMin: 22, niveau: "DEBUTANT", outils: ["n8n", "Formation"], vues: 2733 },
  { titre: "LE GUIDE COMPLET SUR FRAMER | Formation 2026", dureeMin: 90, niveau: "INTERMEDIAIRE", outils: ["Framer", "Web", "Design"], vues: 2539 },
  { titre: "Créer une App COMPLÈTE avec l'IA en 20 min ! (Replit)", dureeMin: 35, niveau: "DEBUTANT", outils: ["Replit", "NoCode", "App"], vues: 2998 },
  { titre: "Leonardo.ai : le GUIDE ULTIME pour DÉBUTANTS (TUTO COMPLET)", dureeMin: 18, niveau: "DEBUTANT", outils: ["Leonardo", "Image"], vues: 2810 },
  { titre: "Tutoriel ClickUp 4.0 : Le Guide Complet de A à Z en 2026", dureeMin: 25, niveau: "INTERMEDIAIRE", outils: ["ClickUp", "Productivité"], vues: 2796 },
  { titre: "Le guide ultime pour comprendre les MCP (+ 3 Demos)", dureeMin: 29, niveau: "AVANCE", outils: ["MCP", "Claude", "Anthropic"], vues: 2855 },
  { titre: "Comment créer un assistant GPT ultra efficace (en 3 étapes)", dureeMin: 19, niveau: "DEBUTANT", outils: ["GPT", "Assistant", "OpenAI"], vues: 3006 },
  { titre: "Créer un Agent IA puissant (RAG) : Tutoriel Complet (no code)", dureeMin: 26, niveau: "AVANCE", outils: ["Agent", "IA", "RAG"], vues: 2273 },
  { titre: "Comment créer votre PREMIER agent IA en 2026 (sans coder)", dureeMin: 20, niveau: "DEBUTANT", outils: ["Agent", "IA", "NoCode"], vues: 2110 },
  { titre: "Devenez cinéaste avec RunwayML : TUTO complet Gen-3", dureeMin: 21, niveau: "INTERMEDIAIRE", outils: ["Runway", "Vidéo", "Gen3"], vues: 2367 },
  { titre: "Comment utiliser DESCRIPT ? Les bases essentielles", dureeMin: 16, niveau: "DEBUTANT", outils: ["Descript", "Audio", "Vidéo"], vues: 2080 },
  { titre: "Les LLM Expliqués (SIMPLEMENT) en 3min", dureeMin: 3, niveau: "DEBUTANT", outils: ["LLM", "IA", "Bases"], vues: 1770 },
  { titre: "Pourquoi les IA hallucinent ? La vérité sur RAG !", dureeMin: 3, niveau: "DEBUTANT", outils: ["RAG", "IA", "Bases"], vues: 2404 },
  { titre: "Microsoft Copilot : Le Guide Ultime | Tutoriel pour débutants", dureeMin: 35, niveau: "DEBUTANT", outils: ["Copilot", "Microsoft"], vues: 2241 },
  { titre: "Introduction à Ollama: téléchargement", dureeMin: 26, niveau: "INTERMEDIAIRE", outils: ["Ollama", "LLM", "Local"], vues: 1700 },
  { titre: "Comment Maîtriser GitHub Pour Débutants", dureeMin: 11, niveau: "DEBUTANT", outils: ["GitHub", "Code"], vues: 1460 },
  { titre: "Make de A à Z le tutoriel complet pour débuter en 30 min en 2026", dureeMin: 29, niveau: "DEBUTANT", outils: ["Make", "Automatisation"], vues: 1668 },
  { titre: "Maîtrisez Make.com : Tutoriel Complet pour Débutants 2026 (MAKE x NOTION)", dureeMin: 108, niveau: "INTERMEDIAIRE", outils: ["Make", "Notion", "Automatisation"], vues: 1776 },
  { titre: "Gérer sa facturation avec des agents IA : Le guide ultime (Notion + Abby)", dureeMin: 18, niveau: "INTERMEDIAIRE", outils: ["Notion", "Abby", "Facturation"], vues: 1814 },
  { titre: "On peut faire de l'essayage virtuel avec FireFLy dans Photoshop !", dureeMin: 8, niveau: "DEBUTANT", outils: ["Firefly", "Photoshop", "Adobe"], vues: 1825 },
  { titre: "Automatisez votre business avec Zapier | Tutoriel débutant en 17min", dureeMin: 17, niveau: "AVANCE", outils: ["Zapier", "Automatisation"], vues: 1253 },
  { titre: "J'ai créé le Prompt parfait pour TOUTES les IA (ChatGPT, Gemini, Claude…)", dureeMin: 24, niveau: "INTERMEDIAIRE", outils: ["Prompt", "ChatGPT", "Gemini"], vues: 1794 },
  { titre: "Le guide SIMPLE pour générer des images incroyable en local sur ton PC (ComfyUI + FLUX 2)", dureeMin: 10, niveau: "DEBUTANT", outils: ["ComfyUI", "FLUX", "Image"], vues: 1756 },
  { titre: "Tuto UDIO, la superbe IA générative de chansons !", dureeMin: 18, niveau: "DEBUTANT", outils: ["UDIO", "Musique", "IA"], vues: 1713 },
  { titre: "Comment écrire avec l'IA ? – Formation Complète", dureeMin: 44, niveau: "AVANCE", outils: ["Écriture", "IA", "Formation"], vues: 1079 },
  { titre: "Comment Wan2.2 Animate transforme une simple image en vidéo animée bluffante !! | Comfyui", dureeMin: 17, niveau: "INTERMEDIAIRE", outils: ["Wan", "ComfyUI", "Animation"], vues: 1386 },
  { titre: "Formation Bolt.new 2026 : Tuto COMPLET pour bien l'utiliser !", dureeMin: 46, niveau: "INTERMEDIAIRE", outils: ["Bolt", "NoCode", "App"], vues: 1186, nouveau: true },
  { titre: "Recraft : une IA et un outil révolutionnaire ! Double-Tuto complet !!", dureeMin: 30, niveau: "INTERMEDIAIRE", outils: ["Recraft", "Image", "IA"], vues: 1049, nouveau: true },
  { titre: "Wan 2.5 (Le VEO3 Killer non censuré) est MAINTENANT dans n8n (tutoriel complet + modèle)", dureeMin: 25, niveau: "DEBUTANT", outils: ["Wan", "n8n", "Vidéo"], vues: 1195, nouveau: true },
  { titre: "J'ai créé un site internet complet avec Manus - Agent IA incroyable pour planifier des tâches !", dureeMin: 30, niveau: "INTERMEDIAIRE", outils: ["Manus", "Agent", "IA"], vues: 1194, nouveau: true },
  { titre: "Le Guide ULTIME pour Wan 2.2 Vidéos IA en Local (Tuto T2V ComfyUI 2025)", dureeMin: 19, niveau: "INTERMEDIAIRE", outils: ["Wan", "ComfyUI", "Vidéo"], vues: 1317, nouveau: true },
];

async function main() {
  console.log(`Seed de ${TUTOS.length} tutoriels…`);
  let rang = 0;
  for (const t of TUTOS) {
    rang += 1;
    await tuto.upsert({
      where: { slug: slugifierTuto(t.titre) },
      create: {
        slug: slugifierTuto(t.titre),
        titre: t.titre,
        dureeMin: t.dureeMin,
        niveau: t.niveau,
        outils: t.outils,
        vues: t.vues,
        ordre: rang,
        nouveau: t.nouveau ?? false,
      },
      update: {
        titre: t.titre,
        dureeMin: t.dureeMin,
        niveau: t.niveau,
        outils: t.outils,
        vues: t.vues,
        ordre: rang,
        nouveau: t.nouveau ?? false,
        // youtubeId et miniature volontairement absents de l'update :
        // on n'écrase jamais ce que migrer-tutos.ts a déjà complété.
      },
    });
  }
  const total = await tuto.count();
  console.log(`✔ ${TUTOS.length} tutoriels traités (upsert) — table Tuto : ${total} lignes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());