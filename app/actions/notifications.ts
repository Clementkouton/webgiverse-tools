"use server";

// app/actions/notifications.ts
// Lot 20 — actions des notifications in-app : lecture pour la cloche
// (client) et « tout marquer comme lu ». Tout est défensif : si la
// table Notification n'existe pas encore, on renvoie un état vide
// au lieu de faire planter la topbar.

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { compterNonLues, dernieresNotifications } from "@/lib/notifications";

export type NotificationLisible = {
  id: string;
  type: string;
  titre: string;
  corps: string | null;
  lien: string | null;
  lu: boolean;
  creeLe: string;
};

export type EtatNotifications = {
  nonLues: number;
  dernieres: NotificationLisible[];
  disponible: boolean; // false = table absente (db push à faire)
};

export async function obtenirNotifications(): Promise<EtatNotifications> {
  const session = await auth();
  const utilisateurId = session?.user?.id;
  if (!utilisateurId) {
    return { nonLues: 0, dernieres: [], disponible: true };
  }

  try {
    const [nonLues, dernieres] = await Promise.all([
      compterNonLues(utilisateurId),
      dernieresNotifications(utilisateurId, 8),
    ]);
    return {
      nonLues,
      dernieres: dernieres.map((n) => ({
        id: n.id,
        type: n.type,
        titre: n.titre,
        corps: n.corps ?? null,
        lien: n.lien ?? null,
        lu: n.lu,
        creeLe: new Date(n.creeLe).toISOString(),
      })),
      disponible: true,
    };
  } catch {
    return { nonLues: 0, dernieres: [], disponible: false };
  }
}

/** Marque TOUTES les notifications de l'utilisateur comme lues. */
export async function marquerToutesLues(): Promise<{ ok: boolean }> {
  const session = await auth();
  const utilisateurId = session?.user?.id;
  if (!utilisateurId) return { ok: false };

  try {
    const prismaAny = prisma as any;
    if (!prismaAny.notification?.updateMany) return { ok: false };
    await prismaAny.notification.updateMany({
      where: { utilisateurId, lu: false },
      data: { lu: true },
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
