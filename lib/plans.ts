// lib/plans.ts
// Configuration des plans premium — source de vérité unique.
// Le montant du paiement est TOUJOURS lu ici côté serveur, jamais envoyé par le client.
// Le montant est stocké en CENTIMES (299 = 2,99 USD) ; il est converti en unité
// principale (2,99) uniquement au moment de l'appel à l'API Moneroo.
//
// Lot 74 — les avantages de chaque plan sont alignés sur les fonctionnalités
// réellement présentes dans l'application : bibliothèque de prompts /prompts
// (lecture + copie réservées Premium), bibliothèque de skills /skills (fiches
// détaillées réservées Premium, parcours libre pour tous), tutoriels vidéo
// (Débutant offert, Intermédiaire et Avancé réservés Premium), assistant IA
// (10 questions/mois en Découverte, illimité en Premium).
//
// Lot 75 — le plan Entreprise liste désormais TOUTES les fonctionnalités
// d'équipe réellement implémentées (aucune promesse inventée, quotas exacts
// du code) :
// · Mon équipe            → app/dashboard/equipe (MAX_MEMBRES_EQUIPE = 4,
//                           lib/premium.ts : jusqu'à 4 collaborateurs invités) ;
// · Partage des listes    → app/dashboard/partages (vue TITULAIRE, réservée
//                           ENTREPRISE actif ; 10 collaborateurs max par liste) ;
// · Listes partagées avec moi → app/dashboard/listes-partagees (vue membre :
//                           les listes de l'équipe réunies au même endroit) ;
// · Clés d'API            → app/dashboard/cles-api (MAX_CLES_ACTIVES = 5
//                           clés actives, app/actions/cles-api.ts) ;
// · Modèles de listes     → app/dashboard/modeles-listes + page publique
//                           /modeles : consultation pour tous, clonage
//                           « Utiliser ce modèle » réservé Entreprise.

export type ClePlan = "PRO" | "ENTREPRISE";

/** Durée d'un abonnement payé, en jours (prépaiement mensuel). */
export const DUREE_JOURS = 30;

export type Plan = {
  cle: ClePlan;
  nom: string;
  /** Montant en centimes de dollar (299 = 2,99 USD) — divisé par 100 à l'appel Moneroo. */
  montant: number;
  /** Prix affiché en français. */
  prix: string;
  accroche: string;
  recommande: boolean;
  avantages: string[];
};

export const PLANS: Record<ClePlan, Plan> = {
  PRO: {
    cle: "PRO",
    nom: "Pro",
    montant: 299,
    prix: "$2,99",
    accroche: "Prompts, skills, tutoriels et assistant sans limite",
    recommande: true,
    avantages: [
      "Bibliothèque de prompts : lecture et copie illimitées",
      "Fiches détaillées des skills IA : review, installation, retours d'usage",
      "Tous les tutoriels vidéo : Débutant, Intermédiaire et Avancé",
      "Chapitres, ressources et points clés de chaque tuto",
      "Notes privées sur les tutoriels + export (PDF, Markdown, TXT)",
      "Favoris et listes illimités",
      "Assistant IA illimité (annuaire + tutoriels) + badge Premium",
    ],
  },
  ENTREPRISE: {
    cle: "ENTREPRISE",
    nom: "Entreprise",
    montant: 799,
    prix: "$7,99",
    accroche: "Pour les équipes et les gros consommateurs d'IA",
    recommande: false,
    avantages: [
      "Tous les avantages du plan Pro (prompts, skills, tutoriels, assistant)",
      "Mon équipe : invite jusqu'à 4 collaborateurs",
      "Partage des listes : jusqu'à 10 collaborateurs par liste",
      "Listes partagées avec moi : l'espace commun de ton équipe",
      "Clés d'API : jusqu'à 5 clés actives",
      "Modèles de listes : utilise les modèles prêts à l'emploi en un clic",
      "Alertes hebdomadaires des nouveaux outils",
      "Accès anticipé aux nouveautés",
      "Historique d'activité étendu (200 entrées)",
      "Support prioritaire par email",
    ],
  },
};

/** Le plan gratuit est affiché sur la page tarifs mais ne se paie pas. */
export const PLAN_DECOUVERTE = {
  cle: "DECOUVERTE" as const,
  nom: "Découverte",
  prix: "$0",
  accroche: "Tout le nécessaire pour commencer",
  avantages: [
    "Accès complet à l'annuaire",
    "Tutoriels vidéo Débutant offerts",
    "Parcours libre des bibliothèques prompts et skills",
    "20 favoris et 10 listes",
    "Assistant IA (10 questions/mois)",
    "Avis et votes",
    "Export PDF de tes favoris",
  ],
};

export function formatePrix(centimes: number): string {
  return `$${(centimes / 100).toFixed(2)}`;
}

/** Vérifie que la clé reçue (formulaire/URL) correspond à un plan payant. */
export function planValide(cle: string | null | undefined): Plan | null {
  if (cle === "PRO" || cle === "ENTREPRISE") return PLANS[cle];
  return null;
}