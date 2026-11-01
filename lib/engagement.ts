// lib/engagement.ts
// ─────────────────────────────────────────────────────────────────
// Lot 20 — Engagement & rétention : streak d'activité (🔥 jours
// consécutifs) et checklist d'onboarding (jauge « Profil complété »).
// Fonctions pures, sans accès base : les données viennent du dashboard.
// ─────────────────────────────────────────────────────────────────

/**
 * Calcule le nombre de jours consécutifs d'activité.
 * - Le streak compte depuis AUJOURD'HUI si l'utilisateur est actif
 *   aujourd'hui, sinon depuis HIER (on ne casse pas un streak parce
 *   que la journée en cours n'est pas encore commencée).
 * - Toutes les dates sont comparées en heure LOCALE du serveur,
 *   cohérent avec le graphique « 7 derniers jours ».
 */
export function calculerStreak(dates: Date[], maintenant: Date = new Date()): number {
  const jours = new Set<string>();
  for (const d of dates) {
    const copie = new Date(d);
    jours.add(
      `${copie.getFullYear()}-${String(copie.getMonth() + 1).padStart(2, "0")}-${String(copie.getDate()).padStart(2, "0")}`,
    );
  }

  const cleJour = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const aujourdhui = new Date(maintenant);
  aujourdhui.setHours(0, 0, 0, 0);

  // Point de départ : aujourd'hui si actif, sinon hier.
  let curseur = aujourdhui;
  if (!jours.has(cleJour(aujourdhui))) {
    curseur = new Date(aujourdhui);
    curseur.setDate(curseur.getDate() - 1);
    if (!jours.has(cleJour(curseur))) return 0;
  }

  let streak = 0;
  while (jours.has(cleJour(curseur))) {
    streak += 1;
    curseur = new Date(curseur);
    curseur.setDate(curseur.getDate() - 1);
  }
  return streak;
}

// ── Checklist d'onboarding ──────────────────────────────────────

export type ItemOnboarding = {
  libelle: string;
  fait: boolean;
  href: string;
  action: string; // texte du bouton / lien
};

export type ResultatOnboarding = {
  items: ItemOnboarding[];
  faites: number;
  total: number;
  pourcentage: number;
};

type DonneesOnboarding = {
  objectif: string | null;
  niveau: string | null;
  budget: string | null;
  nbFavoris: number;
  nbAvis: number;
  nbTutosTermines: number;
  nbRecommandations: number;
  nbListes: number;
};

/**
 * Jauge « Profil complété à X % » : 6 étapes, chacune vaut 1/6.
 * Les liens mènent directement à la page où faire l'action
 * (le diagnostic IA est l'assistant /assistant, comme le bouton
 * « Refaire le diagnostic » de la carte Mon profil).
 */
export function calculerOnboarding(d: DonneesOnboarding): ResultatOnboarding {
  const profilComplet = Boolean(d.objectif && d.niveau && d.budget);

  const items: ItemOnboarding[] = [
    {
      libelle: "Compléter ton profil (objectif, niveau, budget)",
      fait: profilComplet,
      href: "/dashboard?onglet=apercu#profil",
      action: profilComplet ? "C'est fait ✓" : "Ouvrir mon profil",
    },
    {
      libelle: "Faire le diagnostic IA pour des recommandations sur mesure",
      fait: d.nbRecommandations >= 1,
      href: "/assistant",
      action: d.nbRecommandations >= 1 ? "C'est fait ✓" : "Lancer le diagnostic",
    },
    {
      libelle: "Sauvegarder ton premier outil en favori",
      fait: d.nbFavoris >= 1,
      href: "/outils",
      action: d.nbFavoris >= 1 ? "C'est fait ✓" : "Explorer l'annuaire",
    },
    {
      libelle: "Organiser tes outils dans une liste",
      fait: d.nbListes >= 1,
      href: "/dashboard?onglet=listes",
      action: d.nbListes >= 1 ? "C'est fait ✓" : "Créer une liste",
    },
    {
      libelle: "Publier ton premier avis pour aider la communauté",
      fait: d.nbAvis >= 1,
      href: "/outils",
      action: d.nbAvis >= 1 ? "C'est fait ✓" : "Donner un avis",
    },
    {
      libelle: "Terminer ton premier tutoriel vidéo",
      fait: d.nbTutosTermines >= 1,
      href: "/tutoriels",
      action: d.nbTutosTermines >= 1 ? "C'est fait ✓" : "Voir les tutoriels",
    },
  ];

  const faites = items.filter((i) => i.fait).length;
  return {
    items,
    faites,
    total: items.length,
    pourcentage: Math.round((faites / items.length) * 100),
  };
}
