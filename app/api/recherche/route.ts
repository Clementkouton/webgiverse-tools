// app/api/recherche/route.ts
import { prisma } from "@/lib/prisma";

export async function GET(requete: Request) {
  const q = new URL(requete.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return Response.json([]);
  const outils = await prisma.tool.findMany({
    where: { statut: "PUBLIE", nom: { mode: "insensitive", contains: q } },
    select: { id: true, slug: true, nom: true, logo: true },
    take: 8,
  });
  return Response.json(outils);
}