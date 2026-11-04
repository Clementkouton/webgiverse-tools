// app/api/sponsors/actif/route.ts
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Renvoie le sponsor actuellement diffusé pour un emplacement
// (accueil ou catégorie) et compte l'impression. Appelée par le
// composant client BandeauSponsor (une requête = un affichage réel).
// ─────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sponsorActif, compterImpression } from "@/lib/sponsors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(requete: Request) {
  try {
    const url = new URL(requete.url);
    const emplacement = url.searchParams.get("emplacement") === "CATEGORIE" ? "CATEGORIE" : "ACCUEIL";
    const categorieSlug = url.searchParams.get("categorie") ?? null;

    let categorieId: string | null = null;
    if (emplacement === "CATEGORIE") {
      if (!categorieSlug) return NextResponse.json({ sponsor: null });
      const categorie = await prisma.category.findUnique({
        where: { slug: categorieSlug },
        select: { id: true },
      });
      if (!categorie) return NextResponse.json({ sponsor: null });
      categorieId = categorie.id;
    }

    const sponsor = await sponsorActif({ emplacement, categorieId });
    if (sponsor) {
      // La requête correspond à un affichage réel dans le navigateur.
      await compterImpression(sponsor.id);
    }
    return NextResponse.json({ sponsor });
  } catch {
    // Le bandeau est purement décoratif : jamais d'erreur visible.
    return NextResponse.json({ sponsor: null });
  }
}
