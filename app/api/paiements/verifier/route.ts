// app/api/paiements/verifier/route.ts
// Vérifie l'état d'un paiement :
//  - simulation → simple lecture en base
//  - réel → interroge l'API Moneroo (payments/{id}/verify) si encore en attente,
//           puis met à jour la base et active l'abonnement si succès confirmé.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { activerAbonnement, estSimulation, verifierPaiementMoneroo } from "@/lib/moneroo";

export async function GET(requete: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Connecte-toi d'abord." }, { status: 401 });
  }

  const reference = new URL(requete.url).searchParams.get("reference") ?? "";
  if (!reference) {
    return NextResponse.json({ message: "Référence manquante." }, { status: 400 });
  }

  const paiement = await prisma.paiement.findUnique({ where: { reference } });
  if (!paiement || paiement.utilisateurId !== session.user.id) {
    return NextResponse.json({ message: "Paiement introuvable." }, { status: 404 });
  }

  // Déjà conclu : on renvoie l'état tel quel.
  if (paiement.statut !== "EN_ATTENTE") {
    return NextResponse.json({ statut: paiement.statut, plan: paiement.plan });
  }

  // Simulation : reste en attente tant que le checkout factice n'a pas conclu.
  if (paiement.simulation || estSimulation()) {
    return NextResponse.json({ statut: paiement.statut, plan: paiement.plan });
  }

  // Mode réel : on demande confirmation à Moneroo (via l'identifiant Moneroo).
  const monerooId = (paiement as typeof paiement & { monerooId?: string | null }).monerooId;
  if (!monerooId) {
    return NextResponse.json({ statut: paiement.statut, plan: paiement.plan });
  }

  const verification = await verifierPaiementMoneroo(monerooId);
  if (!verification.ok || !verification.donnees) {
    return NextResponse.json({ statut: paiement.statut, plan: paiement.plan });
  }

  const etat = verification.donnees.statut;
  if (etat === "success") {
    // Sécurité : vérifie que le montant payé correspond bien au plan.
    const conforme =
      verification.donnees.devise === paiement.devise &&
      verification.donnees.montant >= paiement.montant;
    if (conforme) {
      await activerAbonnement({
        utilisateurId: paiement.utilisateurId,
        plan: paiement.plan as "PRO" | "ENTREPRISE",
        paiementId: paiement.id,
      });
      await prisma.paiement.update({
        where: { id: paiement.id },
        data: { statut: "PAYE", canal: verification.donnees.canal },
      });
      return NextResponse.json({ statut: "PAYE", plan: paiement.plan });
    }
    await prisma.paiement.update({ where: { id: paiement.id }, data: { statut: "ECHOUE" } });
    return NextResponse.json({ statut: "ECHOUE", plan: paiement.plan });
  }

  if (etat === "failed") {
    await prisma.paiement.update({ where: { id: paiement.id }, data: { statut: "ECHOUE" } });
    return NextResponse.json({ statut: "ECHOUE", plan: paiement.plan });
  }

  // pending / cancelled : toujours en attente côté Moneroo.
  return NextResponse.json({ statut: "EN_ATTENTE", plan: paiement.plan });
}