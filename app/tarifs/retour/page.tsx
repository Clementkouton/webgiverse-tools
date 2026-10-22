// app/tarifs/retour/page.tsx
// Page de confirmation après paiement :
//  - simulation → lecture directe du statut en base
//  - réel (Moneroo) → si encore en attente, demande confirmation à l'API Moneroo

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Crown } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { activerAbonnement, verifierPaiementMoneroo } from "@/lib/moneroo";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = { title: "Confirmation du paiement — Webgiverse Outils IA" };
export const dynamic = "force-dynamic";

export default async function PageRetour({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?suite=/tarifs");

  const { reference } = await searchParams;
  if (!reference) redirect("/tarifs");

  let paiement = await prisma.paiement
    .findUnique({ where: { reference } })
    .catch(() => null);

  if (!paiement || paiement.utilisateurId !== session.user.id) redirect("/tarifs");

  // Mode réel : Moneroo nous ramène AVANT (ou sans) le webhook —
  // on demande confirmation pour ne rater aucun paiement.
  if (paiement.statut === "EN_ATTENTE" && !paiement.simulation) {
    const verification = await verifierPaiementMoneroo(paiement.reference).catch(() => null);
    if (verification?.ok && verification.donnees?.statut === "success") {
      const conforme =
        verification.donnees.devise === paiement.devise &&
        verification.donnees.montant >= paiement.montant;
      if (conforme) {
        await activerAbonnement({
          utilisateurId: paiement.utilisateurId,
          plan: paiement.plan as "PRO" | "ENTREPRISE",
          paiementId: paiement.id,
        });
        paiement = await prisma.paiement.update({
          where: { id: paiement.id },
          data: { statut: "PAYE", canal: verification.donnees.canal },
        });
      }
    }
  }

  const paye = paiement.statut === "PAYE";
  const echoue = paiement.statut === "ECHOUE";
  const abonnement = paye
    ? await prisma.abonnement.findUnique({ where: { utilisateurId: session.user.id } })
    : null;
  const nomPlan = PLANS[paiement.plan as "PRO" | "ENTREPRISE"]?.nom ?? paiement.plan;

  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <Carte className="grid gap-5 p-8 text-center">
        {paye ? (
          <>
            <CheckCircle2 className="mx-auto size-14 text-violet" aria-hidden />
            <h1 className="text-h3 font-semibold">Bienvenue en Premium ! 🎉</h1>
            <p className="text-[15px] leading-6 text-encre">
              Ton paiement de <strong>{paiement.devise === "USD" ? `$${(paiement.montant / 100).toFixed(2)}` : paiement.montant}</strong>{" "}
              ({nomPlan}) a bien été reçu{paiement.canal ? ` via ${paiement.canal}` : ""}.
              {abonnement?.expireLe && (
                <>
                  {" "}Ton abonnement est actif jusqu&apos;au{" "}
                  <strong>
                    {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(abonnement.expireLe)}
                  </strong>
                  .
                </>
              )}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Bouton asChild>
                <Link href="/dashboard">
                  <Crown className="size-4" aria-hidden /> Retour au dashboard
                </Link>
              </Bouton>
              <Bouton asChild variante="secondaire">
                <Link href="/dashboard/abonnement">Gérer mon abonnement</Link>
              </Bouton>
            </div>
          </>
        ) : echoue ? (
          <>
            <XCircle className="mx-auto size-14 text-red-600" aria-hidden />
            <h1 className="text-h3 font-semibold">Paiement non abouti</h1>
            <p className="text-[15px] leading-6 text-encre">
              Le paiement n&apos;a pas été confirmé. Aucun montant n&apos;a été débité. Tu peux
              réessayer quand tu veux.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Bouton asChild>
                <Link href={`/tarifs/paiement?plan=${paiement.plan}`}>Réessayer</Link>
              </Bouton>
              <Bouton asChild variante="secondaire">
                <Link href="/tarifs">Voir les tarifs</Link>
              </Bouton>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto size-14 animate-spin text-violet" aria-hidden />
            <h1 className="text-h3 font-semibold">Paiement en cours de vérification…</h1>
            <p className="text-[15px] leading-6 text-encre">
              Moneroo n&apos;a pas encore confirmé la transaction (réf. {paiement.reference}).
              Si tu as payé, ton abonnement sera actif dans quelques instants — recharge cette
              page ou reviens sur le dashboard.
            </p>
            <Bouton asChild variante="secondaire">
              <Link href="/dashboard/abonnement">Aller à mon abonnement</Link>
            </Bouton>
          </>
        )}
      </Carte>
    </div>
  );
}