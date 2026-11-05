// app/actions/newsletter.ts
// ─────────────────────────────────────────────────────────────────
// Newsletter PUBLIQUE : action du formulaire de la PAGE D'ACCUEIL
// (section « La veille IA, une fois par semaine » — composant
// components/commun/formulaire-newsletter.tsx).
//
// ⚠️ CORRECTIF IMPORTANT : l'ancienne version enregistrait dans le
// modèle NewsletterSubscriber (ancienne table), alors que la console
// /admin/newsletter lit le modèle AbonneNewsletter. Résultat : les
// inscrits de la page d'accueil n'apparaissaient JAMAIS dans la liste
// des abonnés. Désormais l'inscription écrit dans AbonneNewsletter
// (celle que gère /admin/newsletter) :
//   • nouvel e-mail            → création (token unique auto)
//   • e-mail déjà désabonné    → réactivation (actif: true)
//   • e-mail déjà actif        → simple mise à jour (idempotent)
// ─────────────────────────────────────────────────────────────────
"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type EtatAbonnement = { ok: boolean; message: string };

export async function abonnerAction(
  _avant: EtatAbonnement,
  donnees: FormData
): Promise<EtatAbonnement> {
  const analyse = z.string().trim().email().safeParse(donnees.get("email"));
  if (!analyse.success) return { ok: false, message: "Adresse e-mail invalide." };

  const email = analyse.data.toLowerCase();
  try {
    // Keep this model access local: the generated PrismaClient type may be stale.
    const abonneNewsletter = (prisma as any).abonneNewsletter;
    const existant = await abonneNewsletter.findUnique({ where: { email } });

    if (!existant) {
      await abonneNewsletter.create({ data: { email, actif: true } });
      return { ok: true, message: "Inscription confirmée. Bienvenue dans la galaxie Webgiverse !" };
    }

    if (!existant.actif) {
      // Il s'était désabonné : on le réinscrit proprement.
      await abonneNewsletter.update({
        where: { email },
        data: { actif: true, desabonneLe: null },
      });
      return { ok: true, message: "Ta réinscription est confirmée. Content de te revoir !" };
    }

    // Déjà abonné : on ne crée pas de doublon.
    return { ok: true, message: "Tu es déjà inscrit à la newsletter. À très vite !" };
  } catch {
    return { ok: false, message: "Impossible de t'inscrire pour l'instant. Réessaie dans un instant." };
  }
}