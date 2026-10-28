// app/sitemap.ts
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://webgiverse.com";
  const [outils, categories] = await Promise.all([
    prisma.tool.findMany({ where: { statut: "PUBLIE" }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true } }),
  ]);
  const statiques = ["", "/outils", "/agents", "/gratuits", "/open-source", "/categories", "/comparer", "/assistant", "/proposer", "/connexion", "/inscription", "/blog", "/actualites", "/tarifs", "/a-propos", "/contact"]
    .map((p) => ({ url: `${base}${p}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 }));
  return [
    ...statiques,
    ...outils.map((o) => ({ url: `${base}/outil/${o.slug}`, lastModified: o.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...categories.map((c) => ({ url: `${base}/categorie/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}