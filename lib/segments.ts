// lib/segments.ts
// ─────────────────────────────────────────────────────────────────
// Lot 26 — SEGMENTS UTILISATEURS prêts à l'emploi de la console admin.
// Un seul endroit définit chaque segment (titre, description, requête
// Prisma) : la page /admin/segments l'affiche et la route API
// /api/admin/segments/[segment] l'exporte en CSV — zéro duplication.
//
// Segments :
//   • premium-expirant  : Premium actifs qui expirent sous 14 jours
//   • inactifs-30j      : inscrits depuis +30 j, aucune activité récente
//   • parrains-actifs   : membres dont le filleul a payé (récompensés)
//   • inscrits-semaine  : nouveaux membres des 7 derniers jours
// ─────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";

export type CleSegment =
  | "premium-expirant"
  | "inactifs-30j"
  | "parrains-actifs"
  | "inscrits-semaine";

export type DefinitionSegment = {
  cle: CleSegment;
  titre: string;
  description: string;
};

export const SEGMENTS: DefinitionSegment[] = [
  {
    cle: "premium-expirant",
    titre: "Premium expirant",
    description: "Abonnés actifs dont l'abonnement expire dans les 14 prochains jours — à relancer avant la date.",
  },
  {
    cle: "inactifs-30j",
    titre: "Inactifs 30 jours",
    description: "Membres inscrits depuis plus d'un mois, sans connexion, avis ni paiement récent — à réactiver.",
  },
  {
    cle: "parrains-actifs",
    titre: "Parrains actifs",
    description: "Membres qui ont invité quelqu'un dont l'abonnement a été récompensé — vos meilleurs ambassadeurs.",
  },
  {
    cle: "inscrits-semaine",
    titre: "Inscrits cette semaine",
    description: "Nouveaux membres des 7 derniers jours — le moment idéal pour un message de bienvenue.",
  },
];

export function estCleSegment(valeur: string): valeur is CleSegment {
  return SEGMENTS.some((s) => s.cle === valeur);
}

/** Ligne d'utilisateur d'un segment, telle qu'affichée puis exportée. */
export type UtilisateurSegment = {
  id: string;
  nom: string;
  email: string;
  inscritLe: Date;
  plan: string | null;
  premiumJusquAu: Date | null;
  /** Nombre de filleuls récompensés (segment parrains uniquement). */
  filleulsRecompenses: number;
};

/** Lit les membres d'un segment, triés du plus prioritaire au moins prioritaire. */
export async function lireUtilisateursSegment(
  cle: CleSegment,
): Promise<UtilisateurSegment[]> {
  const maintenant = new Date();
  const dans14j = new Date(maintenant);
  dans14j.setDate(dans14j.getDate() + 14);
  const ilYa30j = new Date(maintenant);
  ilYa30j.setDate(ilYa30j.getDate() - 30);
  const ilYa7j = new Date(maintenant);
  ilYa7j.setDate(ilYa7j.getDate() - 7);

  if (cle === "premium-expirant") {
    const abonnements = await prisma.abonnement.findMany({
      where: { statut: "ACTIF", expireLe: { gte: maintenant, lte: dans14j } },
      orderBy: { expireLe: "asc" },
      select: {
        expireLe: true,
        plan: true,
        utilisateur: { select: { id: true, name: true, email: true, createdAt: true } },
      },
    });
    return abonnements.map((a) => ({
      id: a.utilisateur.id,
      nom: a.utilisateur.name ?? "",
      email: a.utilisateur.email,
      inscritLe: a.utilisateur.createdAt,
      plan: a.plan,
      premiumJusquAu: a.expireLe,
      filleulsRecompenses: 0,
    }));
  }

  if (cle === "inactifs-30j") {
    // Inscrit depuis +30 jours ET aucune trace récente : pas de session
    // mise à jour, pas d'activité journalisée, pas d'avis, pas de paiement.
    const membres = await prisma.user.findMany({
      where: {
        createdAt: { lt: ilYa30j },
        NOT: {
          OR: [
            { sessions: { some: { updatedAt: { gte: ilYa30j } } } },
            { activites: { some: { creeLe: { gte: ilYa30j } } } },
            { avis: { some: { creeLe: { gte: ilYa30j } } } },
            { paiements: { some: { creeLe: { gte: ilYa30j } } } },
          ],
        },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, name: true, email: true, createdAt: true,
        abonnement: { select: { plan: true, statut: true, expireLe: true } },
      },
    });
    return membres.map((m) => ({
      id: m.id,
      nom: m.name ?? "",
      email: m.email,
      inscritLe: m.createdAt,
      plan:
        m.abonnement && m.abonnement.statut === "ACTIF" && m.abonnement.expireLe > maintenant
          ? m.abonnement.plan
          : null,
      premiumJusquAu:
        m.abonnement && m.abonnement.statut === "ACTIF" && m.abonnement.expireLe > maintenant
          ? m.abonnement.expireLe
          : null,
      filleulsRecompenses: 0,
    }));
  }

  if (cle === "parrains-actifs") {
    const parrains = await prisma.user.findMany({
      where: { filleulsParraines: { some: { statut: "RECOMPENSE" } } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, name: true, email: true, createdAt: true,
        _count: { select: { filleulsParraines: { where: { statut: "RECOMPENSE" } } } },
        abonnement: { select: { plan: true, statut: true, expireLe: true } },
      },
    });
    return parrains.map((p) => ({
      id: p.id,
      nom: p.name ?? "",
      email: p.email,
      inscritLe: p.createdAt,
      plan:
        p.abonnement && p.abonnement.statut === "ACTIF" && p.abonnement.expireLe > maintenant
          ? p.abonnement.plan
          : null,
      premiumJusquAu:
        p.abonnement && p.abonnement.statut === "ACTIF" && p.abonnement.expireLe > maintenant
          ? p.abonnement.expireLe
          : null,
      filleulsRecompenses: p._count.filleulsParraines,
    }));
  }

  // inscrits-semaine (segment par défaut)
  const nouveaux = await prisma.user.findMany({
    where: { createdAt: { gte: ilYa7j } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, createdAt: true,
      abonnement: { select: { plan: true, statut: true, expireLe: true } },
    },
  });
  return nouveaux.map((m) => ({
    id: m.id,
    nom: m.name ?? "",
    email: m.email,
    inscritLe: m.createdAt,
    plan:
      m.abonnement && m.abonnement.statut === "ACTIF" && m.abonnement.expireLe > maintenant
        ? m.abonnement.plan
        : null,
    premiumJusquAu:
      m.abonnement && m.abonnement.statut === "ACTIF" && m.abonnement.expireLe > maintenant
        ? m.abonnement.expireLe
        : null,
    filleulsRecompenses: 0,
  }));
}

/** Compteurs des 4 segments pour les cartes de la page (1 requête chacun). */
export async function compterTousLesSegments(): Promise<Record<CleSegment, number>> {
  const maintenant = new Date();
  const dans14j = new Date(maintenant);
  dans14j.setDate(dans14j.getDate() + 14);
  const ilYa30j = new Date(maintenant);
  ilYa30j.setDate(ilYa30j.getDate() - 30);
  const ilYa7j = new Date(maintenant);
  ilYa7j.setDate(ilYa7j.getDate() - 7);

  const [premiumExp, inactifs, parrains, nouveaux] = await Promise.all([
    prisma.abonnement.count({
      where: { statut: "ACTIF", expireLe: { gte: maintenant, lte: dans14j } },
    }),
    prisma.user.count({
      where: {
        createdAt: { lt: ilYa30j },
        NOT: {
          OR: [
            { sessions: { some: { updatedAt: { gte: ilYa30j } } } },
            { activites: { some: { creeLe: { gte: ilYa30j } } } },
            { avis: { some: { creeLe: { gte: ilYa30j } } } },
            { paiements: { some: { creeLe: { gte: ilYa30j } } } },
          ],
        },
      },
    }),
    prisma.user.count({ where: { filleulsParraines: { some: { statut: "RECOMPENSE" } } } }),
    prisma.user.count({ where: { createdAt: { gte: ilYa7j } } }),
  ]);

  return {
    "premium-expirant": premiumExp,
    "inactifs-30j": inactifs,
    "parrains-actifs": parrains,
    "inscrits-semaine": nouveaux,
  };
}
