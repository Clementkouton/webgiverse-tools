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
import { headers } from "next/headers"; // Lot 83 — IP pour l'anti spam
import { prisma } from "@/lib/prisma";
import { autoriserRequete, ipClient } from "@/lib/limitation-debit"; // Lot 83

export type EtatAbonnement = { ok: boolean; message: string };

export async function abonnerAction(
  _avant: EtatAbonnement,
  donnees: FormData
): Promise<EtatAbonnement> {
  const analyse = z.string().trim().email().safeParse(donnees.get("email"));
  if (!analyse.success) return { ok: false, message: "Adresse e-mail invalide." };

  const email = analyse.data.toLowerCase();

  // Lot 83 — Anti pollution de la table des abonnés : 10 inscriptions
  // par IP et par heure. Une adresse déjà inscrite est idempotente, mais
  // un script pouvait créer des milliers de lignes avec des e-mails
  // inventés (qui recevraient ensuite l'hebdo → réputation d'envoi).
  const ip = ipClient(await headers());
  if (!autoriserRequete(`newsletter-ip:${ip}`, 10, 60 * 60_000)) {
    return { ok: false, message: "Trop d'inscriptions depuis cette connexion. Réessaie plus tard." };
  }

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