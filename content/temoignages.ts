// content/temoignages.ts — témoignages affichés sur la page d'accueil
// (section « Ils ont trouvé leur outil »)
export type Temoignage = {
  nom: string;
  role: string;
  texte: string;
  note: number; // entre 1 et 5
};

export const TEMOIGNAGES: Temoignage[] = [
  {
    nom: "Awa D.",
    role: "Community manager, Dakar",
    texte:
      "J'ai trouvé en dix minutes un outil de montage vidéo gratuit qui tourne sur mon ordinateur. La fiche disait exactement ce que la version gratuite permet : aucune mauvaise surprise.",
    note: 5,
  },
  {
    nom: "Thomas L.",
    role: "Freelance web, Lyon",
    texte:
      "Ce qui me rassure, c'est le « vérifié le » sur chaque fiche. Les tarifs affichés correspondent à ce que j'ai retrouvé sur les sites officiels. Je consulte Webgiverse avant chaque nouveau projet.",
    note: 5,
  },
  {
    nom: "Fatoumata S.",
    role: "Étudiante, Abidjan",
    texte:
      "L'assistant m'a proposé trois outils pour réviser mes cours. J'ai tout testé gratuitement grâce au badge « Gratuit ». Mon mémoire n'a jamais avancé aussi vite.",
    note: 5,
  },
  {
    nom: "Marc-Antoine R.",
    role: "Gérant de boutique, Bruxelles",
    texte:
      "Je n'y connais rien en IA. Les fiches expliquent simplement, sans jargon. J'ai automatisé mes descriptions produits avec un outil trouvé dans la liste des gratuits.",
    note: 4,
  },
  {
    nom: "Chimène B.",
    role: "Coach linguistique, Lille",
    texte:
      "Le classement par catégories m'a fait gagner des semaines de veille. Je recommande Webgiverse à toutes mes clientes qui veulent se lancer avec l'IA.",
    note: 5,
  },
  {
    nom: "Ibrahima K.",
    role: "Développeur junior, Bamako",
    texte:
      "Ollama en local, expliqué pour une connexion instable : personne ne m'avait donné un conseil aussi concret. Ce site comprend vraiment son public francophone.",
    note: 5,
  },
];