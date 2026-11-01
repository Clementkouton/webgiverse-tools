// lib/parrainage.ts
// ─────────────────────────────────────────────────────────────────
// Lot 20 — Parrainage 🤝 : « lien ?ref=… → 1 mois offert ».
//   • Le membre partage https://…/inscription?ref=<son id>.
//   • Le filleul s'inscrit → Parrainage (EN_ATTENTE) est créé.
//   • Quand le filleul souscrit un abonnement PAYANT (webhook Chariow),
//     le parrain reçoit 1 MOIS OFFERT : son abonnement actif est
//     prolongé de 30 jours, sinon un abonnement Pro d'1 mois est créé.
//   • Le parrain est notifié in-app (🔔 type "parrainage").
// Tout est défensif : un échec ne bloque jamais l'inscription ni le
// paiement (on logue et on continue).
// ─────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";
import { creerNotification } from "@/lib/notifications";

const JOURS_30 = 30 * 24 * 60 * 60 * 1000;

/** Enregistre le lien parrain/filleul à l'inscription. */
export async function enregistrerParrainage(
  ref: string | null | undefined,
  filleulId: string,
): Promise<void> {
  try {
    const code = String(ref ?? "").trim();
    if (!code || code === filleulId) return;

    const delegue = (prisma as any).parrainage;
    if (!delegue?.create) {
      console.error(
        "[parrainage] client Prisma sans modèle Parrainage → npx prisma db push",
      );
      return;
    }

    // Le parrain doit exister et être différent du filleul
    const parrain = await prisma.user.findUnique({ where: { id: code } }).catch(() => null);
    if (!parrain || parrain.id === filleulId) return;

    // Un filleul ne peut être parrainé qu'une seule fois (filleulId unique)
    const dejaPris = await delegue.findUnique({
      where: { filleulId },
      select: { id: true },
    });
    if (dejaPris) return;

    await delegue.create({
      data: { parrainId: parrain.id, filleulId },
    });

    // Notification pour le parrain : un filleul vient de s'inscrire
    await creerNotification({
      utilisateurId: parrain.id,
      type: "parrainage",
      titre: "🤝 Un filleul vient de s'inscrire avec ton lien",
      corps:
        "Tu recevras 1 mois offert dès qu'il souscrira un abonnement Premium.",
      lien: "/dashboard/parrainage",
    });
  } catch (erreur) {
    console.error("[parrainage] enregistrerParrainage a échoué (non bloquant) :", erreur);
  }
}

/**
 * Verse la récompense au parrain quand son filleul vient de payer.
 * Appelé par le webhook de paiement APRÈS activation de l'abonnement
 * du filleul. Idempotent : un parrainage n'est récompensé qu'une fois.
 */
export async function recompenserParrain(filleulId: string): Promise<void> {
  try {
    const delegue = (prisma as any).parrainage;
    if (!delegue?.findUnique) return;

    const lien = await delegue.findUnique({
      where: { filleulId },
      include: { parrain: { select: { id: true, email: true } } },
    });
    if (!lien || lien.statut === "RECOMPENSE") return;

    const maintenant = new Date();

    // 1) Prolonge l'abonnement actif du parrain de 30 jours,
    //    ou lui crée un abonnement Pro d'1 mois s'il n'en a pas.
    const abonnementParrain = await prisma.abonnement
      .findUnique({ where: { utilisateurId: lien.parrainId } })
      .catch(() => null);

    const base =
      abonnementParrain &&
      abonnementParrain.statut === "ACTIF" &&
      abonnementParrain.expireLe > maintenant
        ? abonnementParrain.expireLe
        : maintenant;
    const expireLe = new Date(base.getTime() + JOURS_30);

    if (abonnementParrain) {
      await prisma.abonnement.update({
        where: { id: abonnementParrain.id },
        data: {
          statut: "ACTIF",
          expireLe,
          annuleLe: null,
        },
      });
    } else {
      await prisma.abonnement.create({
        data: {
          utilisateurId: lien.parrainId,
          plan: "PRO",
          statut: "ACTIF",
          debutLe: maintenant,
          expireLe,
        },
      });
    }

    // 2) Marque le parrainage comme récompensé (une seule fois)
    await delegue.update({
      where: { id: lien.id },
      data: { statut: "RECOMPENSE", recompenseLe: maintenant },
    });

    // 3) Notification pour le parrain
    await creerNotification({
      utilisateurId: lien.parrainId,
      type: "parrainage",
      titre: "🎁 1 mois offert grâce à ton parrainage !",
      corps:
        "Ton filleul a souscrit un abonnement Premium : ton accès a été prolongé de 30 jours.",
      lien: "/dashboard/parrainage",
    });

    console.log(
      `[parrainage] ✔ parrain ${lien.parrain.email} récompensé (1 mois offert) pour le filleul ${filleulId}.`,
    );
  } catch (erreur) {
    console.error("[parrainage] recompenserParrain a échoué (non bloquant) :", erreur);
  }
}

/** Statistiques de la page /dashboard/parrainage. */
export async function statsParrainage(parrainId: string): Promise<{
  total: number;
  recompenses: number;
  enAttente: number;
  filleuls: { nom: string; creeLe: Date; statut: string }[];
}> {
  const vide = { total: 0, recompenses: 0, enAttente: 0, filleuls: [] as { nom: string; creeLe: Date; statut: string }[] };
  try {
    const delegue = (prisma as any).parrainage;
    if (!delegue?.findMany) return vide;

    const liens = await delegue.findMany({
      where: { parrainId },
      include: { filleul: { select: { name: true } } },
      orderBy: { creeLe: "desc" },
    });

    const filleuls: { nom: string; creeLe: Date; statut: string }[] = liens.map((l: any) => ({
      nom: l.filleul?.name ?? "Membre",
      creeLe: l.creeLe as Date,
      statut: String(l.statut),
    }));

    return {
      total: filleuls.length,
      recompenses: filleuls.filter((f) => f.statut === "RECOMPENSE").length,
      enAttente: filleuls.filter((f) => f.statut === "EN_ATTENTE").length,
      filleuls,
    };
  } catch {
    return vide;
  }
}
