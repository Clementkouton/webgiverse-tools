// app/api/parrainage/capture/route.ts
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Rattachement du parrainage après une inscription GOOGLE.
// Le bouton Google de /inscription?ref=CODE redirige ici après
// l'authentification : le membre est désormais connecté, on relie son
// compte à son parrain (idempotent, silencieux), puis on le renvoie
// vers la suite prévue.
// ─────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { creerParrainage } from "@/lib/parrainages";

export const dynamic = "force-dynamic";

export async function GET(requete: Request) {
  const url = new URL(requete.url);
  const ref = (url.searchParams.get("ref") ?? "").trim().toUpperCase();
  const suite = url.searchParams.get("suite") || "/dashboard";
  // Destination toujours interne (anti open-redirect).
  const destination = suite.startsWith("/") ? suite : "/dashboard";

  if (ref) {
    try {
      const session = await auth();
      if (session?.user?.id) {
        await creerParrainage(ref, session.user.id);
      } else {
        // Pas encore connecté → on repasse par la connexion, le ref
        // sera capturé à nouveau après l'authentification.
        const retour = new URL("/connexion", url.origin);
        retour.searchParams.set("suite", `/api/parrainage/capture?ref=${encodeURIComponent(ref)}&suite=${encodeURIComponent(destination)}`);
        return NextResponse.redirect(retour);
      }
    } catch {
      // Le parrainage ne doit jamais bloquer la connexion.
    }
  }
  return NextResponse.redirect(new URL(destination, url.origin));
}
