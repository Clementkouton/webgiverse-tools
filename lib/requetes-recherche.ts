// lib/requetes-recherche.ts
// ─────────────────────────────────────────────────────────────────
// Lot 26 — journalisation des recherches du catalogue public.
// `journaliserRecherche()` est appelée par la page /outils à chaque
// recherche avec un terme : elle enregistre le terme normalisé et le
// nombre de résultats trouvés (pour repérer les recherches vides,
// « or à exploiter »). Aucune donnée personnelle, jamais bloquant :
// si la table n'existe pas encore (prisma db push non passé), la
// recherche du visiteur continue normalement.
// ─────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";

/** Normalise un terme de recherche : minuscules, espaces réduits, 80 car. max. */
export function normaliserTerme(brut: string): string {
  return brut
    .toLowerCase()
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/** Enregistre une recherche (feu et oubli, silencieux en cas d'échec). */
export async function journaliserRecherche(brut: string, nbResultats: number): Promise<void> {
  try {
    const terme = normaliserTerme(brut);
    if (!terme) return;

    const prismaRecherche = prisma as any;
    if (!prismaRecherche?.requeteRecherche) return;

    await prismaRecherche.requeteRecherche.create({
      data: { terme, nbResultats: Math.max(0, Math.trunc(nbResultats)) },
    });
  } catch {
    // La statistique ne doit jamais empêcher la recherche de fonctionner.
  }
}
