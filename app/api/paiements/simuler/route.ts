// app/api/paiements/simuler/route.ts
// MODE SIMULATION UNIQUEMENT : conclut un paiement factice (réussite ou échec).
// Sécurisé : uniquement pour les Paiements créés en simulation, par leur propriétaire.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { activerAbonnement } from "@/lib/moneroo";

export async function POST(requete: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Connecte-toi d'abord." }, { status: 401 });
  }

  let corps: { reference?: string; reussite?: boolean };
  try {
    corps = await requete.json();
  } catch {
    return NextResponse.json({ message: "Requête invalide." }, { status: 400 });
  }

  const reference = String(corps.reference ?? "");
  if (!reference) {
    return NextResponse.json({ message: "Référence manquante." }, { status: 400 });
  }

  const paiement = await prisma.paiement.findUnique({ where: { reference } });
  if (!paiement || paiement.utilisateurId !== session.user.id) {
    return NextResponse.json({ message: "Paiement introuvable." }, { status: 404 });
  }
  if (!paiement.simulation) {
    // Un vrai paiement Moneroo ne peut JAMAIS être conclu via cette route :
    // seule la vérification Moneroo (webhook / verify) peut le confirmer.
    return NextResponse.json({ message: "Ce paiement n'est pas une simulation." }, { status: 403 });
  }
  if (paiement.statut === "PAYE") {
    return NextResponse.json({ ok: true, statut: "PAYE" });
  }

  if (corps.reussite === false) {
    await prisma.paiement.update({ where: { id: paiement.id }, data: { statut: "ECHOUE" } });
    return NextResponse.json({ ok: true, statut: "ECHOUE" });
  }

  const abonnement = await activerAbonnement({
    utilisateurId: paiement.utilisateurId,
    plan: paiement.plan as "PRO" | "ENTREPRISE",
    paiementId: paiement.id,
  });

  await prisma.paiement.update({
    where: { id: paiement.id },
    data: { statut: "PAYE", canal: "simulation" },
  });

  return NextResponse.json({ ok: true, statut: "PAYE", expireLe: abonnement.expireLe });
}