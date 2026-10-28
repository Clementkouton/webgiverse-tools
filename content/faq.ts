// content/faq.ts — les 10 questions fréquentes de la page /faq
// Les 5 premières sont les mêmes que sur l'accueil (content/accueil.ts).
export type QuestionFaq = {
  question: string;
  reponse: string;
};

export const FAQ_COMPLETE: QuestionFaq[] = [
  {
    question: "Comment choisir un outil IA ?",
    reponse:
      "Commence par ta tâche la plus chronophage, pas par l'outil à la mode. Définis ton objectif (vendre, créer, automatiser), ton budget réel et ton niveau technique. Lance ensuite l'assistant Webgiverse : il te propose jusqu'à trois outils adaptés, gratuits d'abord. Teste chaque outil deux semaines sur un cas réel avant de payer.",
  },
  {
    question: "Les outils gratuits suffisent-ils ?",
    reponse:
      "Pour démarrer, presque toujours. ChatGPT, Canva, CapCut ou Ollama offrent des versions gratuites pleinement utilisables. Passe au payant quand tu touches un plafond précis : volume, qualité ou gain de temps mesurable. Nos fiches signalent les gratuites généreuses avec le badge « Gratuit ».",
  },
  {
    question: "Les tarifs affichés sont-ils à jour ?",
    reponse:
      "Les tarifs sont indicatifs et datés : chaque fiche affiche « vérifié le » avec la date du dernier contrôle. Les éditeurs changent leurs prix souvent, vérifie toujours sur le site officiel avant de t'abonner.",
  },
  {
    question: "Je suis en Afrique francophone, ces outils marchent-ils ?",
    reponse:
      "Oui, la plupart fonctionnent partout. Pour les paiements, privilégie les outils gratuits ou ceux qui acceptent les cartes prépayées. Ollama exécute des modèles en local, sans connexion stable. Le Chat de Mistral, hébergé en Europe, reste très accessible depuis le continent.",
  },
  {
    question: "Comment proposer un outil ?",
    reponse:
      "Clique sur « Proposer un outil » et remplis le formulaire, deux minutes suffisent. L'équipe vérifie la fiche — réel, utile, disponible en français de préférence — puis la publie dans l'annuaire.",
  },
  {
    question: "Webgiverse est-il gratuit ?",
    reponse:
      "Oui. L'annuaire, l'assistant, les comparatifs et la lecture des fiches sont 100 % gratuits. Le plan Découverte suffit pour commencer (20 favoris, 10 listes, 10 questions d'assistant par mois). L'abonnement Premium — Pro à $2,99/mois, Entreprise à $7,99/mois — débloque les favoris illimités, l'export PDF enrichi et les alertes hebdomadaires. Tu peux utiliser le site au quotidien sans jamais payer.",
  },
  {
    question: "Comment Webgiverse gagne-t-il de l'argent ?",
    reponse:
      "Deux sources, affichées en toute transparence : certains liens vers les sites officiels sont des liens d'affiliation — ils financent le site sans jamais changer ton prix — et les abonnements Premium. Ni l'un ni l'autre n'influence notre sélection : aucun éditeur ne peut payer pour être mieux classé ou mieux noté.",
  },
  {
    question: "À quelle fréquence ajoutez-vous de nouveaux outils ?",
    reponse:
      "Chaque semaine. Chaque fiche est testée, rédigée en français puis datée : le badge « Vérifié le » sur les cartes indique quand le tarif et le lien ont été contrôlés pour la dernière fois. Si un outil devient payant, change de prix ou disparaît, sa fiche est mise à jour ou retirée de l'annuaire.",
  },
  {
    question: "Quelle est la différence entre un outil IA et un agent IA ?",
    reponse:
      "Un outil IA exécute une tâche quand tu l'utilises : rédiger un texte, générer une image, monter une vidéo. Un agent IA enchaîne plusieurs étapes tout seul pour atteindre l'objectif que tu lui donnes — chercher, trier, puis rédiger par exemple. Dans l'annuaire, les deux sont clairement séparés : filtre par type pour ne voir que ce dont tu as besoin.",
  },
  {
    question: "Comment supprimer mon compte et mes données ?",
    reponse:
      "Écris-nous depuis la page Contact avec l'adresse e-mail de ton compte : la suppression est effectuée sous 72 heures, favoris, listes et abonnement compris. Aucune donnée n'est vendue ni partagée avec des tiers.",
  },
];