// lib/assistant/contexte.ts
import { prisma } from "@/lib/prisma";

// lib/assistant/contexte.ts
// Utilitaires de traitement du texte français pour l'assistant

// Supprime les accents d'un texte
export function deaccentuer(texte: string): string {
  return texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Mots vides français (sans accents, car tokeniser déaccentue avant de filtrer)
const MOTS_VIDES: string[] = [
  "le", "la", "les", "un", "une", "des", "du", "de", "d", "l",
  "et", "ou", "mais", "donc", "or", "ni", "car",
  "je", "tu", "il", "elle", "nous", "vous", "ils", "elles", "on",
  "me", "moi", "te", "se", "y", "en",
  "mon", "ton", "son", "ma", "ta", "sa", "mes", "tes", "ses", "notre", "votre",
  "ce", "cet", "cette", "ces",
  "est", "sont", "etre", "avoir", "ai", "as", "avons", "avez", "ont", "ete",
  "pour", "avec", "sans", "sur", "sous", "dans", "au", "aux", "par",
  "quel", "quelle", "quels", "quelles", "veux", "voudrais", "aimerais", "besoin",
  "cherche", "trouve", "donne", "propose", "outils", "outil", "meilleur", "meilleure",
  "faire", "fais", "peux", "connais", "gratuit", "gratuits", "aussi", "plus", "tres",
];

// Découpe un texte en mots-clés pertinents
export function tokeniser(texte: string): string[] {
  return deaccentuer(texte.toLowerCase())
    .split(/[^a-z0-9]+/)
    .filter((mot) => mot.length > 1 && !MOTS_VIDES.includes(mot));
}

export async function outilsPertinents(question: string, limite = 12) {
  const outils = await prisma.tool.findMany({
    where: { statut: "PUBLIE" },
    include: { categories: { include: { categorie: true } } },
  });
  const mots = tokeniser(question);
  if (!mots.length) return outils.filter((o) => o.misEnAvant).slice(0, limite);

  const notes = outils.map((outil) => {
    const nom = deaccentuer(outil.nom.toLowerCase());
    const description = deaccentuer(outil.description.toLowerCase());
    const cles = deaccentuer(
      [...outil.objectifs, ...outil.categories.map((c) => c.categorie.nom)].join(" ").toLowerCase()
    );
    let score = 0;
    for (const mot of mots) {
      if (nom.includes(mot)) score += 5;
      if (description.includes(mot)) score += 2;
      if (cles.includes(mot)) score += 2;
    }
    return { outil, score };
  });

  const retenus = notes.filter((n) => n.score > 0).sort((a, b) => b.score - a.score).slice(0, limite);
  return (retenus.length ? retenus : outils.filter((o) => o.misEnAvant).map((outil) => ({ outil, score: 0 })))
    .slice(0, limite)
    .map((n) => n.outil);
}