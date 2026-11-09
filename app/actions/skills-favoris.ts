// app/actions/skills-favoris.ts
// ─────────────────────────────────────────────────────────────────
// Lot 43 — Actions serveur des favoris de skills et des retours d'usage.
// Mêmes règles défensives que app/actions/apprentissage.ts (lot 19) :
//   · TOUTES les requêtes Prisma sont dans un try/catch ;
//   · table absente (P2021/P2022) → raison « base » avec instruction exacte ;
//   · client Prisma non régénéré → raison « client » ;
//   · verrou Premium côté serveur (lib/premium.ts) : Pro / Entreprise actif.
// Une seule ligne par membre et par skill (userId + skillId unique).
// ─────────────────────────────────────────────────────────────────
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { premiumActif } from "@/lib/premium";
import { journaliser } from "@/lib/journal";

const prismaCompat = prisma as any;

/** Raisons renvoyées aux composants clients pour afficher le bon message. */
export type RaisonSkills =
  | "non-connecte"
  | "premium"
  | "invalide"
  | "base"
  | "client"
  | "indisponible";

/** État du formulaire de retour d'usage (useActionState côté client). */
export type EtatRetour = { succes: boolean; message: string };

/** Traduit une erreur Prisma en raison affichable + trace dans le terminal. */
function raisonDepuisErreur(erreur: unknown, contexte: string): RaisonSkills {
  const code = (erreur as { code?: string } | null)?.code ?? null;
  if (code === "P2021" || code === "P2022") {
    console.error(
      `[skills-favoris] ${contexte} : base de données NON À JOUR (code ${code}).\n` +
      "→ Passe d'abord la migration prisma/migration-skills-favoris.sql dans le SQL Editor\n" +
      "  de Neon, colle les modèles dans prisma/schema.prisma puis lance  npx prisma generate\n" +
      "  (arrête le serveur avant la régénération), et recharge la page.",
    );
    return "base";
  }
  const brut = erreur instanceof Error ? erreur.message : String(erreur ?? "");
  if (
    (brut.includes("of undefined") || brut.includes("of null")) &&
    /(findUnique|findMany|findFirst|upsert|create|createMany|delete|deleteMany|update|updateMany|count|aggregate)/.test(
      brut,
    )
  ) {
    console.error(
      `[skills-favoris] ${contexte} : CLIENT PRISMA NON RÉGÉNÉRÉ — les modèles SkillFavori /\n` +
      "SkillRetour sont inconnus du client.\n" +
      "→ Arrête le serveur, colle les modèles du lot 43 dans prisma/schema.prisma puis\n" +
      "  lance  npx prisma generate , relance le serveur et recharge la page.",
    );
    return "client";
  }
  console.error(`[skills-favoris] ${contexte} :`, erreur);
  return "indisponible";
}

const MESSAGE_RAISON: Record<RaisonSkills, string> = {
  "non-connecte": "Connecte-toi pour épingler une skill.",
  premium: "Épingler des skills et partager tes retours est réservé aux abonnés Premium.",
  invalide: "Formulaire incomplet : vérifie tes réponses.",
  base: "La base de données n'est pas encore à jour (migration du lot 43 à passer).",
  client: "Le client Prisma doit être régénéré : npx prisma generate.",
  indisponible: "Action momentanément indisponible, réessaie dans un instant.",
};

// ─────────────────────────────────────────────────────────────────
// ÉPINGLER / DÉÉPINGLER une skill (toggle) — bouton client BoutonEpingle.
// ─────────────────────────────────────────────────────────────────
export async function basculerFavoriSkill(
  skillId: string,
): Promise<{ epingle: boolean; raison?: RaisonSkills }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { epingle: false, raison: "non-connecte" };
  if (!(await premiumActif(userId))) return { epingle: false, raison: "premium" };

  try {
    const existant = await prismaCompat.skillFavori.findUnique({
      where: { userId_skillId: { userId, skillId } },
      select: { id: true },
    });

    if (existant) {
      await prismaCompat.skillFavori.delete({ where: { id: existant.id } });
      revalidatePath("/dashboard/skills-favoris");
      journaliser(userId, "skill_favori_retire", JSON.stringify({ skillId }));
      return { epingle: false };
    }

    await prismaCompat.skillFavori.create({ data: { userId, skillId } });
    revalidatePath("/dashboard/skills-favoris");
    journaliser(userId, "skill_favori", JSON.stringify({ skillId }));
    return { epingle: true };
  } catch (erreur) {
    return { epingle: false, raison: raisonDepuisErreur(erreur, "basculerFavoriSkill") };
  }
}

// ─────────────────────────────────────────────────────────────────
// RETIRER une skill épinglée — action de formulaire (dashboard, corbeille).
// ─────────────────────────────────────────────────────────────────
export async function retirerFavoriFormulaire(formData: FormData): Promise<void> {
  const skillId = String(formData.get("skillId") ?? "").trim();
  if (!skillId) return;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

  try {
    await prismaCompat.skillFavori.deleteMany({ where: { userId, skillId } });
    revalidatePath("/dashboard/skills-favoris");
    journaliser(userId, "skill_favori_retire", JSON.stringify({ skillId }));
  } catch (erreur) {
    raisonDepuisErreur(erreur, "retirerFavoriFormulaire");
  }
}

// ─────────────────────────────────────────────────────────────────
// PUBLIER UN RETOUR D'USAGE — action de formulaire (useActionState).
// Un seul retour par membre et par skill ; note facultative 1 à 5.
// ─────────────────────────────────────────────────────────────────
const schemaRetour = z.object({
  usage: z
    .string()
    .trim()
    .min(20, "Décris l'usage en au moins 20 caractères.")
    .max(2000, "L'usage ne doit pas dépasser 2000 caractères."),
  resultat: z
    .string()
    .trim()
    .min(20, "Décris le résultat obtenu en au moins 20 caractères.")
    .max(2000, "Le résultat ne doit pas dépasser 2000 caractères."),
});

export async function envoyerRetourSkill(
  _etatPrecedent: EtatRetour,
  formData: FormData,
): Promise<EtatRetour> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { succes: false, message: MESSAGE_RAISON["non-connecte"] };
  }
  if (!(await premiumActif(userId))) {
    return { succes: false, message: MESSAGE_RAISON.premium };
  }

  const skillId = String(formData.get("skillId") ?? "").trim();
  if (!skillId) return { succes: false, message: MESSAGE_RAISON.invalide };

  const analyse = schemaRetour.safeParse({
    usage: String(formData.get("usage") ?? ""),
    resultat: String(formData.get("resultat") ?? ""),
  });
  if (!analyse.success) {
    return { succes: false, message: analyse.error.issues[0]?.message ?? MESSAGE_RAISON.invalide };
  }

  // Note facultative : vide → null, sinon entier de 1 à 5.
  const noteBrute = String(formData.get("note") ?? "").trim();
  let note: number | null = null;
  if (noteBrute) {
    const n = Number(noteBrute);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      return { succes: false, message: "La note doit être comprise entre 1 et 5." };
    }
    note = n;
  }

  try {
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      select: { slug: true },
    });
    if (!skill) return { succes: false, message: "Cette skill n'existe plus." };

    const dejaLa = await prismaCompat.skillRetour.findUnique({
      where: { userId_skillId: { userId, skillId } },
      select: { id: true },
    });
    if (dejaLa) {
      return {
        succes: false,
        message: "Tu as déjà partagé un retour pour cette skill (un seul par skill).",
      };
    }

    await prismaCompat.skillRetour.create({
      data: { userId, skillId, usage: analyse.data.usage, resultat: analyse.data.resultat, note },
    });
    revalidatePath(`/skills/${skill.slug}`);
    revalidatePath("/dashboard/skills-favoris");
    journaliser(userId, "skill_retour", JSON.stringify({ skillId, note }));
    return { succes: true, message: "Merci ! Ton retour d'usage est publié." };
  } catch (erreur) {
    return { succes: false, message: MESSAGE_RAISON[raisonDepuisErreur(erreur, "envoyerRetourSkill")] };
  }
}

// ─────────────────────────────────────────────────────────────────
// SUPPRIMER MON RETOUR — le where double (id + userId) garantit qu'un
// membre ne peut supprimer que SON retour.
// ─────────────────────────────────────────────────────────────────
export async function supprimerRetourFormulaire(formData: FormData): Promise<void> {
  const retourId = String(formData.get("retourId") ?? "").trim();
  if (!retourId) return;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

  try {
    const supprime = await prismaCompat.skillRetour.deleteMany({
      where: { id: retourId, userId },
    });
    if (supprime.count > 0) {
      revalidatePath("/dashboard/skills-favoris");
      journaliser(userId, "skill_retour_supprime", JSON.stringify({ retourId }));
    }
  } catch (erreur) {
    raisonDepuisErreur(erreur, "supprimerRetourFormulaire");
  }
}
// ─────────────────────────────────────────────────────────────────
// SUPPRIMER MON RETOUR PAR SKILL — utilisé par « Mes skills »
// (dashboard) où la carte ne connaît que le skillId, pas l'id du
// retour. Le where double (skillId + userId) garantit qu'un membre
// ne peut supprimer que SON retour.
// ─────────────────────────────────────────────────────────────────
export async function supprimerRetourParSkillFormulaire(formData: FormData): Promise<void> {
  const skillId = String(formData.get("skillId") ?? "").trim();
  if (!skillId) return;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

  try {
    const skill = await prisma.skill
      .findUnique({ where: { id: skillId }, select: { slug: true } })
      .catch(() => null);

    const supprime = await prismaCompat.skillRetour.deleteMany({
      where: { skillId, userId },
    });
    if (supprime.count > 0) {
      if (skill?.slug) revalidatePath(`/skills/${skill.slug}`);
      revalidatePath("/dashboard/skills-favoris");
      journaliser(userId, "skill_retour_supprime", JSON.stringify({ skillId }));
    }
  } catch (erreur) {
    raisonDepuisErreur(erreur, "supprimerRetourParSkillFormulaire");
  }
}