"use server";
// app/actions/skills-favoris.ts
// ─────────────────────────────────────────────────────────────────
// Lot 40 — ACTIONS SERVEUR « Mes skills » : épingler une skill de la
// bibliothèque dans son espace + rédiger un retour d'usage (contexte
// d'utilisation, résultat obtenu, note 1-5, recommandation).
//
// RÈGLE D'ACCÈS : la bibliothèque /skills est réservée aux abonnés
// Premium (lib/acces-skills.ts). Épingler et noter suivent la même
// règle : la vérification est faite ICI, côté serveur, à chaque
// action — impossible de la contourner depuis le client.
//
// Garde-fous (mêmes conventions que app/actions/apprentissage.ts) :
//   · base      → tables absentes : « npx prisma db push » à lancer
//   · client    → client Prisma non régénéré : « npx prisma generate »
//   · premium   → fonction réservée aux abonnés
//   · invalide / indisponible → messages courts, jamais de crash
// ─────────────────────────────────────────────────────────────────
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { accesSkills } from "@/lib/acces-skills";
import { journaliser } from "@/lib/journal";

/** Raisons renvoyées aux composants clients pour afficher le bon message. */
export type RaisonSkills = "non-connecte" | "invalide" | "premium" | "base" | "client" | "indisponible";

/** Traduit une erreur Prisma en raison affichable + trace dans le terminal. */
function raisonDepuisErreur(erreur: unknown, contexte: string): RaisonSkills {
  const code = (erreur as { code?: string } | null)?.code ?? null;
  if (code === "P2021" || code === "P2022") {
    console.error(
      `[skills-favoris] ${contexte} : base de données NON À JOUR (code ${code}).\n` +
        "→ Dans le projet : arrête le serveur puis lance  npx prisma db push\n" +
        "  (crée les tables SkillFavori / SkillRetour du Lot 40), relance le serveur et recharge la page.",
    );
    return "base";
  }

  const brut = erreur instanceof Error ? erreur.message : String(erreur ?? "");
  if (
    (brut.includes("of undefined") || brut.includes("of null")) &&
    /(findUnique|findMany|findFirst|upsert|create|createMany|delete|deleteMany|update|updateMany|count|aggregate)/.test(brut)
  ) {
    console.error(
      `[skills-favoris] ${contexte} : CLIENT PRISMA NON RÉGÉNÉRÉ — il ne connaît pas les\n` +
        "  modèles SkillFavori / SkillRetour ajoutés au Lot 40.\n" +
        "→ Dans le projet, DANS L'ORDRE :\n" +
        "    1. arrête le serveur (Ctrl+C)\n" +
        "    2. npx prisma db push\n" +
        "    3. Remove-Item -Recurse -Force node_modules\\.prisma\n" +
        "    4. npx prisma generate\n" +
        "    5. npm run dev",
    );
    return "client";
  }

  console.error(`[skills-favoris] ${contexte} :`, erreur);
  return "indisponible";
}

async function userIdConnecte(): Promise<string | null> {
  try {
    const session = await auth();
    return session?.user?.id ?? null;
  } catch (erreur) {
    console.error("[skills-favoris] Session illisible :", erreur);
    return null;
  }
}

/** Rafraîchit toutes les pages qui affichent l'épinglage ou les retours. */
function rafraichir(skillSlug?: string) {
  revalidatePath("/dashboard/skills");
  revalidatePath("/skills");
  if (skillSlug) revalidatePath(`/skills/${skillSlug}`);
}

/** La skill existe-t-elle et l'action est-elle permise ? */
async function gardePremium(userId: string): Promise<RaisonSkills | null> {
  const acces = await accesSkills(userId);
  if (!acces.peutAcceder) return "premium";
  return null;
}

/* ════════════════════════════════════════════════════════════════
   1) ÉPINGLER / DÉTACHER UNE SKILL (bascule)
   ════════════════════════════════════════════════════════════════ */

export async function basculerSkillFavori(skillId: string): Promise<{
  ok: boolean;
  favori?: boolean;
  raison?: RaisonSkills;
}> {
  const userId = await userIdConnecte();
  if (!userId) return { ok: false, raison: "non-connecte" };

  const idValide = z.string().min(1).max(64).safeParse(skillId);
  if (!idValide.success) return { ok: false, raison: "invalide" };

  try {
    const verrou = await gardePremium(userId);
    if (verrou) return { ok: false, raison: verrou };

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      select: { slug: true },
    });
    if (!skill) return { ok: false, raison: "invalide" };

    const existant = await prisma.skillFavori.findUnique({
      where: { userId_skillId: { userId, skillId } },
      select: { id: true },
    });

    if (existant) {
      await prisma.skillFavori.delete({ where: { id: existant.id } });
      rafraichir(skill.slug);
      return { ok: true, favori: false };
    }

    await prisma.skillFavori.create({ data: { userId, skillId } });
    journaliser(userId, "skill_favori", JSON.stringify({ skillId }));
    rafraichir(skill.slug);
    return { ok: true, favori: true };
  } catch (erreur) {
    return { ok: false, raison: raisonDepuisErreur(erreur, "basculerSkillFavori") };
  }
}

/** Variante <form> (boutons des pages serveur, ex. « Mes skills »). */
export async function basculerSkillFavoriFormulaire(donnees: FormData): Promise<void> {
  const skillId = String(donnees.get("skillId") ?? "");
  await basculerSkillFavori(skillId);
}

/* ════════════════════════════════════════════════════════════════
   2) RETOUR D'USAGE : enregistrer / mettre à jour
   ════════════════════════════════════════════════════════════════ */

const SCHEMA_RETOUR = z.object({
  skillId: z.string().min(1).max(64),
  usage: z.string().trim().min(10, "Décris ton contexte d'usage (10 caractères minimum).").max(2000),
  resultat: z.string().trim().min(10, "Décris le résultat obtenu (10 caractères minimum).").max(2000),
  note: z.number().int().min(1).max(5),
  recommande: z.boolean(),
});

export async function enregistrerRetourSkill(donnees: FormData): Promise<{
  ok: boolean;
  raison?: RaisonSkills;
  message?: string;
}> {
  const userId = await userIdConnecte();
  if (!userId) return { ok: false, raison: "non-connecte" };

  const brut = {
    skillId: String(donnees.get("skillId") ?? ""),
    usage: String(donnees.get("usage") ?? ""),
    resultat: String(donnees.get("resultat") ?? ""),
    note: Number(donnees.get("note") ?? 5),
    recommande: String(donnees.get("recommande") ?? "oui") === "oui",
  };
  const parse = SCHEMA_RETOUR.safeParse(brut);
  if (!parse.success) {
    return { ok: false, raison: "invalide", message: parse.error.issues[0]?.message ?? undefined };
  }
  const { skillId, usage, resultat, note, recommande } = parse.data;

  try {
    const verrou = await gardePremium(userId);
    if (verrou) return { ok: false, raison: verrou };

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      select: { slug: true },
    });
    if (!skill) return { ok: false, raison: "invalide" };

    await prisma.skillRetour.upsert({
      where: { userId_skillId: { userId, skillId } },
      update: { usage, resultat, note, recommande },
      create: { userId, skillId, usage, resultat, note, recommande },
    });
    journaliser(userId, "skill_retour", JSON.stringify({ skillId, note }));
    rafraichir(skill.slug);
    return { ok: true };
  } catch (erreur) {
    return { ok: false, raison: raisonDepuisErreur(erreur, "enregistrerRetourSkill") };
  }
}

/* ════════════════════════════════════════════════════════════════
   3) SUPPRIMER SON RETOUR
   ════════════════════════════════════════════════════════════════ */

export async function supprimerRetourSkill(donnees: FormData): Promise<{ ok: boolean; raison?: RaisonSkills }> {
  const userId = await userIdConnecte();
  if (!userId) return { ok: false, raison: "non-connecte" };

  const idBrut = String(donnees.get("skillId") ?? "");
  const skillId = z.string().min(1).max(64).safeParse(idBrut);
  if (!skillId.success) return { ok: false, raison: "invalide" };
  const id = skillId.data;

  try {
    const verrou = await gardePremium(userId);
    if (verrou) return { ok: false, raison: verrou };

    const skill = await prisma.skill.findUnique({
      where: { id },
      select: { slug: true },
    });

    await prisma.skillRetour.deleteMany({
      where: { userId, skillId: id }, // deleteMany : aucune erreur si absent
    });
    if (skill) rafraichir(skill.slug);
    return { ok: true };
  } catch (erreur) {
    return { ok: false, raison: raisonDepuisErreur(erreur, "supprimerRetourSkill") };
  }
}