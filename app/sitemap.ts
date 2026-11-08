// app/sitemap.ts
// ─────────────────────────────────────────────────────────────────
// Lot 38 — /skills rejoint le sitemap : la page de la bibliothèque
// passe en priorité 0.9, chaque fiche de skill est listée avec sa
// date de mise à jour (lecture défensive : si la table n'existe pas
// encore, le sitemap se construit quand même).
//
// ⚠️ C'est le fichier COMPLET : remplace tout le contenu de ton
// app/sitemap.ts actuel.
// ─────────────────────────────────────────────────────────────────
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://webgiverse-tools.vercel.app";
  const [outils, categories, skills] = await Promise.all([
    prisma.tool.findMany({ where: { statut: "PUBLIE" }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true } }),
    // Lot 38 — défensif : table Skill absente → liste vide, pas d'erreur
    (async () => {
      try {
        const skillModel = (prisma as unknown as Record<string, {
          findMany: (args: { select: { slug: true; majLe: true } }) => Promise<{ slug: string; majLe: Date }[]>;
        } | undefined>)["skill"];
        return skillModel ? await skillModel.findMany({ select: { slug: true, majLe: true } }) : [];
      } catch {
        return [] as { slug: string; majLe: Date }[];
      }
    })(),
  ]);
  const statiques = ["", "/outils", "/agents", "/gratuits", "/open-source", "/categories", "/comparer", "/assistant", "/proposer", "/connexion", "/inscription", "/blog", "/actualites", "/tarifs", "/a-propos", "/contact", "/faq", "/annonceurs", "/skills"]
    .map((p) => ({ url: `${base}${p}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: p === "" ? 1 : p === "/skills" ? 0.9 : 0.7 }));
  return [
    ...statiques,
    ...outils.map((o) => ({ url: `${base}/outil/${o.slug}`, lastModified: o.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...categories.map((c) => ({ url: `${base}/categorie/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    // Lot 38 — fiches de skills
    ...skills.map((s) => ({ url: `${base}/skills/${s.slug}`, lastModified: s.majLe, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
