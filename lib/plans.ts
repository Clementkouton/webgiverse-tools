// lib/plans.ts
// Configuration des plans premium — source de vérité unique.
// Le montant du paiement est TOUJOURS lu ici côté serveur, jamais envoyé par le client.
// Le montant est stocké en CENTIMES (299 = 2,99 USD) ; il est converti en unité
// principale (2,99) uniquement au moment de l'appel à l'API Moneroo.

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
    accroche: "Pour explorer l'annuaire sans limite",
    recommande: true,
      avantages: [
      "Tous les tutoriels vidéo : Débutant, Intermédiaire et Avancé",
      "Chapitres, ressources et points clés de chaque tuto",
      "Notes privées sur les tutoriels + export (PDF, Markdown, TXT)",
      "Assistant IA des tutoriels : résumés et questions/réponses",
      "Suivi de progression « En cours / Terminé »",
      "Favoris et listes illimités",
      "Assistant IA illimité + badge Premium",
    ],
  },
  ENTREPRISE: {
    cle: "ENTREPRISE",
    nom: "Entreprise",
    montant: 799,
    prix: "$7,99",
    accroche: "Pour apprendre sans limite",
    recommande: false,
    avantages: [
      "Tous les avantages du plan Pro",
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