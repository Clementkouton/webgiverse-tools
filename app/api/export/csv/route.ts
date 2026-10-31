// app/api/export/csv/route.ts
// Lot 19 — téléchargement CSV des favoris et des listes.
//   GET /api/export/csv?type=favoris   → webgiverse-favoris-AAAA-MM-JJ.csv
//   GET /api/export/csv?type=listes    → webgiverse-listes-AAAA-MM-JJ.csv
// Réservé aux abonnés Premium actifs (même règle que la page d'export).
// Format compatible Excel FR : séparateur « ; », BOM UTF-8 (accents OK),
// guillemets doublés dans les valeurs (standard RFC 4180).
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { premiumActif } from "@/lib/premium";

export const dynamic = "force-dynamic";

/** Échappe une valeur CSV : guillemets doublés + encadrement systématique. */
function cellule(valeur: string | number | null | undefined): string {
  const texte = String(valeur ?? "").replace(/"/g, '""');
  return `"${texte}"`;
}

export async function GET(request: NextRequest) {
  // ── Contrôles d'accès ─────────────────────────────────────────
  const session = await auth();
  const utilisateurId = session?.user?.id;
  if (!utilisateurId) {
    return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 });
  }
  if (!(await premiumActif(utilisateurId))) {
    return NextResponse.json(
      { erreur: "Export réservé aux plans Premium (Pro ou Entreprise)." },
      { status: 403 },
    );
  }

  const type = request.nextUrl.searchParams.get("type") ?? "favoris";
  const date = new Date().toISOString().slice(0, 10);
  let nomFichier: string;
  let lignes: string[][];

  try {
    if (type === "listes") {
      nomFichier = `webgiverse-listes-${date}.csv`;
      const listes = await prisma.list.findMany({
        where: { userId: utilisateurId },
        orderBy: { createdAt: "desc" },
        select: {
          nom: true,
          estPublique: true,
          createdAt: true,
          items: {
            orderBy: { createdAt: "asc" },
            select: { tool: { select: { nom: true, slug: true } } },
          },
        },
      });
      lignes = [["Liste", "Visibilité", "Outil", "Page de l'outil", "Liste créée le"]];
      for (const liste of listes) {
        const creeLe = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(liste.createdAt);
        if (liste.items.length === 0) {
          lignes.push([liste.nom, liste.estPublique ? "Publique" : "Privée", "", "", creeLe]);
        }
        for (const item of liste.items) {
          lignes.push([
            liste.nom,
            liste.estPublique ? "Publique" : "Privée",
            item.tool.nom,
            `https://webgiverse-tools.vercel.app/outils/${item.tool.slug}`,
            creeLe,
          ]);
        }
      }
    } else {
      nomFichier = `webgiverse-favoris-${date}.csv`;
      const favoris = await prisma.favorite.findMany({
        where: { userId: utilisateurId },
        orderBy: { createdAt: "desc" },
        select: {
          statut: true,
          note: true,
          creeLe: true,
          tool: {
            select: {
              nom: true,
              slug: true,
              tarif: true,
              categories: { select: { categorie: { select: { nom: true } } } },
            },
          },
        },
      });
      lignes = [["Outil", "Catégories", "Statut", "Note", "Tarif", "Ajouté le", "Page de l'outil"]];
      const libelles: Record<string, string> = {
        A_TESTER: "À tester",
        EN_COURS: "En cours",
        ADOPTE: "Adopté",
      };
      for (const favori of favoris) {
        lignes.push([
          favori.tool.nom,
          favori.tool.categories.map((c) => c.categorie.nom).join(", "),
          libelles[favori.statut] ?? favori.statut,
          favori.note ?? "",
          favori.tool.tarif ?? "",
          new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(favori.creeLe),
          `https://webgiverse-tools.vercel.app/outils/${favori.tool.slug}`,
        ]);
      }
    }
  } catch (erreur) {
    console.error("Erreur export CSV :", erreur);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }

  // ── Construction du fichier (BOM UTF-8 + séparateur « ; ») ────
  const csv =
    "\uFEFF" + lignes.map((ligne) => ligne.map(cellule).join(";")).join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
      "Cache-Control": "no-store",
    },
  });
}
