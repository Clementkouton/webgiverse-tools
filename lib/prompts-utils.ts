// lib/prompts-utils.ts
// ─────────────────────────────────────────────────────────────────
// Lot 17 — Bibliothèque de prompts IA. Données statiques françaises :
// rôles (pages /prompts/role/[slug]), libellés des types et modèles
// compatibles par type de prompt. Aucune donnée métier ici : les
// catégories et les prompts vivent en base (Prisma).
// ─────────────────────────────────────────────────────────────────

export type RolePrompt = {
  slug: string; // ex: "entrepreneurs" — utilisé dans l'URL et le tableau Prompt.roles[]
  nom: string; // ex: "Entrepreneurs"
};

/** Les 24 rôles métiers de la bibliothèque (ordre d'affichage). */
export const ROLES: RolePrompt[] = [
  { slug: "solopreneurs", nom: "Solopreneurs" },
  { slug: "entrepreneurs", nom: "Entrepreneurs" },
  { slug: "chefs-entreprise", nom: "Chefs d'entreprise" },
  { slug: "freelances", nom: "Freelances" },
  { slug: "agences", nom: "Agences" },
  { slug: "vendeurs-e-commerce", nom: "Vendeurs e-commerce" },
  { slug: "marketeurs", nom: "Marketeurs" },
  { slug: "equipes-de-vente", nom: "Équipes de vente" },
  { slug: "copywriters", nom: "Copywriters" },
  { slug: "createurs-de-contenu", nom: "Créateurs de contenu" },
  { slug: "designers", nom: "Designers" },
  { slug: "photographes", nom: "Photographes" },
  { slug: "developpeurs", nom: "Développeurs" },
  { slug: "ingenieurs-ia", nom: "Ingénieurs IA" },
  { slug: "avocats", nom: "Avocats" },
  { slug: "medecins", nom: "Médecins" },
  { slug: "comptables", nom: "Comptables" },
  { slug: "agents-immobiliers", nom: "Agents immobiliers" },
  { slug: "recruteurs", nom: "Recruteurs" },
  { slug: "enseignants", nom: "Enseignants" },
  { slug: "etudiants", nom: "Étudiants" },
  { slug: "coachs", nom: "Coachs" },
  { slug: "consultants", nom: "Consultants" },
  { slug: "assistants-virtuels", nom: "Assistants virtuels" },
  { slug: "traders", nom: "Traders" },
];

/** Retrouve un rôle par son slug (pour les pages /prompts/role/[slug]). */
export function roleParSlug(slug: string): RolePrompt | undefined {
  return ROLES.find((r) => r.slug === slug);
}

/** Libellé lisible d'un slug de rôle (inconnu → slug brut). */
export function nomRole(slug: string): string {
  return roleParSlug(slug)?.nom ?? slug;
}

export const LIBELLES_TYPE: Record<string, string> = {
  TEXTE: "Texte",
  IMAGE: "Image",
  CODE: "Code",
};

/** Modèles compatibles par type de prompt (badges de la fiche). */
export const MODELES_PAR_TYPE: Record<string, string[]> = {
  TEXTE: ["ChatGPT", "Claude", "Gemini", "Grok", "Mistral"],
  IMAGE: ["Midjourney", "Flux", "Nano Banana", "GPT Image"],
  CODE: ["ChatGPT", "Claude", "Gemini"],
};

/** Options du filtre de tri de la bibliothèque (formulaire GET /prompts). */
export const TRIS_PROMPTS = [
  { valeur: "pertinence", libelle: "Pertinence" },
  { valeur: "nouveautes", libelle: "Nouveautés" },
  { valeur: "vues", libelle: "Plus vus" },
  { valeur: "az", libelle: "A → Z" },
  { valeur: "za", libelle: "Z → A" },
];