// app/api/parrainage/capture/route.ts
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Rattachement du parrainage après une inscription GOOGLE.
// Le bouton Google de /inscription?ref=CODE redirige ici après
// l'authentification : le membre est désormais connecté, on relie son
// compte à son parrain (idempotent, silencieux), puis on le renvoie
// vers la suite prévue.
//
// Lot 82 — ANTI OPEN-REDIRECT renforcé : l'ancien test
// `suite.startsWith("/")` laissait passer les URL protocol-relative
// (« //site-pirate.com ») et leurs variantes avec antislash
// (« /\site-pirate.com », normalisées en // par les navigateurs) →
// la redirection pouvait emmener le membre sur un site externe
// (hameçonnage « tu viens de t'inscrire, reconnecte-toi »…). Désormais
// la destination est résolue puis son ORIGINE est comparée à la nôtre.
// ─────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { creerParrainage } from "@/lib/parrainages";

export const dynamic = "force-dynamic";

/** Destination toujours interne (anti open-redirect). */
function destinationSure(valeur: string, origine: string): string {
  const brute = (valeur || "").trim();
  let candidate = brute.startsWith("/") && !brute.startsWith("//") ? brute : "/dashboard";
  try {
    const resolue = new URL(candidate, origine);
    if (resolue.origin !== origine) return "/dashboard";
  } catch {
    return "/dashboard";
  }
  return candidate;
}

export async function GET(requete: Request) {
  const url = new URL(requete.url);
  const ref = (url.searchParams.get("ref") ?? "").trim().toUpperCase();
  const destination = destinationSure(url.searchParams.get("suite") ?? "", url.origin);

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