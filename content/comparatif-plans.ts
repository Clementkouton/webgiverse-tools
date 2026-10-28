// content/comparatif-plans.ts
// Tableau comparatif des 3 plans, affiché sous les cartes de /tarifs.
// ⚠️ Chaque ligne DOIT rester fidèle aux avantages annoncés dans
// lib/plans.ts (PLAN_DECOUVERTE + PLANS) : pas de promesse inventée.
// Une cellule vaut soit `true` / `false` (coche ou trait), soit un texte court.

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
    decouverte: "Basique",
    pro: "Enrichi",
    entreprise: "Enrichi",
  },
  {
    label: "Suggestions d'outils prioritaires",
    decouverte: false,
    pro: true,
    entreprise: true,
  },
  {
    label: "Marque-pages de progression",
    decouverte: "Standard",
    pro: "Avancés",
    entreprise: "Avancés",
  },
  {
    label: "Historique d'activité étendu",
    decouverte: false,
    pro: false,
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