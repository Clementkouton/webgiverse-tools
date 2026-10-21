// content/accueil.ts — FAQ, prompts, actu, blog
export const FAQ = [
  { question: "Comment choisir un outil IA ?",
    reponse: "Commence par ta tâche la plus chronophage, pas par l'outil à la mode. Définis ton objectif (vendre, créer, automatiser), ton budget réel et ton niveau technique. Lance ensuite l'assistant Webgiverse : il te propose jusqu'à trois outils adaptés, gratuits d'abord. Teste chaque outil deux semaines sur un cas réel avant de payer." },
  { question: "Les outils gratuits suffisent-ils ?",
    reponse: "Pour démarrer, presque toujours. ChatGPT, Canva, CapCut ou Ollama offrent des versions gratuites pleinement utilisables. Passe au payant quand tu touches un plafond précis : volume, qualité ou gain de temps mesurable. Nos fiches signalent les gratuites généreuses avec le badge « Gratuit »." },
  { question: "Les tarifs affichés sont-ils à jour ?",
    reponse: "Les tarifs sont indicatifs et datés : chaque fiche affiche « vérifié le » avec la date du dernier contrôle. Les éditeurs changent leurs prix souvent, vérifie toujours sur le site officiel avant de t'abonner." },
  { question: "Je suis en Afrique francophone, ces outils marchent-ils ?",
    reponse: "Oui, la plupart fonctionnent partout. Pour les paiements, privilégie les outils gratuits ou ceux qui acceptent les cartes prépayées. Ollama exécute des modèles en local, sans connexion stable. Le Chat de Mistral, hébergé en Europe, reste très accessible depuis le continent." },
  { question: "Comment proposer un outil ?",
    reponse: "Clique sur « Proposer un outil » et remplis le formulaire, deux minutes suffisent. L'équipe vérifie la fiche — réel, utile, disponible en français de préférence — puis la publie dans l'annuaire." },
];

export const PROMPTS = [
  { titre: "Audit express de ton offre", description: "Clarifie ta promesse et tes objections en 5 minutes.",
    texte: "Tu es consultant digital. Analyse l'offre suivante : [décris ton produit/service et ton prix]. Identifie : 1) la promesse la plus crédible, 2) les trois objections principales des clients, 3) une reformulation de l'offre en une phrase orientée bénéfice. Réponds en français, en tableau." },
  { titre: "Plan de contenu 30 jours", description: "Un mois de contenus structuré en trois axes.",
    texte: "Agenda de contenu : à partir du thème [ton thème] et de la cible [ta cible], propose un plan de 30 jours (format, angle, appel à l'action) réparti sur trois axes : attirer, convaincre, fidéliser. Format tableau, en français." },
  { titre: "Page de vente orientée conversion", description: "Le squelette complet, prêt à remplir.",
    texte: "Rédige le squelette d'une page de vente pour [offre] destinée à [cible] : accroche, problème, solution, preuve, offre, garantie, FAQ (cinq questions), appel à l'action. Ton direct, phrases courtes, en français." },
  { titre: "Traduction localisée Afrique francophone", description: "Un français naturel, adapté au public.",
    texte: "Traduis ce texte en français naturel pour un public d'Afrique de l'Ouest : [texte]. Garde le sens, adapte les exemples et les tournures, pas de mot à mot. Signale les points culturels à vérifier." },
];

export const ACTU = [
  { titre: "Les derniers modèles Claude arrivent sur Claude.ai", source: "Blog Anthropic", url: "https://www.anthropic.com/news" },
  { titre: "Mistral publie les nouveautés du Chat", source: "Mistral AI", url: "https://mistral.ai/news" },
  { titre: "Google fait évoluer Gemini et NotebookLM", source: "Google Blog", url: "https://blog.google/technology/ai/" },
];

export const ARTICLES = [
  { titre: "7 outils IA gratuits pour lancer ton activité", extrait: "Le combo gratuit pour démarrer sans budget : rédaction, design, vidéo et automatisation." },
  { titre: "Agent ou outil : que choisir pour automatiser ?", extrait: "Un agent décide et enchaîne, un outil exécute une tâche. Voici comment trancher." },
  { titre: "IA et Afrique francophone : par où commencer", extrait: "Connexions, paiements, langues : le guide réaliste pour tirer parti de l'IA." },
];