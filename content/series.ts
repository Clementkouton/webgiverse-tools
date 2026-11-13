// content/series.ts
// ─────────────────────────────────────────────────────────────────
// Lot 87 — LES 4 SÉRIES WEBGIVERSE
//
//   1. Webgiverse Découverte  → nouveaux outils, gratuits, pépites méconnues
//   2. Webgiverse Academy     → tutoriels, guides, méthodes pas à pas
//   3. Webgiverse Comparatif  → ChatGPT vs Claude, gratuits vs payants…
//   4. Webgiverse Automation  → agents IA, automatisations, workflows
//
// Principe : ce fichier est de la DONNÉE pure (comme content/accueil.ts).
// Il ne contient ni composant React ni icône lucide — l'icône est un
// NOM (chaîne), transformé en vrai composant par
// components/commun/icone-serie.tsx. Ainsi /series, /blog et
// app/sitemap.ts peuvent importer ce fichier sans risque.
//
// Chaque série contient des MOTS-CLÉS : lib/series.ts s'en sert pour
// classer automatiquement les articles du blog (aucune migration
// Prisma, aucun champ à remplir dans l'admin).
// ─────────────────────────────────────────────────────────────────

export type SerieWebgiverse = {
  /** identifiant URL : /series/webgiverse-decouverte */
  slug: string;
  /** nom complet affiché */
  nom: string;
  /** nom court (badges, navigation) */
  court: string;
  /** phrase d'accroche des cartes */
  accroche: string;
  /** description complète du héros de la page série */
  description: string;
  /** nom d'icône lucide-react (voir icone-serie.tsx) */
  icone: string;
  /** mots-clés du classement automatique (sans accents, minuscules) */
  motsCles: string[];
  /**
   * Classes Tailwind de la couleur signature de la série.
   * Écrites en TOUTES LETTRES (pas construites dynamiquement) pour que
   * Tailwind les détecte et les compile.
   */
  couleur: {
    /** pastille de l'icône (fond doux + texte coloré) */
    pastille: string;
    /** dégradé du bandeau héros de la page série */
    heros: string;
    /** bordure de la carte au survol */
    survol: string;
    /** badge « série » sur les cartes d'articles */
    badge: string;
  };
};

export const SERIES_WEBGIVERSE: SerieWebgiverse[] = [
  {
    slug: "webgiverse-decouverte",
    nom: "Webgiverse Découverte",
    court: "Découverte",
    accroche: "Nouveaux outils, outils gratuits et pépites méconnues.",
    description:
      "On déniche pour toi les outils IA qui viennent de sortir, les versions gratuites qui valent vraiment le coup et les pépites que presque personne ne connaît encore. Une sélection testée, sans hype.",
    icone: "Compass",
    motsCles: [
      "nouveau", "nouveaux", "nouveaute", "nouveautes", "nouveauté", "nouveautés",
      "gratuit", "gratuite", "gratuits", "gratuites", "sans payer", "0 euro",
      "pepite", "pépite", "pepites", "pépites", "meconnu", "méconnu",
      "meconnue", "méconnue", "cache", "caché", "cachee", "cachée",
      "decouvrir", "découvrir", "decouverte", "découverte", "perle", "rare",
      "insolite", "surprenant", "tendance", "tendances", "sortie", "lance",
      "lancé", "lancement", "top", "selection", "sélection", "meilleur",
      "meilleurs", "alternative", "alternatives", "essayer", "tester",
    ],
    couleur: {
      pastille: "bg-violet/10 text-violet",
      heros: "from-violet/15 via-white to-white",
      survol: "hover:border-violet",
      badge: "bg-violet/10 text-violet",
    },
  },
  {
    slug: "webgiverse-academy",
    nom: "Webgiverse Academy",
    court: "Academy",
    accroche: "Tutoriels, guides et méthodes étape par étape.",
    description:
      "Des tutoriels guidés et des méthodes pas à pas pour apprendre à utiliser l'intelligence artificielle concrètement : prise en main, techniques avancées et réflexes de pro, expliqués simplement.",
    icone: "GraduationCap",
    motsCles: [
      "tutoriel", "tutoriels", "tuto", "tutos", "guide", "guides",
      "methode", "méthode", "methodes", "méthodes", "etape", "étape",
      "etapes", "étapes", "pas a pas", "pas à pas", "etape par etape",
      "étape par étape", "debutant", "débutant", "debutants", "débutants",
      "apprendre", "apprentissage", "formation", "cours", "maitriser",
      "maîtriser", "maitrise", "maîtrise", "prise en main", "utiliser",
      "comment", "checklist", "astuce", "astuces", "conseil", "conseils",
      "reflexe", "réflexe", "exercice", "pratique",
    ],
    couleur: {
      pastille: "bg-sky-500/10 text-sky-500",
      heros: "from-sky-500/15 via-white to-white",
      survol: "hover:border-sky-500",
      badge: "bg-sky-500/10 text-sky-500",
    },
  },
  {
    slug: "webgiverse-comparatif",
    nom: "Webgiverse Comparatif",
    court: "Comparatif",
    accroche: "ChatGPT vs Claude, outils gratuits vs payants…",
    description:
      "Les face-à-face tranchés : ChatGPT contre Claude, Gemini contre le reste du monde, versions gratuites contre abonnements payants. Forces, faiblesses, prix : on te dit clairement pour qui chaque option gagne.",
    icone: "Scale",
    motsCles: [
      "vs", "comparatif", "comparatifs", "comparaison", "comparer",
      "compare", "comparé", "face a face", "face à face", "duel",
      "contre", "ou", "lequel", "laquelle", "meilleur que", "mieux que",
      "difference", "différence", "differences", "différences", "choisir",
      "choix", "gratuit vs payant", "payant", "payants", "prix", "tarif",
      "tarifs", "abonnement", "abonnements", "verdict", "gagnant",
      "chatgpt", "claude", "gemini", "copilot", "midjourney",
      "perplexity", "deepseek",
    ],
    couleur: {
      pastille: "bg-magenta/10 text-magenta",
      heros: "from-magenta/10 via-white to-white",
      survol: "hover:border-magenta",
      badge: "bg-magenta/10 text-magenta",
    },
  },
  {
    slug: "webgiverse-automation",
    nom: "Webgiverse Automation",
    court: "Automation",
    accroche: "Agents IA, automatisations et workflows.",
    description:
      "Agents IA, automatisations et workflows : construis des chaînes qui travaillent pour toi 24 h/24. Des recettes concrètes avec Zapier, Make, n8n et les meilleurs agents, du premier scénario aux montages avancés.",
    icone: "Workflow",
    motsCles: [
      "agent", "agents", "agentique", "automatisation", "automatisations",
      "automatiser", "automatique", "automatisée", "automatise", "workflow",
      "workflows", "zapier", "make", "n8n", "no-code", "nocode",
      "integration", "intégration", "integrations", "intégrations",
      "connexion", "connecter", "chaine", "chaîne", "pipeline",
      "productivite", "productivité", "gagner du temps", "efficacite",
      "efficacité", "scenario", "scénario", "recette", "tache",
      "tâche", "taches", "tâches", "routin", "gpt personnalisé",
    ],
    couleur: {
      pastille: "bg-turquoise/20 text-ciel-fonce",
      heros: "from-turquoise/15 via-white to-white",
      survol: "hover:border-turquoise",
      badge: "bg-turquoise/20 text-ciel-fonce",
    },
  },
];

/** Retrouve une série par son slug (ou undefined si inconnu). */
export function serieParSlug(slug: string): SerieWebgiverse | undefined {
  return SERIES_WEBGIVERSE.find((s) => s.slug === slug);
}