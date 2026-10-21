import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient, ToolType } from "@prisma/client";

const prisma = new PrismaClient();
const ilYA = (jours: number) => new Date(Date.now() - jours * 86_400_000);

function hacher(motDePasse: string) {
  const sel = randomBytes(16).toString("hex");
  return `${sel}:${scryptSync(motDePasse, sel, 64).toString("hex")}`;
}

type OutilSeed = {
  nom: string; slug: string; url: string; description: string;
  type?: ToolType; tarif: string; tarifMin?: number;
  gratuit?: boolean; openSource?: boolean; misEnAvant?: boolean;
  langues?: string[]; niveau?: string; objectifs: string[]; categories: string[];
  fonctions: string[]; casUsage?: string[]; jours?: number; verifie?: number;
};

const CATEGORIES: { slug: string; nom: string; icone: string }[] = [
  { slug: "assistants", nom: "Assistants conversation", icone: "MessageCircle" },
  { slug: "redaction", nom: "Rédaction", icone: "PenLine" },
  { slug: "image-design", nom: "Image & design", icone: "Palette" },
  { slug: "video", nom: "Vidéo", icone: "Clapperboard" },
  { slug: "voix-audio", nom: "Voix & audio", icone: "Mic" },
  { slug: "code", nom: "Code & développement", icone: "Code2" },
  { slug: "marketing", nom: "Marketing", icone: "Megaphone" },
  { slug: "seo", nom: "SEO", icone: "TrendingUp" },
  { slug: "vente-crm", nom: "Vente & CRM", icone: "Briefcase" },
  { slug: "productivite", nom: "Productivité", icone: "ListChecks" },
  { slug: "automatisation", nom: "Automatisation", icone: "Workflow" },
  { slug: "traduction", nom: "Traduction", icone: "Languages" },
  { slug: "recherche", nom: "Recherche & veille", icone: "Search" },
  { slug: "agents", nom: "Agents IA", icone: "Bot" },
];

const OUTILS: OutilSeed[] = [
  // ── Assistants conversation ──────────────────────────────────
  { nom: "ChatGPT", slug: "chatgpt", url: "https://chat.openai.com",
    description: "L'assistant d'OpenAI pour rédiger, analyser, coder et brainstormer, avec des GPT personnalisés et des agents.",
    tarif: "Freemium — Plus à 20 $/mois", gratuit: true, misEnAvant: true, jours: 210, verifie: 10,
    objectifs: ["Apprendre", "Créer du contenu", "Communiquer", "Coder"], categories: ["assistants"],
    fonctions: ["Chat multimodal (texte, image, voix)", "GPT personnalisés", "Mode agent pour les tâches longues", "Génération d'images"],
    casUsage: ["Rédiger un plan d'affaires", "Résumer un rapport en 5 points"] },
  { nom: "Claude", slug: "claude", url: "https://claude.ai",
    description: "L'assistant d'Anthropic, fort en rédaction longue, analyse de documents et code. Style très naturel en français.",
    tarif: "Freemium — Pro à 20 $/mois", gratuit: true, misEnAvant: true, jours: 200, verifie: 8,
    objectifs: ["Créer du contenu", "Coder", "Apprendre", "Communiquer"], categories: ["assistants"],
    fonctions: ["Artefacts (code, documents interactifs)", "Projets et fichiers joints", "Modes de réflexion avancés"],
    casUsage: ["Analyser un contrat ligne par ligne", "Écrire une newsletter fidèle à ton ton"] },
  { nom: "Le Chat (Mistral)", slug: "le-chat", url: "https://chat.mistral.ai",
    description: "L'assistant français de Mistral : rapide, souverain (hébergé en Europe) et généreux en version gratuite.",
    tarif: "Freemium — Pro à 14,99 €/mois", gratuit: true, misEnAvant: true, jours: 25, verifie: 14,
    objectifs: ["Créer du contenu", "Apprendre", "Communiquer"], categories: ["assistants"],
    fonctions: ["Chat et recherche web", "Canvas collaboratif", "API ouverte"],
    casUsage: ["Rédiger en français sans anglicismes", "Veille rapide avec sources"] },
  { nom: "Gemini", slug: "gemini", url: "https://gemini.google.com",
    description: "L'assistant de Google intégré à Gmail, Docs et Search, avec un très long contexte et une bonne version gratuite.",
    tarif: "Freemium — Advanced à 21,99 €/mois", gratuit: true, jours: 180, verifie: 20,
    objectifs: ["Créer du contenu", "Apprendre", "Gérer"], categories: ["assistants"],
    fonctions: ["Intégration Google Workspace", "Contexte très long", "Analyse d'images et de fichiers"] },
  { nom: "Perplexity", slug: "perplexity", url: "https://perplexity.ai",
    description: "Moteur de réponses avec sources citées : idéal pour la veille et la recherche rapide et vérifiable.",
    tarif: "Freemium — Pro à 20 $/mois", gratuit: true, jours: 160, verifie: 18,
    objectifs: ["Apprendre", "Communiquer"], categories: ["assistants", "recherche"],
    fonctions: ["Réponses sourcées", "Collections thématiques", "Mode recherche approfondie"] },
  { nom: "Ollama", slug: "ollama", url: "https://ollama.com",
    description: "Exécution de modèles IA en local, gratuitement et hors ligne : parfait sans connexion stable ou pour la confidentialité.",
    tarif: "Gratuit — open source", gratuit: true, openSource: true, niveau: "Intermédiaire", jours: 12, verifie: 9,
    objectifs: ["Coder", "Apprendre"], categories: ["assistants", "code"],
    fonctions: ["Modèles locaux (Llama, Mistral…)", "API locale compatible OpenAI", "Aucune donnée envoyée en ligne"],
    casUsage: ["Assistant privé sans abonnement", "Prototyper sans connexion"] },

  // ── Rédaction & marketing ────────────────────────────────────
  { nom: "Jasper", slug: "jasper", url: "https://jasper.ai",
    description: "Rédaction marketing orientée marque : articles, campagnes et contenus alignés sur ton ton de voix.",
    tarif: "Payant dès 39 $/mois", tarifMin: 39, jours: 300, verifie: 40,
    objectifs: ["Vendre", "Créer du contenu"], categories: ["redaction", "marketing"],
    fonctions: ["Mémoire de marque", "Campagnes multicanal", "Templates marketing"] },
  { nom: "Copy.ai", slug: "copy-ai", url: "https://copy.ai",
    description: "Générateur de textes marketing avec workflows automatisés : e-mails, posts et pages de vente.",
    tarif: "Freemium", gratuit: true, jours: 220, verifie: 30,
    objectifs: ["Vendre", "Créer du contenu"], categories: ["redaction", "marketing"],
    fonctions: ["Workflows GTM", "Templates de pages de vente", "Traduction de campagnes"] },
  { nom: "Surfer SEO", slug: "surfer-seo", url: "https://surferseo.com",
    description: "Rédaction optimisée SEO : briefs, audit de contenu et scoring face à la concurrence.",
    tarif: "Payant dès 89 $/mois", tarifMin: 89, niveau: "Intermédiaire", jours: 260, verifie: 35,
    objectifs: ["Vendre"], categories: ["seo", "redaction"],
    fonctions: ["Éditeur avec score SEO", "Audit de pages", "Génération de briefs"] },
  { nom: "Frase", slug: "frase", url: "https://frase.io",
    description: "Briefs de contenu et optimisation SEO, plus accessible que Surfer pour les petits budgets.",
    tarif: "Payant dès 45 $/mois", tarifMin: 45, jours: 280, verifie: 45,
    objectifs: ["Vendre"], categories: ["seo", "redaction"],
    fonctions: ["Briefs automatisés", "Comparaison SERP", "Optimisation en direct"] },
  { nom: "DeepL", slug: "deepl", url: "https://deepl.com",
    description: "La traduction de référence en français : textes, documents entiers et réécriture assistée.",
    tarif: "Freemium — Pro dès 8,99 €/mois", tarifMin: 9, gratuit: true, jours: 240, verifie: 11,
    objectifs: ["Communiquer", "Créer du contenu"], categories: ["traduction", "redaction"],
    fonctions: ["Traduction de documents formatés", "Dictionnaire personnalisé", "Écriture assistée"],
    casUsage: ["Traduire une proposition commerciale", "Relire un e-mail client"] },

  // ── Image & design ───────────────────────────────────────────
  { nom: "Midjourney", slug: "midjourney", url: "https://midjourney.com",
    description: "Génération d'images haut de gamme, au style visuel très soigné. La référence des créateurs.",
    tarif: "Payant dès 10 $/mois", tarifMin: 10, niveau: "Intermédiaire", jours: 320, verifie: 25,
    objectifs: ["Créer du contenu"], categories: ["image-design"],
    fonctions: ["Génération par prompt", "Remix et variations", "Références de style"] },
  { nom: "Leonardo AI", slug: "leonardo-ai", url: "https://leonardo.ai",
    description: "Générateur d'images avec modèles personnalisés et quota gratuit quotidien.",
    tarif: "Freemium", gratuit: true, jours: 150, verifie: 22,
    objectifs: ["Créer du contenu"], categories: ["image-design"],
    fonctions: ["Entraînement de modèles privés", "Quota gratuit quotidien", "Outils d'édition générative"] },
  { nom: "Ideogram", slug: "ideogram", url: "https://ideogram.ai",
    description: "Le générateur qui écrit correctement le texte dans les visuels : parfait pour logos et affiches.",
    tarif: "Freemium", gratuit: true, jours: 20, verifie: 12,
    objectifs: ["Créer du contenu", "Vendre"], categories: ["image-design"],
    fonctions: ["Texte lisible dans l'image", "Styles prédéfinis", "Génération de logos"] },
  { nom: "Canva Magic Studio", slug: "canva", url: "https://canva.com",
    description: "Le design assisté par IA : présentations, posts, vidéos et documents, avec génération d'images et de textes.",
    tarif: "Freemium — Pro à 12 €/mois", tarifMin: 12, gratuit: true, misEnAvant: true, jours: 330, verifie: 7,
    objectifs: ["Créer du contenu", "Vendre", "Gérer"], categories: ["image-design", "productivite"],
    fonctions: ["Magic Design et Magic Write", "Montage vidéo simple", "Brand kit (couleurs, logos)"],
    casUsage: ["Un post réseau social en 10 minutes", "Une présentation client pro"] },
  { nom: "Adobe Firefly", slug: "firefly", url: "https://firefly.adobe.com",
    description: "Génération d'images et retouche générative intégrées aux outils Adobe, entraînées sur des contenus licenciés.",
    tarif: "Freemium — via Creative Cloud", gratuit: true, jours: 250, verifie: 28,
    objectifs: ["Créer du contenu"], categories: ["image-design"],
    fonctions: ["Retouche générative", "Génération commerciale sûre", "Intégration Photoshop"] },
  { nom: "ComfyUI", slug: "comfyui", url: "https://www.comfy.org",
    description: "Interface nodale open source pour Stable Diffusion : le standard des pipelines d'images avancés.",
    tarif: "Gratuit — open source", gratuit: true, openSource: true, niveau: "Avancé", jours: 90, verifie: 30,
    objectifs: ["Créer du contenu", "Coder"], categories: ["image-design"],
    fonctions: ["Pipelines nodaux", "Modèles personnalisés", "Exécution locale"] },

  // ── Vidéo ────────────────────────────────────────────────────
  { nom: "Runway", slug: "runway", url: "https://runwayml.com",
    description: "Suite vidéo IA : text-to-video, génération d'images, retouche et outils de montage avancés.",
    tarif: "Freemium — dès 12 $/mois", tarifMin: 12, jours: 170, verifie: 16,
    objectifs: ["Créer du contenu", "Vendre"], categories: ["video"],
    fonctions: ["Text-to-video", "Suppression d'objets", "Génération d'images"] },
  { nom: "Pika", slug: "pika", url: "https://pika.art",
    description: "Génération de vidéos courtes et d'effets viraux à partir de texte ou d'images.",
    tarif: "Freemium", gratuit: true, jours: 60, verifie: 20,
    objectifs: ["Créer du contenu"], categories: ["video"],
    fonctions: ["Effets viraux", "Animation d'images", "Contrôle de caméra"] },
  { nom: "Luma Dream Machine", slug: "luma-dream-machine", url: "https://lumalabs.ai/dream-machine",
    description: "Vidéos réalistes et mouvements de caméra fluides à partir d'un texte ou d'une photo.",
    tarif: "Freemium", gratuit: true, jours: 8, verifie: 10,
    objectifs: ["Créer du contenu"], categories: ["video"],
    fonctions: ["Text-to-video", "Image-to-video", "Mouvements de caméra prédéfinis"] },
  { nom: "HeyGen", slug: "heygen", url: "https://heygen.com",
    description: "Avatars vidéo parlants en 175 langues : présentations, formations et vidéos marketing sans tournage.",
    tarif: "Freemium — dès 24 $/mois", tarifMin: 24, jours: 190, verifie: 26,
    objectifs: ["Vendre", "Créer du contenu"], categories: ["video", "marketing"],
    fonctions: ["Avatars réalistes", "Traduction vidéo avec synchro labiale", "Templates personnalisés"] },
  { nom: "CapCut", slug: "capcut", url: "https://capcut.com",
    description: "Montage vidéo complet avec sous-titrage automatique et suppression de fond, très utilisé par les créateurs.",
    tarif: "Freemium — Pro à 8 €/mois", tarifMin: 8, gratuit: true, jours: 200, verifie: 13,
    objectifs: ["Créer du contenu", "Vendre"], categories: ["video"],
    fonctions: ["Sous-titres automatiques", "Suppression de fond", "Templates tendances"] },
  { nom: "Descript", slug: "descript", url: "https://descript.com",
    description: "Montage de vidéos et podcasts en éditant simplement le texte de la transcription.",
    tarif: "Freemium", gratuit: true, jours: 210, verifie: 24,
    objectifs: ["Créer du contenu", "Communiquer"], categories: ["video", "voix-audio", "productivite"],
    fonctions: ["Édition par transcription", "Suppression des « euh »", "Voix clonée"] },
  { nom: "Opus Clip", slug: "opus-clip", url: "https://opus.pro",
    description: "Découpe automatique de vidéos longues en clips courts sous-titrés pour TikTok, Reels et Shorts.",
    tarif: "Freemium", gratuit: true, jours: 15, verifie: 15,
    objectifs: ["Vendre", "Créer du contenu"], categories: ["video", "marketing"],
    fonctions: ["Clips automatiques", "Sous-titres dynamiques", "Republier directement"] },

  // ── Voix & audio ─────────────────────────────────────────────
  { nom: "ElevenLabs", slug: "elevenlabs", url: "https://elevenlabs.io",
    description: "Voix de synthèse ultra réalistes et clonage vocal en français, avec doublage automatique.",
    tarif: "Freemium — dès 5 $/mois", tarifMin: 5, gratuit: true, jours: 180, verifie: 10,
    objectifs: ["Créer du contenu", "Communiquer"], categories: ["voix-audio"],
    fonctions: ["Voix françaises naturelles", "Clonage vocal", "Doublage de vidéos"] },
  { nom: "Suno", slug: "suno", url: "https://suno.com",
    description: "Création de chansons complètes — voix, paroles, musique — à partir d'une simple description.",
    tarif: "Freemium", gratuit: true, jours: 30, verifie: 18,
    objectifs: ["Créer du contenu"], categories: ["voix-audio"],
    fonctions: ["Chansons depuis un texte", "Paroles automatiques", "Extensions de morceaux"] },

  // ── Code & développement ────────────────────────────────────
  { nom: "GitHub Copilot", slug: "github-copilot", url: "https://github.com/features/copilot",
    description: "Assistant de code dans VS Code et JetBrains : complétion, chat et agents sur ta base de code.",
    tarif: "Freemium — 10 $/mois", tarifMin: 10, gratuit: true, jours: 300, verifie: 12,
    objectifs: ["Coder"], categories: ["code"],
    fonctions: ["Complétion en ligne", "Chat sur le dépôt", "Mode agent"] },
  { nom: "Cursor", slug: "cursor", url: "https://cursor.com",
    description: "Éditeur basé sur VS Code avec un agent IA qui modifie plusieurs fichiers et explique ta base de code.",
    tarif: "Freemium — 20 $/mois", tarifMin: 20, niveau: "Intermédiaire", jours: 100, verifie: 9,
    objectifs: ["Coder"], categories: ["code"],
    fonctions: ["Édition multi-fichiers", "Indexation du projet", "Mode agent"] },
  { nom: "Windsurf", slug: "windsurf", url: "https://windsurf.com",
    description: "Éditeur IA (ex-Codeium) avec l'agent Cascade : version gratuite généreuse et tarifs accessibles.",
    tarif: "Freemium", gratuit: true, jours: 18, verifie: 11,
    objectifs: ["Coder"], categories: ["code"],
    fonctions: ["Agent Cascade", "Complétion illimitée en gratuit", "Support multi-langages"] },
  { nom: "v0", slug: "v0", url: "https://v0.dev",
    description: "Générateur d'interfaces React et Tailwind à partir d'un prompt ou d'une maquette, par Vercel.",
    tarif: "Freemium — 20 $/mois", tarifMin: 20, jours: 80, verifie: 20,
    objectifs: ["Coder"], categories: ["code"],
    fonctions: ["UI depuis un prompt", "Export Tailwind", "Aperçu en direct"] },
  { nom: "Replit", slug: "replit", url: "https://replit.com",
    description: "Plateforme cloud qui code, exécute et déploie des applications entières via des agents, depuis le navigateur.",
    tarif: "Freemium — dès 20 $/mois", tarifMin: 20, type: "AGENT", jours: 140, verifie: 21,
    objectifs: ["Coder", "Automatiser"], categories: ["code", "agents"],
    fonctions: ["Agent qui construit l'app", "Hébergement inclus", "Base de données intégrée"] },

  // ── Vente, productivité, automatisation, agents ─────────────
  { nom: "HubSpot AI", slug: "hubspot-ai", url: "https://hubspot.com",
    description: "CRM gratuit complété par l'IA : rédaction d'e-mails, prévisions de ventes et chatbot pour ton site.",
    tarif: "Freemium — CRM gratuit", gratuit: true, jours: 270, verifie: 32,
    objectifs: ["Vendre", "Gérer"], categories: ["vente-crm", "marketing"],
    fonctions: ["CRM gratuit illimité", "Rédaction d'e-mails IA", "Chatbot de site"] },
  { nom: "Notion AI", slug: "notion-ai", url: "https://notion.com/product/ai",
    description: "Assistant intégré à Notion : résumés, rédaction, traduction et recherche dans tes espaces de travail.",
    tarif: "Inclus dans les plans payants Notion", tarifMin: 10, jours: 230, verifie: 19,
    objectifs: ["Gérer", "Créer du contenu"], categories: ["productivite", "redaction"],
    fonctions: ["Résumés de pages", "Q&A sur tes documents", "Rédaction et traduction"] },
  { nom: "Gamma", slug: "gamma", url: "https://gamma.app",
    description: "Présentations et sites web générés en une minute à partir d'un plan ou d'un simple sujet.",
    tarif: "Freemium", gratuit: true, jours: 22, verifie: 14,
    objectifs: ["Vendre", "Gérer", "Créer du contenu"], categories: ["productivite", "marketing"],
    fonctions: ["Présentation depuis un sujet", "Export PDF/PPT", "Thèmes personnalisés"] },
  { nom: "Tactiq", slug: "tactiq", url: "https://tactiq.io",
    description: "Transcription en direct de tes réunions (Meet, Zoom, Teams) avec résumés IA et exports.",
    tarif: "Freemium", gratuit: true, jours: 110, verifie: 23,
    objectifs: ["Gérer", "Communiquer"], categories: ["productivite"],
    fonctions: ["Transcription en direct", "Résumés automatiques", "Export vers Notion/Docs"] },
  { nom: "Make", slug: "make", url: "https://make.com",
    description: "Automatisation visuelle connectée à l'IA : scénarios sans code entre plus de 1 500 services.",
    tarif: "Freemium — dès 9 $/mois", tarifMin: 9, gratuit: true, jours: 240, verifie: 17,
    objectifs: ["Automatiser", "Gérer"], categories: ["automatisation"],
    fonctions: ["Scénarios visuels", "Nœuds IA (texte, image)", "Planification"] },
  { nom: "n8n", slug: "n8n", url: "https://n8n.io",
    description: "Automatisation et agents IA open source : auto-hébergeable, avec nœuds IA et logique complète.",
    tarif: "Freemium — open source auto-hébergé", gratuit: true, openSource: true, type: "AGENT",
    niveau: "Intermédiaire", jours: 130, verifie: 15,
    objectifs: ["Automatiser"], categories: ["automatisation", "agents"],
    fonctions: ["Agents IA en workflow", "Auto-hébergement", "Plus de 400 intégrations"] },
  { nom: "Lindy", slug: "lindy", url: "https://lindy.ai",
    description: "Création d'agents IA (e-mails, rendez-vous, veille) qui travaillent en tâche de fond, sans code.",
    tarif: "Freemium", gratuit: true, type: "AGENT", jours: 40, verifie: 13,
    objectifs: ["Automatiser", "Gérer"], categories: ["agents", "automatisation"],
    fonctions: ["Agents e-mail et agenda", "Déclencheurs multiples", "Sans code"] },
  { nom: "Relevance AI", slug: "relevance-ai", url: "https://relevanceai.com",
    description: "Plateforme pour construire et déployer des équipes d'agents IA personnalisées, sans code.",
    tarif: "Freemium", gratuit: true, type: "AGENT", jours: 55, verifie: 25,
    objectifs: ["Automatiser", "Vendre"], categories: ["agents", "automatisation"],
    fonctions: ["Agents personnalisés", "Chaînes d'outils", "Tableaux pilotés par IA"] },
  { nom: "NotebookLM", slug: "notebooklm", url: "https://notebooklm.google.com",
    description: "Assistant de lecture de documents : résumés, questions-réponses et podcasts audio générés depuis tes sources.",
    tarif: "Gratuit", gratuit: true, jours: 5, verifie: 6,
    objectifs: ["Apprendre", "Gérer"], categories: ["recherche", "productivite"],
    fonctions: ["Sources multiples", "Q&A sourcées", "Podcast généré automatiquement"] },
];

async function main() {
  console.log("Seed Webgiverse — catégories puis outils…");

  for (const [i, c] of CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { nom: c.nom, icone: c.icone, ordre: i },
      create: { slug: c.slug, nom: c.nom, icone: c.icone, ordre: i },
    });
  }
  const idsCategories = new Map(
    (await prisma.category.findMany()).map((c) => [c.slug, c.id])
  );

  for (const o of OUTILS) {
    const domaine = new URL(o.url).hostname.replace(/^www\./, "");
    const donnees = {
      nom: o.nom, slug: o.slug, url: o.url,
      logo: `https://www.google.com/s2/favicons?domain=${domaine}&sz=128`,
      description: o.description,
      type: o.type ?? "OUTIL",
      tarif: o.tarif,
      tarifMin: o.tarifMin ?? null,
      gratuit: o.gratuit ?? false,
      openSource: o.openSource ?? false,
      langues: o.langues ?? ["Français", "Anglais"],
      niveau: o.niveau ?? "Débutant",
      objectifs: o.objectifs,
      fonctions: o.fonctions,
      casUsage: o.casUsage ?? [],
      misEnAvant: o.misEnAvant ?? false,
      verifieLe: ilYA(o.verifie ?? 30),
      statut: "PUBLIE" as const,
      createdAt: ilYA(o.jours ?? 120),
    };
    const liaisons = o.categories.map((slug) => ({
      categorie: { connect: { id: idsCategories.get(slug)! } },
    }));

    await prisma.tool.upsert({
      where: { slug: o.slug },
      update: { ...donnees, categories: { deleteMany: {}, create: liaisons } },
      create: { ...donnees, categories: { create: liaisons } },
    });
  }

  // Compte admin + compte de test E2E (fournisseur Credentials, désactivé par défaut)
  await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL ?? "admin@webgiverse.test" },
    update: { role: "ADMIN" },
    create: {
      email: process.env.ADMIN_EMAIL ?? "admin@webgiverse.test",
      name: "Admin Webgiverse", role: "ADMIN",
      motDePasse: hacher(process.env.ADMIN_MOT_DE_PASSE ?? "admin-motdepasse-test"),
    },
  });
  if (process.env.AUTH_ALLOW_CREDENTIALS === "true") {
    await prisma.user.upsert({
      where: { email: process.env.E2E_TEST_EMAIL ?? "e2e@webgiverse.test" },
      update: {},
      create: {
        email: process.env.E2E_TEST_EMAIL ?? "e2e@webgiverse.test",
        name: "Testeur E2E",
        motDePasse: hacher(process.env.E2E_TEST_MOT_DE_PASSE ?? "motdepasse-test"),
      },
    });
  }

  console.log(`Terminé : ${CATEGORIES.length} catégories, ${OUTILS.length} outils.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());