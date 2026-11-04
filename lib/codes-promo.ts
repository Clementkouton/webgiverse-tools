// lib/codes-promo.ts
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Codes promo Chariow : validation d'un code avant de le
// transmettre au checkout (réduction réelle appliquée par Chariow,
// le site assure le suivi des conversions via le webhook).
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
  if (promo.debutLe && promo.debutLe > maintenant) return null;
  if (promo.finLe && promo.finLe < maintenant) return null;
  if (promo.maxUtilisations !== null && promo.utilisations >= promo.maxUtilisations) return null;
  return promo;
}
