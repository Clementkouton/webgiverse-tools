// lib/acces-tutoriels.ts
// ─────────────────────────────────────────────────────────────────
// SOURCE DE VÉRITÉ de l'accès par abonnement aux tutoriels.
// Un seul endroit décide ce que chaque plan débloque : la matrice
// CAPACITES_PAR_PLAN ci-dessous. Pages, actions serveur et routes API
// passent tous par ici — le verrouillage est donc identique partout
// (impossible d'« ouvrir » une fonction côté client uniquement).
//
// Plans (lib/plans.ts) : Découverte (gratuit) · Pro · Entreprise.
// ─────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";
import type { NiveauTuto } from "@prisma/client";

/** Plans reconnus par la grille d'accès aux tutoriels. */
export type PlanAcces = "DECOUVERTE" | "PRO" | "ENTREPRISE";

/** Chaque fonctionnalité verrouillable de la page / d'un tutoriel. */
export type CapaciteTuto =
  | "tutoIntermediaireAvance" // regarder les vidéos Intermédiaire et Avancé
  | "descriptionRessources" // chapitres horodatés, ressources, points clés
  | "progression" // suivi « En cours / Terminé »
  | "notes" // prise de notes privée
  | "exportNotes" // export des notes (Markdown, TXT, PDF)
  | "assistantTuto"; // chat IA du tutoriel (résumé + questions/réponses)

/** Matrice plan → capacités. Modifier ICI suffit pour changer les règles. */
const CAPACITES_PAR_PLAN: Record<PlanAcces, readonly CapaciteTuto[]> = {
  DECOUVERTE: [],
  PRO: [
    "tutoIntermediaireAvance",
    "descriptionRessources",
    "progression",
    "notes",
    "exportNotes",
    "assistantTuto",
  ],
  ENTREPRISE: [
    "tutoIntermediaireAvance",
    "descriptionRessources",
    "progression",
    "notes",
    "exportNotes",
    "assistantTuto",
  ],
};

/** Accès calculé pour un visiteur précis, avec sa fonction « peut() ». */
export type AccesTutoriels = {
  connecte: boolean;
  plan: PlanAcces;
  premium: boolean;
  /** true si le plan de ce visiteur débloque la capacité demandée. */
  peut: (capacite: CapaciteTuto) => boolean;
};

const ACCES_INVITE: AccesTutoriels = {
  connecte: false,
  plan: "DECOUVERTE",
  premium: false,
  peut: () => false,
};

/**
 * Calcule l'accès d'un visiteur à partir de son abonnement en base.
 * Défensif : table absente / erreur → plan Découverte, la page reste
 * affichable (jamais de crash à cause de l'accès).
 */
export async function accesTutoriels(
  utilisateurId: string | null | undefined,
): Promise<AccesTutoriels> {
  if (!utilisateurId) return ACCES_INVITE;
  try {
    const abonnement = await prisma.abonnement.findUnique({
      where: { utilisateurId },
      select: { plan: true, statut: true, expireLe: true },
    });
    const actif = Boolean(
      abonnement &&
        abonnement.statut === "ACTIF" &&
        abonnement.expireLe > new Date(),
    );
    const plan: PlanAcces =
      actif && (abonnement!.plan === "PRO" || abonnement!.plan === "ENTREPRISE")
        ? abonnement!.plan
        : "DECOUVERTE";
    const capacites = CAPACITES_PAR_PLAN[plan];
    return {
      connecte: true,
      plan,
      premium: plan !== "DECOUVERTE",
      peut: (capacite) => capacites.includes(capacite),
    };
  } catch {
    // Table Abonnement absente (db push pas encore lancé) → plan gratuit
    return { connecte: true, plan: "DECOUVERTE", premium: false, peut: () => false };
  }
}

/** Un tutoriel de ce niveau est-il réservé aux abonnés Premium ? */
export function tutoNiveauPremium(niveau: NiveauTuto): boolean {
  return niveau === "INTERMEDIAIRE" || niveau === "AVANCE";
}

/**
 * Peut-il REGARDER la vidéo de ce tutoriel ?
 * · Débutant : tout membre connecté (offert, règle « tutoriels gratuits »)
 * · Intermédiaire / Avancé : abonnés Premium uniquement
 * · Visiteur non connecté : jamais (invitation à se connecter)
 */
export function peutRegarderTuto(parametres: {
  niveau: NiveauTuto;
  connecte: boolean;
  premium: boolean;
}): boolean {
  if (!parametres.connecte) return false;
  if (!tutoNiveauPremium(parametres.niveau)) return true;
  return parametres.premium;
}

/** Vérification serveur pour les actions / routes API (notes, progression…). */
export async function aCapaciteServeur(
  utilisateurId: string,
  capacite: CapaciteTuto,
): Promise<boolean> {
  const acces = await accesTutoriels(utilisateurId);
  return acces.peut(capacite);
}