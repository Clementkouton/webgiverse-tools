// content/faq-tarifs.ts — les 6 questions spécifiques aux paiements.
// Elles sont DIFFÉRENTES des 10 questions de content/faq.ts (page /faq) :
// deux pages distinctes, deux ensembles de questions, donc deux données
// structurées FAQPage séparées pour Google. Pas de doublon.
//
// Lot 75 — la réponse « Pro ou Entreprise » cite désormais TOUTES les
// fonctionnalités d'équipe du plan Entreprise (mêmes quotas que
// lib/plans.ts et content/comparatif-plans.ts) : Mon équipe (4),
// Partage des listes (10 collaborateurs par liste), Listes partagées
// avec moi, Clés d'API (5 actives), Modèles de listes.
import type { QuestionFaq } from "@/content/faq";

export const FAQ_TARIFS: QuestionFaq[] = [
  {
    question: "Puis-je arrêter mon abonnement quand je veux ?",
    reponse:
      "Oui. Le Premium est prépayé 30 jours, sans reconduction automatique : à l'échéance, tu repars simplement sur le plan Découverte, sans résiliation à faire ni facture surprise. Tes favoris et tes listes sont conservés — tu ne peux juste plus dépasser les limites du plan gratuit tant que tu n'as pas repris un abonnement.",
  },
  {
    question: "Quels moyens de paiement acceptez-vous ?",
    reponse:
      "Le paiement passe par Chariow, notre prestataire sécurisé : Mobile Money (MTN, Moov, Orange, Wave…) et cartes Visa / Mastercard, depuis n'importe quel pays. Webgiverse ne voit jamais tes codes ni ton numéro de carte.",
  },
  {
    question: "Mon Premium s'active-t-il tout seul après le paiement ?",
    reponse:
      "Oui, à condition de payer avec la même adresse e-mail que ton compte Webgiverse : l'activation est alors automatique, en quelques secondes. Tu as payé avec une autre adresse ? Écris-nous depuis la page Contact avec les deux adresses, on active ton compte manuellement.",
  },
  {
    question: "Que se passe-t-il à la fin de mes 30 jours ?",
    reponse:
      "Ton compte repasse automatiquement sur le plan Découverte, gratuit. Rien n'est débité sans ton accord, puisque l'abonnement n'est pas reconduit. Tu peux reprendre un abonnement à tout moment depuis cette page : tu retrouveras tes favoris comme si de rien n'était.",
  },
  {
    question: "Pro ou Entreprise : lequel choisir ?",
    reponse:
      "Pro ($2,99/mois) couvre un usage personnel : favoris et listes illimités, assistant IA illimité et suggestions d'outils prioritaires (le double). Entreprise ($7,99/mois) ajoute tout l'espace équipe : Mon équipe (jusqu'à 4 collaborateurs invités), Partage des listes (10 collaborateurs par liste), Listes partagées avec moi, Clés d'API (5 clés actives) et Modèles de listes prêts à l'emploi en un clic — plus les alertes hebdomadaires des nouveaux outils, l'accès anticipé aux nouveautés, l'historique d'activité étendu (200 entrées) et le support prioritaire.",
  },
  {
    question: "Puis-je changer de plan plus tard ?",
    reponse:
      "Oui. Depuis cette page ou depuis ton espace « Gérer mon abonnement », choisis simplement l'autre plan et ton abonnement bascule sur le nouveau. Pour une bascule en cours de période payée ou toute question particulière, écris-nous via la page Contact : on s'occupe de toi manuellement.",
  },
];