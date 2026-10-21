import { deaccentuer } from "@/lib/utils";

export type Diagnostic = {
  objectif: string;
  niveau: "Débutant" | "Intermédiaire" | "Avancé";
  budget: "gratuit" | "petit" | "confort";
};

export type OutilSimple = {
  id?: string; slug: string; nom: string; description: string;
  tarif: string; tarifMin: number | null; gratuit: boolean; openSource: boolean;
  niveau: string; objectifs: string[]; categories: string[]; type: string;
};

export type Reco = { outil: OutilSimple; points: number; explication: string };

const MOTS_OBJECTIF: Record<string, string[]> = {
  Vendre: ["vente", "commercial", "marketing", "seo", "prospection", "client", "crm"],
  "Créer du contenu": ["rédaction", "texte", "image", "vidéo", "voix", "design", "contenu", "visuel", "présentation", "musique", "montage"],
  Automatiser: ["automatisation", "agent", "workflow", "scénario", "intégration", "tâche"],
  Coder: ["code", "développement", "éditeur", "application", "déployer"],
  Communiquer: ["traduction", "voix", "e-mail", "réunion", "transcription", "doublage"],
  Apprendre: ["recherche", "résumé", "document", "lecture", "veille", "sources"],
  Gérer: ["gestion", "organisation", "productivité", "réunion", "crm", "projet", "notes"],
};

export function selectionnerOutils(outils: OutilSimple[], diagnostic: Diagnostic): Reco[] {
  // 1. Filtre budget
  const candidats = outils.filter((o) => {
    if (diagnostic.budget === "gratuit") return o.gratuit || (o.tarifMin ?? 0) === 0;
    if (diagnostic.budget === "petit") return (o.tarifMin ?? 0) <= 20;
    return true;
  });

  const mots = MOTS_OBJECTIF[diagnostic.objectif] ?? [];

  const notes = candidats.map((outil) => {
    let points = 0;
    const forts: string[] = [];

    // 2. Objectif déclaré sur la fiche
    if (outil.objectifs.includes(diagnostic.objectif)) {
      points += 3;
      forts.push(`répond directement à « ${diagnostic.objectif} »`);
    }
    // 3. Mots-clés de l'objectif présents dans la fiche
    const fiche = deaccentuer(
      [outil.nom, outil.description, outil.objectifs.join(" "), outil.categories.join(" ")].join(" ").toLowerCase()
    );
    const touches = mots.filter((m) => fiche.includes(m));
    if (touches.length) {
      points += Math.min(6, touches.length * 2);
      forts.push(`couvre : ${touches.slice(0, 3).join(", ")}`);
    }
    // 4. Niveau
    if (outil.niveau === diagnostic.niveau) points += 2;
    else if (outil.niveau === "Avancé" && diagnostic.niveau === "Débutant") points -= 3;
    if (outil.niveau === "Débutant" && diagnostic.niveau === "Débutant") {
      forts.push("accessible sans compétences techniques");
    }
    // 5. Bonus gratuit
    if (diagnostic.budget === "gratuit" && (outil.gratuit || (outil.tarifMin ?? 0) === 0)) {
      points += 1;
      forts.push("version gratuite suffisante pour démarrer");
    }
    if (outil.niveau === "Avancé" && diagnostic.niveau === "Débutant") {
      forts.push("prévois un peu de mise en route (niveau avancé)");
    }
    return { outil, points, forts };
  });

  return notes
    .filter((n) => n.points >= 2)
    .sort((a, b) => b.points - a.points || Number(b.outil.gratuit) - Number(a.outil.gratuit) || a.outil.nom.localeCompare(b.outil.nom))
    .slice(0, 3)
    .map(({ outil, points, forts }) => ({
      outil, points,
      explication: [
        `${outil.nom} colle à ton objectif « ${diagnostic.objectif} ».`,
        forts.length ? `${forts.join(" ; ")}.` : "",
        outil.gratuit ? "Version gratuite utilisable dès aujourd'hui." : `Tarif indicatif : ${outil.tarif}.`,
      ].filter(Boolean).join(" "),
    }));
}