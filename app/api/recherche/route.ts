// app/api/recherche/route.ts
// Lot 83 — la recherche instantanée est PUBLIQUE et lance une requête
// SQL à chaque frappe : sans garde-fou, un script pouvait marteler la
// base (et Q= peut être arbitrairement longue). Désormais :
//   • 60 recherches par IP et par minute (au-delà → 429) ;
//   • la requête est tronquée à 80 caractères (le nom le plus long d'un
//     outil ne fait que quelques dizaines de caractères).
import { prisma } from "@/lib/prisma";
import { autoriserRequete, ipClient } from "@/lib/limitation-debit";

export async function GET(requete: Request) {
  const ip = ipClient(requete.headers);
  if (!autoriserRequete(`recherche-ip:${ip}`, 60, 60_000)) {
    return Response.json({ erreur: "Trop de recherches. Ralentis un instant." }, { status: 429 });
  }

  const q = new URL(requete.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (q.length < 2) return Response.json([]);
  const outils = await prisma.tool.findMany({
    where: { statut: "PUBLIE", nom: { mode: "insensitive", contains: q } },
    select: { id: true, slug: true, nom: true, logo: true },
    take: 8,
  });
  return Response.json(outils);
}