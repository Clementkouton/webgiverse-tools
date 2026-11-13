// app/api/admin/export/route.ts
// ─────────────────────────────────────────────────────────────────
// Lot 25 — Sauvegarde de la base en 1 clic (réservée aux admins).
//   GET /api/admin/export?type=complet                → JSON global
//   GET /api/admin/export?type=outils&format=csv      → CSV d'une table
// Tables : outils, prompts, tutoriels, articles, utilisateurs, avis,
//          abonnements, paiements, parrainages, propositions, contacts.
// Chaque téléchargement est tracé dans le journal d'audit.
//
// Lot 84 — DEUX DURCISSEMENTS :
//   1. INJECTION DE FORMULES CSV : les cellules commençant par
//      « = + - @ » (saisies des membres : requêtes de recherche, noms
//      de listes, avis…) sont neutralisées avec une apostrophe
//      (voir lib/export-csv.ts) — impossible d'exécuter une formule
//      dans Excel / LibreOffice à l'ouverture du fichier.
//   2. LES MOTS DE PASSE (empreintes bcrypt) NE SONT PLUS EXPORTÉS :
//      la sauvegarde JSON embarquait la colonne motDePasse de la table
//      utilisateur. Une fuite du fichier de sauvegarde (disque, cloud,
//      e-mail) aurait exposé toutes les empreintes — attaquables hors
//      ligne. Elles restent en base, évidemment.
//   3. Le message d'erreur interne n'est plus renvoyé au navigateur
//      (il reste dans les logs serveur).
// ─────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tracerConsultation } from "@/lib/journal-admin";
import { celluleCsv, neutraliserFormuleCsv } from "@/lib/export-csv";

/** Sérialise une valeur pour une cellule CSV (anti formule Lot 84). */
function cellule(valeur: unknown): string {
  return celluleCsv(neutraliserFormuleCsv(valeur));
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
        // Lot 84 — jamais de motDePasse dans la sauvegarde.
        prisma.user.findMany({
          select: {
            id: true, name: true, email: true, role: true, statut: true,
            image: true, createdAt: true, emailVerified: true,
          },
        }),
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
      // Lot 84 — la table utilisateurs n'expose plus les empreintes bcrypt.
      utilisateurs: () => prisma.user.findMany({
        select: {
          id: true, name: true, email: true, role: true, statut: true,
          image: true, createdAt: true, emailVerified: true,
        },
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
    // Lot 84 — le détail de l'erreur reste dans les logs serveur.
    console.error("[/api/admin/export] ERREUR COMPLÈTE :", e);
    return NextResponse.json({ erreur: "Export impossible." }, { status: 500 });
  }
}