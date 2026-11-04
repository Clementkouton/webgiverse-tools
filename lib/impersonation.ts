// lib/impersonation.ts
// ─────────────────────────────────────────────────────────────────
// Lot 35 — « Se connecter en tant que… » (impersonation de support).
//
// Principe : l'admin garde SA session NextAuth intacte. Un second
// cookie httpOnly « wg-impersonation » (JWT signé avec AUTH_SECRET,
// impossible à forger côté client) contient l'identité de la cible.
// La callback `jwt` de auth.ts lit ce cookie à chaque requête :
//   présent → le jeton de session expose la cible (id + rôle) ;
//   absent  → l'admin retrouve sa session d'origine, rien à refaire.
//
// Le bandeau rouge (components/auth/bandeau-impersonation.tsx) est
// affiché tant que le cookie est actif, avec un bouton « Revenir ».
// ─────────────────────────────────────────────────────────────────
import { cookies } from "next/headers";
import { decode, encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const NOM_COOKIE_IMP = "wg-impersonation";
const SALT = "wg-impersonation";
const DUREE_SECONDES = 2 * 60 * 60; // session de support : 2 h maximum

type ContenuImpersonation = {
  cibleId: string;
  adminId: string;
  exp: number;
};

function secret(): string {
  return (process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "").trim();
}

/** Démarre l'impersonation (Server Action uniquement : pose un cookie). */
export async function demarrerImpersonation(adminId: string, cibleId: string) {
  const valeur = await encode({
    token: {
      cibleId,
      adminId,
      exp: Math.floor(Date.now() / 1000) + DUREE_SECONDES,
    },
    secret: secret(),
    salt: SALT,
    maxAge: DUREE_SECONDES,
  });
  const entrepot = await cookies();
  entrepot.set(NOM_COOKIE_IMP, valeur, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: DUREE_SECONDES,
  });
}

/** Termine l'impersonation : l'admin retrouve sa session d'origine. */
export async function terminerImpersonation() {
  const entrepot = await cookies();
  entrepot.delete(NOM_COOKIE_IMP);
}

/** Lit le cookie d'impersonation (décode + vérifie l'expiration). */
export async function lireImpersonation(): Promise<ContenuImpersonation | null> {
  try {
    const entrepot = await cookies();
    const brute = entrepot.get(NOM_COOKIE_IMP)?.value;
    if (!brute || !secret()) return null;
    const contenu = (await decode({
      token: brute,
      secret: secret(),
      salt: SALT,
    })) as ContenuImpersonation | null;
    if (!contenu?.cibleId || !contenu?.adminId) return null;
    if (!contenu.exp || contenu.exp * 1000 < Date.now()) return null;
    return contenu;
  } catch {
    // Hors contexte de requête ou cookie corrompu : pas d'impersonation.
    return null;
  }
}

/**
 * Utilisateur vu actuellement (cible de l'impersonation), ou null.
 * Utilisé par le bandeau rouge et la route /api/impersonation/etat.
 */
export async function utilisateurImpersonne() {
  const impersonation = await lireImpersonation();
  if (!impersonation) return null;
  const cible = await prisma.user.findUnique({
    where: { id: impersonation.cibleId },
    select: { id: true, name: true, email: true, role: true, statut: true },
  });
  // Compte supprimé, suspendu ou banni entre-temps → bandeau éteint.
  if (!cible || cible.statut !== "ACTIF") return null;
  return cible;
}
