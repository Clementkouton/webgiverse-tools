// app/api/impersonation/etat/route.ts
// ─────────────────────────────────────────────────────────────────
// Lot 35 — État de la session de support (impersonation) : utilisé par
// le bandeau rouge (composant client) sans rendre les pages dynamiques.
// ─────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { utilisateurImpersonne } from "@/lib/impersonation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const cible = await utilisateurImpersonne();
    if (!cible) return NextResponse.json({ actif: false });
    return NextResponse.json({
      actif: true,
      nom: cible.name ?? "Sans nom",
      email: cible.email,
    });
  } catch {
    return NextResponse.json({ actif: false });
  }
}
