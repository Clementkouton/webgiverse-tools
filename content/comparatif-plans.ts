// content/comparatif-plans.ts
// Tableau comparatif des 3 plans, affiché sous les cartes de /tarifs.
// ⚠️ Chaque ligne DOIT rester fidèle aux avantages annoncés dans
// lib/plans.ts (PLAN_DECOUVERTE + PLANS) : pas de promesse inventée.
// Une cellule vaut soit `true` / `false` (coche ou trait), soit un texte court.
//
// Lot 74 — lignes ajoutées pour refléter les bibliothèques réelles :
// · Prompts /prompts : parcours libre pour tous, lecture + copie du
//   contenu complet réservées Premium (Pro et Entreprise).
// · Skills /skills : parcours libre pour tous, fiches détaillées
//   (review, installation, retours) réservées Premium.
// · Tutoriels : Débutant offert en Découverte, Intermédiaire et
//   Avancé réservés Premium.
//
// Lot 75 — lignes ajoutées pour les fonctionnalités d'équipe du plan
// Entreprise, avec les quotas EXACTS du code (aucune approximation) :
// · Mon équipe : jusqu'à 4 collaborateurs invités (MAX_MEMBRES_EQUIPE = 4).
// · Partage des listes : 10 collaborateurs maximum par liste.
// · Listes partagées avec moi : vue membre (siège d'équipe).
// · Clés d'API : 5 clés actives maximum (MAX_CLES_ACTIVES = 5).
// · Modèles de listes : consultation publique pour tous (/modeles),
//   clonage « Utiliser ce modèle » réservé Entreprise.

export type CelluleComparatif = string | boolean;

export type LigneComparatif = {
  label: string;
  decouverte: CelluleComparatif;
  pro: CelluleComparatif;
  entreprise: CelluleComparatif;
};

export const LIGNES_COMPARATIF: LigneComparatif[] = [
  {
    label: "Accès complet à l'annuaire",
    decouverte: true,
    pro: true,
    entreprise: true,
  },
  {
    label: "Tutoriels vidéo intermédiaires et avancés",
    decouverte: false,
    pro: true,
    entreprise: true,
  },
  {
    label: "Bibliothèque de prompts (lecture + copie)",
    decouverte: "Parcours seulement",
    pro: "Illimités",
    entreprise: "Illimités",
  },
  {
    label: "Fiches détaillées des skills IA",
    decouverte: false,
    pro: true,
    entreprise: true,
  },
  {
    label: "Favoris",
    decouverte: "20",
    pro: "Illimités",
    entreprise: "Illimités",
  },
  {
    label: "Listes d'outils",
    decouverte: "10",
    pro: "Illimitées",
    entreprise: "Illimitées",
  },
  {
    label: "Mon équipe (inviter des collaborateurs)",
    decouverte: false,
    pro: false,
    entreprise: "Jusqu'à 4",
  },
  {
    label: "Partage des listes",
    decouverte: false,
    pro: false,
    entreprise: "10 collaborateurs / liste",
  },
  {
    label: "Listes partagées avec moi",
    decouverte: false,
    pro: false,
    entreprise: true,
  },
  {
    label: "Clés d'API",
    decouverte: false,
    pro: false,
    entreprise: "5 actives",
  },
  {
    label: "Modèles de listes (clonage en un clic)",
    decouverte: "Consultation",
    pro: "Consultation",
    entreprise: true,
  },
  {
    label: "Questions d'assistant par mois",
    decouverte: "10",
    pro: "Illimitées",
    entreprise: "Illimitées",
  },
  {
    label: "Avis et recommandations",
    decouverte: true,
    pro: true,
    entreprise: true,
  },
  {
    label: "Badge Premium sur ton profil",
    decouverte: false,
    pro: true,
    entreprise: true,
  },
  {
    label: "Export PDF de tes favoris",
    decouverte: true,
    pro: true,
    entreprise: true,
  },
  {
    label: "Suggestions d'outils par objectif",
    decouverte: "3",
    pro: "6 (prioritaires)",
    entreprise: "6 (prioritaires)",
  },
  {
    label: "Marque-pages de progression",
    decouverte: "Standard",
    pro: "Avancés",
    entreprise: "Avancés",
  },
  {
    label: "Historique d'activité",
    decouverte: "25 dernières",
    pro: "25 dernières",
    entreprise: "Étendu : 200",
  },
  {
    label: "Suivi de progression (À tester → En cours → Adopté)",
    decouverte: true,
    pro: true,
    entreprise: true,
  },
  {
    label: "Alertes hebdo des nouveaux outils",
    decouverte: false,
    pro: false,
    entreprise: true,
  },
  {
    label: "Accès anticipé aux nouveautés",
    decouverte: false,
    pro: false,
    entreprise: true,
  },
  {
    label: "Support par e-mail",
    decouverte: "Standard",
    pro: "Standard",
    entreprise: "Prioritaire",
  },
];