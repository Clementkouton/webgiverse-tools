// app/api/admin/export/route.ts
// ─────────────────────────────────────────────────────────────────
// Lot 25 — Sauvegarde de la base en 1 clic (réservée aux admins).
//   GET /api/admin/export?type=complet                → JSON global
//   GET /api/admin/export?type=outils&format=csv      → CSV d'une table
// Tables : outils, prompts, tutoriels, articles, utilisateurs, avis,
//          abonnements, paiements, parrainages, propositions, contacts.
// Chaque téléchargement est tracé dans le journal d'audit.
// ─────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tracerConsultation } from "@/lib/journal-admin";

/** Sérialise une valeur pour une cellule CSV (séparateur « ; »). */
function cellule(valeur: unknown): string {
  let texte: string;
  if (valeur === null || valeur === undefined) texte = "";
  else if (valeur instanceof Date) texte = valeur.toISOString();
  else if (typeof valeur === "object") texte = JSON.stringify(valeur);
  else texte = String(valeur);
  if (/[;"\n]/.test(texte)) return `"${texte.replace(/"/g, '""')}"`;
  return texte;
}

function versCsv(lignes: Record<string, unknown>[]): string {
  if (lignes.length === 0) return "(table vide)";
  const colonnes = [...lignes.reduce((set, l) => { Object.keys(l).forEach((k) => set.add(k)); return set; }, new Set<string>())];
  const entete = colonnes.join(";");
  const corps = lignes.map((l) => colonnes.map((c) => cellule(l[c])).join(";")).join("\n");
  // BOM UTF-8 pour que Excel affiche les accents correctement
  return `\uFEFF${entete}\n${corps}`;
}

/** Réponse fichier avec en-têtes de téléchargement. */
function reponseFichier(contenu: string, nomFichier: string, mime: string) {
  return new NextResponse(contenu, {
    headers: {
      "Content-Type": `${mime}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(requete: NextRequest) {
  // ── Accès réservé aux admins ─────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
  }
  const moi = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (moi?.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  const type = requete.nextUrl.searchParams.get("type") ?? "complet";
  const format = (requete.nextUrl.searchParams.get("format") ?? "json").toLowerCase();
  const horodatage = new Date().toISOString().slice(0, 10);

  try {
    // ── Sauvegarde COMPLÈTE (JSON unique) ──────────────────────────
    if (type === "complet") {
      const [
        utilisateurs, outils, categories, prompts, categoriesPrompts,
        tutoriels, articles, avis, abonnements, paiements,
        parrainages, propositions, contacts, notifications,
      ] = await Promise.all([
        prisma.user.findMany(),
        prisma.tool.findMany({ include: { categories: true } }),
        prisma.category.findMany(),
        prisma.prompt.findMany(),
        prisma.promptCategorie.findMany(),
        prisma.tuto.findMany(),
        prisma.article.findMany(),
        prisma.avis.findMany(),
        prisma.abonnement.findMany(),
        prisma.paiement.findMany(),
        prisma.parrainage.findMany(),
        prisma.toolSubmission.findMany(),
        prisma.messageContact.findMany(),
        prisma.notification.findMany(),
      ]);
      await tracerConsultation("EXPORT_COMPLET", `Sauvegarde JSON (${utilisateurs.length} users, ${outils.length} outils…)`);
      const contenu = JSON.stringify(
        {
          genereLe: new Date().toISOString(),
          application: "webgiverse-tools",
          tables: {
            utilisateurs, outils, categories, prompts, categoriesPrompts,
            tutoriels, articles, avis, abonnements, paiements,
            parrainages, propositions, contacts, notifications,
          },
        },
        null,
        2,
      );
      return reponseFichier(contenu, `webgiverse-sauvegarde-${horodatage}.json`, "application/json");
    }

    // ── Tables individuelles (JSON ou CSV) ─────────────────────────
    const tables: Record<string, () => Promise<Record<string, unknown>[]>> = {
      outils: () => prisma.tool.findMany({ include: { categories: true } }) as unknown as Promise<Record<string, unknown>[]>,
      categories: () => prisma.category.findMany() as unknown as Promise<Record<string, unknown>[]>,
      prompts: () => prisma.prompt.findMany() as unknown as Promise<Record<string, unknown>[]>,
      tutoriels: () => prisma.tuto.findMany() as unknown as Promise<Record<string, unknown>[]>,
      articles: () => prisma.article.findMany() as unknown as Promise<Record<string, unknown>[]>,
      utilisateurs: () => prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true, emailVerified: true },
      }) as unknown as Promise<Record<string, unknown>[]>,
      avis: () => prisma.avis.findMany() as unknown as Promise<Record<string, unknown>[]>,
      abonnements: () => prisma.abonnement.findMany() as unknown as Promise<Record<string, unknown>[]>,
      paiements: () => prisma.paiement.findMany() as unknown as Promise<Record<string, unknown>[]>,
      parrainages: () => prisma.parrainage.findMany() as unknown as Promise<Record<string, unknown>[]>,
      propositions: () => prisma.toolSubmission.findMany() as unknown as Promise<Record<string, unknown>[]>,
      contacts: () => prisma.messageContact.findMany() as unknown as Promise<Record<string, unknown>[]>,
    };

    const lecteur = tables[type];
    if (!lecteur) {
      return NextResponse.json({ erreur: `Table inconnue : ${type}` }, { status: 400 });
    }

    const lignes = await lecteur();
    await tracerConsultation("EXPORT_TABLE", `${type} (${lignes.length} lignes, ${format})`);

    if (format === "csv") {
      return reponseFichier(versCsv(lignes), `webgiverse-${type}-${horodatage}.csv`, "text/csv");
    }
    return reponseFichier(JSON.stringify({ table: type, genereLe: new Date().toISOString(), lignes }, null, 2), `webgiverse-${type}-${horodatage}.json`, "application/json");
  } catch (e) {
    return NextResponse.json(
      { erreur: e instanceof Error ? e.message : "Export impossible." },
      { status: 500 },
    );
  }
}
