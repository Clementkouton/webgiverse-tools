// lib/notifications.ts
// ─────────────────────────────────────────────────────────────────
// Lot 20 — Notifications in-app (cloche de la topbar du dashboard).
// Règle d'or : UNE notification ne doit JAMAIS faire planer la
// fonctionnalité qui la déclenche. Tout est blindé try/catch : si la
// table Notification n'existe pas encore (db push non fait), on logue
// et on continue.
// ─────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";

export type TypeNotification = "tuto" | "vote_avis" | "parrainage" | "systeme";

type ParametresNotification = {
  utilisateurId: string;
  type: TypeNotification;
  titre: string;
  corps?: string | null;
  lien?: string | null;
};

const delegue = () => (prisma as any).notification as
  | {
      create: (args: any) => Promise<unknown>;
      findMany: (args: any) => Promise<any[]>;
      count: (args: any) => Promise<number>;
      updateMany: (args: any) => Promise<unknown>;
    }
  | undefined;

/**
 * Crée une notification in-app. Ne lève JAMAIS d'exception :
 * l'appelant (publication d'un avis, paiement, etc.) continue normalement
 * même si la table est absente ou la base indisponible.
 */
export async function creerNotification(
  donnees: ParametresNotification,
): Promise<void> {
  try {
    const n = delegue();
    if (!n?.create) {
      console.error(
        "[notifications] client Prisma sans modèle Notification → npx prisma db push",
      );
      return;
    }
    await n.create({
      data: {
        utilisateurId: donnees.utilisateurId,
        type: donnees.type,
        titre: donnees.titre,
        corps: donnees.corps ?? null,
        lien: donnees.lien ?? null,
      },
    });
  } catch (erreur) {
    console.error("[notifications] creerNotification a échoué (non bloquant) :", erreur);
  }
}

/** Nombre de notifications non lues (0 si indisponible). */
export async function compterNonLues(utilisateurId: string): Promise<number> {
  try {
    const n = delegue();
    if (!n?.count) return 0;
    return await n.count({ where: { utilisateurId, lu: false } });
  } catch {
    return 0;
  }
}

/** Les 8 dernières notifications (pour la cloche). */
export async function dernieresNotifications(
  utilisateurId: string,
  take = 8,
): Promise<any[]> {
  try {
    const n = delegue();
    if (!n?.findMany) return [];
    return await n.findMany({
      where: { utilisateurId },
      orderBy: { creeLe: "desc" },
      take,
    });
  } catch {
    return [];
  }
}

/**
 * 🔔 « Nouveau tuto dans ta catégorie » — détecté à la volée.
 * Les tutoriels sont créés par le seed / les scripts (pas d'UI admin),
 * donc on notifie au chargement du dashboard : on cherche les tutoriels
 * des 14 derniers jours dont la liste `outils` recoupe les outils (ou
 * catégories) en favori de l'utilisateur, et on crée les notifications
 * manquantes (une seule fois : on regarde si une notification du même
 * type pointe déjà vers le même lien).
 */
export async function synchroniserNotificationsTutos(
  utilisateurId: string,
): Promise<void> {
  try {
    const n = delegue();
    if (!n?.findMany || !n?.create) return;

    const ilYa14Jours = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    // Tutoriels récents (aucun risque : table Tuto existe depuis le Lot 12)
    const tutosRecents = await prisma.tuto
      .findMany({
        where: { creeLe: { gte: ilYa14Jours } },
        select: { slug: true, titre: true, outils: true },
        orderBy: { creeLe: "desc" },
        take: 10,
      })
      .catch(() => []);
    if (tutosRecents.length === 0) return;

    // Outils favoris de l'utilisateur (nom + catégories) = « sa catégorie »
    const favoris = await prisma.favorite
      .findMany({
        where: { userId: utilisateurId },
        select: {
          tool: {
            select: {
              nom: true,
              categories: { select: { categorie: { select: { nom: true } } } },
            },
          },
        },
      })
      .catch(() => []);
    if (favoris.length === 0) return;

    const interesses = new Set<string>();
    for (const f of favoris) {
      interesses.add(f.tool.nom.toLowerCase().trim());
      for (const c of f.tool.categories) {
        interesses.add(c.categorie.nom.toLowerCase().trim());
      }
    }

    // Notifications déjà envoyées (pour ne jamais répéter un même lien)
    const existantes = await n.findMany({
      where: { utilisateurId, type: "tuto" },
      select: { lien: true },
    });
    const liensDejaEnvoyes = new Set(existantes.map((x: any) => x.lien));

    for (const tuto of tutosRecents) {
      const lien = `/tutoriels/${tuto.slug}`;
      if (liensDejaEnvoyes.has(lien)) continue;

      const correspond = (tuto.outils as string[]).some((o) =>
        interesses.has(String(o).toLowerCase().trim()),
      );
      if (!correspond) continue;

      await n.create({
        data: {
          utilisateurId,
          type: "tuto",
          titre: "🎓 Nouveau tuto dans ta catégorie",
          corps: `« ${tuto.titre} » vient d'arriver dans la collection vidéo.`,
          lien,
        },
      });
      liensDejaEnvoyes.add(lien);
    }
  } catch (erreur) {
    console.error("[notifications] synchroniserNotificationsTutos a échoué (non bloquant) :", erreur);
  }
}
