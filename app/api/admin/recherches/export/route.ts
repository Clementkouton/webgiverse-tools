// app/api/admin/recherches/export/route.ts
// ─────────────────────────────────────────────────────────────────
// Lot 26 — Export CSV de l'historique des recherches groupé par terme
// (réservé aux admins). GET /api/admin/recherches/export :
//   terme ; occurrences ; sans_resultat ; resultats_moyens ;
//   derniere_recherche — sur TOUT l'historique (pas seulement 30 j),
//   trié du terme le plus tapé au moins tapé.
// Chaque téléchargement est tracé dans le journal d'audit.
// ─────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tracerConsultation } from "@/lib/journal-admin";
import { reponseFichierCsv, versCsv } from "@/lib/export-csv";

export async function GET() {
  // ── Accès réservé aux admins ─────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
  }
  const moi = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (moi?.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  try {
    const [groupes, vides] = await Promise.all([
      prisma.requeteRecherche.groupBy({
        by: ["terme"],
        _count: { terme: true },
        _avg: { nbResultats: true },
        _max: { creeLe: true },
        orderBy: { _count: { terme: "desc" } },
      }),
      prisma.requeteRecherche.groupBy({
        by: ["terme"],
        where: { nbResultats: 0 },
        _count: { terme: true },
      }),
    ]);
    const sansResultat = new Map(vides.map((v) => [v.terme, v._count.terme]));

    const lignes = groupes.map((g) => ({
      terme: g.terme,
      occurrences: g._count.terme,
      sans_resultat: sansResultat.get(g.terme) ?? 0,
      resultats_moyens: Math.round(g._avg.nbResultats ?? 0),
      derniere_recherche: g._max.creeLe ? g._max.creeLe.toISOString() : "",
    }));

    const horodatage = new Date().toISOString().slice(0, 10);
    await tracerConsultation(
      "EXPORT_RECHERCHES",
      `Historique des recherches (${lignes.length} termes, CSV)`,
    );
    return reponseFichierCsv(versCsv(lignes), `webgiverse-recherches-${horodatage}.csv`);
  } catch (e) {
    return NextResponse.json(
      { erreur: e instanceof Error ? e.message : "Export impossible." },
      { status: 500 },
    );
  }
}
