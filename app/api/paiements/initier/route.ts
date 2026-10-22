// app/api/paiements/initier/route.ts
// Crée un Paiement en attente puis :
//  - mode SIMULATION (pas de clé .env) → renvoie { simulation: true, reference }
//  - mode RÉEL → ouvre une transaction Moneroo → renvoie { simulation: false, url }

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { planValide } from "@/lib/plans";
import { estSimulation, initierPaiementMoneroo, nouvelleReference } from "@/lib/moneroo";

export async function POST(requete: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Connecte-toi pour souscrire." }, { status: 401 });
  }
  if (!session.user.email) {
    return NextResponse.json(
      { message: "Ton compte n'a pas d'email : impossible de créer un paiement Moneroo." },
      { status: 400 },
    );
  }

  let corps: { plan?: string };
  try {
    corps = await requete.json();
  } catch {
    return NextResponse.json({ message: "Requête invalide." }, { status: 400 });
  }

  // Le montant vient TOUJOURS de lib/plans (jamais du client).
  const plan = planValide(corps.plan);
  if (!plan) {
    return NextResponse.json({ message: "Plan inconnu." }, { status: 400 });
  }

  const simulation = estSimulation();
  const reference = nouvelleReference();

  try {
    await prisma.paiement.create({
      data: {
        utilisateurId: session.user.id,
        plan: plan.cle,
        montant: plan.montant,
        devise: "USD",
        statut: "EN_ATTENTE",
        reference,
        simulation,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Le modèle Paiement est introuvable : as-tu lancé « npx prisma db push » après avoir ajouté le schéma ?" },
      { status: 500 },
    );
  }

  // ── Mode simulation : le checkout factice s'affiche dans le site.
  if (simulation) {
    return NextResponse.json({ simulation: true, reference, montant: plan.montant });
  }

  // ── Mode réel : on ouvre le checkout officiel Moneroo.
  const origine = new URL(requete.url).origin;
  const resultat = await initierPaiementMoneroo({
    email: session.user.email,
    nomComplet: session.user.name ?? "",
    montant: plan.montant,
    reference,
    urlRetour: `${origine}/tarifs/retour`,
  });

  if (!resultat.ok || !resultat.url) {
    await prisma.paiement.update({
      where: { reference },
      data: { statut: "ECHOUE" },
    });
    return NextResponse.json(
      { message: `Moneroo : ${resultat.message}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ simulation: false, url: resultat.url, reference });
}