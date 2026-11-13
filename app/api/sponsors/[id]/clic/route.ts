// app/api/sponsors/[id]/clic/route.ts
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Clic sur un bandeau sponsorisé : compte le clic puis
// redirige vers le site de l'annonceur (lien urlTracking du bandeau).
//
// ⚠️ Lot 84 — CETTE ROUTE ÉTAIT CASSÉE (et gonflait les impressions) :
//   le fichier était une COPIE de /api/sponsors/actif — il comptait
//   une IMPRESSION à chaque appel, IGNORAIT l'identifiant du sponsor
//   et renvoyait du JSON au lieu de rediriger. Résultat : zéro clic
//   enregistré depuis le début, des impressions artificielles à chaque
//   clic, et le visiteur arrivait sur un écran JSON au lieu du site
//   de l'annonceur. Désormais :
//     1. le clic est compté sur le BON sponsor (enregistrerClic) ;
//     2. le visiteur est REDIRIGÉ (302) vers l'URL de l'annonceur ;
//     3. anti-fraude : 30 clics par adresse IP et par minute — un
//        script ne peut plus gonfler les statistiques de facturation
//        (les clics facturables restent plausibles) ;
//     4. l'URL de destination est contrôlée (http/https uniquement).
// ─────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { enregistrerClic } from "@/lib/sponsors";
import { autoriserRequete, ipClient } from "@/lib/limitation-debit"; // Lot 84

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  requete: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ erreur: "Sponsor introuvable." }, { status: 404 });
    }

    // Lot 84 — anti-fraude : 30 clics par IP et par minute. Au-delà,
    // 429 sans compter le clic (les vrais visiteurs ne cliquent jamais
    // 30 fois par minute sur des bandeaux).
    const ip = ipClient(requete.headers);
    if (!autoriserRequete(`clic-sponsor:${ip}`, 30, 60_000)) {
      return NextResponse.json(
        { erreur: "Trop de requêtes." },
        { status: 429 }
      );
    }

    // Compte le clic et récupère l'URL de destination (levée d'erreur
    // si l'identifiant n'existe pas → 404).
    const destination = await enregistrerClic(id);
    if (!destination || !/^https?:\/\//i.test(destination)) {
      return NextResponse.json({ erreur: "Sponsor introuvable." }, { status: 404 });
    }

    // Redirection vers l'annonceur (le « ? » de mesure est géré par
    // la plateforme de l'annonceur lui-même).
    return NextResponse.redirect(destination, 302);
  } catch {
    // Sponsor inconnu (id faux), supprimé ou erreur base : 404 sec.
    return NextResponse.json({ erreur: "Sponsor introuvable." }, { status: 404 });
  }
}