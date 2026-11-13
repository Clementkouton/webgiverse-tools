// app/api/sponsors/actif/route.ts
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Renvoie le sponsor actuellement diffusé pour un emplacement
// (accueil ou catégorie) et compte l'impression. Appelée par le
// composant client BandeauSponsor (une requête = un affichage réel).
//
// Lot 84 — ANTI-FRAUDE sur les impressions : 120 impressions par
// adresse IP et par 5 minutes. Au-delà, le bandeau est toujours
// renvoyé (le visiteur voit le site normalement) mais l'impression
// n'est plus comptée — un script qui martèle la route ne peut plus
// gonfler indéfiniment les statistiques de facturation. Un vrai
// visiteur — même très actif — est très loin de ce plafond.
// ─────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sponsorActif, compterImpression } from "@/lib/sponsors";
import { autoriserRequete, ipClient } from "@/lib/limitation-debit"; // Lot 84

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
      // La requête correspond à un affichage réel dans le navigateur,
      // MAIS l'impression n'est comptée que sous le plafond anti-fraude.
      const ip = ipClient(requete.headers);
      if (autoriserRequete(`impression-sponsor:${ip}`, 120, 5 * 60_000)) {
        await compterImpression(sponsor.id);
      }
    }
    return NextResponse.json({ sponsor });
  } catch {
    // Le bandeau est purement décoratif : jamais d'erreur visible.
    return NextResponse.json({ sponsor: null });
  }
}