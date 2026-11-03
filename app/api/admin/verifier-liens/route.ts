// app/api/admin/verifier-liens/route.ts
// ─────────────────────────────────────────────────────────────────
// Lot 26 — Vérification des liens du catalogue (détection des liens
// morts). POST /api/admin/verifier-liens, réservé aux admins :
//   • passe les fiches PUBLIÉES par le lien le plus ancien vérifié
//     (jamais vérifiées d'abord), 40 fiches par lancement ;
//   • teste chaque URL (HEAD, puis GET en repli sur 403/405/501) avec
//     un délai d'attente de 6 s ; 0 = injoignable, code HTTP sinon ;
//   • s'arrête proprement au bout de ~50 s (interrompu = relancer) ;
//   • trace l'action dans le journal d'audit.
// Le résultat alimente l'alerte « liens morts » du tableau de bord.
// ─────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tracerConsultation } from "@/lib/journal-admin";

export const maxDuration = 60; // Vercel — temps laissé à la vérification

const PAR_LANCEMENT = 40;
const DELAI_RESEAU_MS = 6_000;
const BUDGET_TOTAL_MS = 50_000;
const PARALLELE = 6;
/** Codes qui mentent souvent sur un HEAD et méritent un essai GET. */
const A_REESSAYER_EN_GET = new Set([403, 405, 501]);

/** Teste une URL : HEAD puis GET en repli. 0 = injoignable / timeout. */
async function testerUrl(url: string): Promise<number> {
  const entetes = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 WebgiverseLinkCheck/1.0",
    Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
  };

  for (const methode of ["HEAD", "GET"] as const) {
    try {
      const reponse = await fetch(url, {
        method: methode,
        redirect: "follow",
        headers: entetes,
        signal: AbortSignal.timeout(DELAI_RESEAU_MS),
      });
      // On libère le corps immédiatement : seul le code HTTP nous intéresse.
      reponse.body?.cancel().catch(() => {});
      if (methode === "HEAD" && A_REESSAYER_EN_GET.has(reponse.status)) continue;
      return reponse.status;
    } catch {
      continue; // réseau / timeout → on tente le GET, sinon 0
    }
  }
  return 0;
}

export async function POST() {
  // ── Accès réservé aux admins ─────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
  }
  const moi = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (moi?.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  const debut = Date.now();

  // Priorité : jamais vérifiées d'abord, puis vérifiées le plus anciennement.
  const outils = await prisma.tool.findMany({
    where: { statut: "PUBLIE", url: { startsWith: "http" } },
    orderBy: [{ lienVerifieLe: { sort: "asc", nulls: "first" } }],
    select: { id: true, nom: true, url: true },
    take: PAR_LANCEMENT,
  });

  if (outils.length === 0) {
    return NextResponse.json({ verifies: 0, morts: 0, interrompu: false });
  }

  let verifies = 0;
  let morts = 0;
  let interrompu = false;

  /** Traite un lot d'outils en parallèle. */
  async function traiterLot(lot: typeof outils) {
    await Promise.all(
      lot.map(async (outil) => {
        const statutLien = await testerUrl(outil.url);
        await prisma.tool.update({
          where: { id: outil.id },
          data: { statutLien, lienVerifieLe: new Date() },
        });
        verifies += 1;
        if (statutLien === 0 || statutLien >= 400) morts += 1;
      }),
    );
  }

  for (let i = 0; i < outils.length; i += PARALLELE) {
    if (Date.now() - debut > BUDGET_TOTAL_MS) {
      interrompu = true;
      break;
    }
    await traiterLot(outils.slice(i, i + PARALLELE));
  }

  try {
    await tracerConsultation(
      "VERIFICATION_LIENS",
      `${verifies} lien(s) vérifié(s), ${morts} en défaut${interrompu ? " (interrompu, à relancer)" : ""}`,
    );
  } catch {
    /* le journal ne bloque jamais */
  }
  revalidatePath("/admin");

  return NextResponse.json({ verifies, morts, interrompu });
}
