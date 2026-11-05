// lib/codes-promo.ts
// ─────────────────────────────────────────────────────────────────
// Codes promo Chariow : validation d'un code avant de le transmettre
// au checkout (réduction réelle appliquée par Chariow, le site assure
// le suivi des conversions via le webhook → ConversionCodePromo).
//
// ⚠️ Écrit sur le VRAI schéma (CodePromo : code, typeRemise, valeur,
// dateDebut, dateFin, maxUtilisations, actif). L'ancienne version
// utilisait debutLe / finLe / utilisations — champs inexistants.
// ─────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";
import type { CodePromo } from "@prisma/client";

/**
 * Vérifie le code saisi / passé dans l'URL : existe, actif, dans ses
 * dates, quota non atteint. Renvoie le code ou null (silencieux).
 */
export async function codePromoValide(codeBrut: string): Promise<CodePromo | null> {
  const code = codeBrut.trim().toUpperCase();
  if (!code || code.length > 40) return null;
  const promo = await prisma.codePromo.findUnique({ where: { code } });
  if (!promo || !promo.actif) return null;

  const maintenant = new Date();
  if (promo.dateDebut && promo.dateDebut > maintenant) return null;
  if (promo.dateFin && promo.dateFin < maintenant) return null;

  // Quota : maxUtilisations (null = illimité) comparé au nombre de
  // conversions réellement enregistrées pour ce code.
  if (promo.maxUtilisations !== null) {
    const utilisees = await prisma.conversionCodePromo.count({
      where: { codeId: promo.id },
    });
    if (utilisees >= promo.maxUtilisations) return null;
  }

  return promo;
}