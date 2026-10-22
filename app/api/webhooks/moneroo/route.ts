// app/api/webhooks/moneroo/route.ts
// Webhook officiel Moneroo : Moneroo appelle cette URL à chaque événement
// (payment.success…) et signe le corps avec HMAC-SHA256. On vérifie la
// signature AVANT toute autre chose, puis on confirme le paiement.
//
// À configurer plus tard sur le dashboard Moneroo (Développeurs → Webhooks) :
//   URL du webhook : https://ton-domaine.com/api/webhooks/moneroo

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activerAbonnement, cleSecrete, signatureWebhookValide } from "@/lib/moneroo";

type EvenementMoneroo = {
  event?: string;
  data?: {
    id?: string;
    status?: string;
    metadata?: { reference?: string };
    capture?: { method?: { name?: string } };
  };
};

export async function POST(requete: Request) {
  const secret = cleSecrete();
  if (!secret) {
    // En mode simulation, Moneroo n'est jamais censé nous appeler.
    return NextResponse.json({ message: "Webhook inactif (mode simulation)." }, { status: 503 });
  }

  // Le corps BRUT est indispensable : la signature porte dessus.
  const corpsBrut = await requete.text();
  const signature = requete.headers.get("x-moneroo-signature");

  if (!signatureWebhookValide(corpsBrut, signature)) {
    return NextResponse.json({ message: "Signature invalide." }, { status: 403 });
  }

  let evenement: EvenementMoneroo;
  try {
    evenement = JSON.parse(corpsBrut);
  } catch {
    return NextResponse.json({ message: "Corps invalide." }, { status: 400 });
  }

  if (evenement.event !== "payment.success" || !evenement.data) {
    // Autre événement (payment.failed, payment.cancelled…) : accusé de réception.
    return NextResponse.json({ recu: true });
  }

  // On retrouve le paiement par la référence glissée dans les metadata.
  const referenceMetadata =
    typeof evenement.data.metadata?.reference === "string"
      ? evenement.data.metadata.reference
      : undefined;

  const paiement = referenceMetadata
    ? await prisma.paiement.findUnique({ where: { reference: referenceMetadata } })
    : null;

  if (!paiement) {
    // Paiement inconnu (peut être une transaction hors site) : accusé de réception.
    return NextResponse.json({ recu: true });
  }

  // Idempotence : si le paiement est déjà confirmé, on ne refait rien.
  if (paiement.statut === "PAYE") {
    return NextResponse.json({ recu: true });
  }

  await activerAbonnement({
    utilisateurId: paiement.utilisateurId,
    plan: paiement.plan as "PRO" | "ENTREPRISE",
    paiementId: paiement.id,
  });
  await prisma.paiement.update({
    where: { id: paiement.id },
    data: {
      statut: "PAYE",
      canal: evenement.data.capture?.method?.name ?? "Moneroo",
    },
  });

  return NextResponse.json({ recu: true });
}