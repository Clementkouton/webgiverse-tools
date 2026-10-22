// app/tarifs/paiement/page.tsx
// Page checkout : prépare le contexte côté serveur (session, plan, mode simulation)
// puis affiche le formulaire de paiement (client).

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { Carte } from "@/components/ui/carte";
import { CheckoutPaiement } from "@/components/tarifs/checkout-paiement";
import { planValide } from "@/lib/plans";
import { estSimulation } from "@/lib/moneroo";

export const metadata: Metadata = { title: "Paiement — Webgiverse Outils IA" };
export const dynamic = "force-dynamic";

export default async function PagePaiement({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/connexion?suite=/tarifs");
  }

  const { plan: clePlan } = await searchParams;
  const plan = planValide(clePlan);
  if (!plan) redirect("/tarifs");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/tarifs" className="inline-flex items-center gap-1 text-[14px] font-semibold text-violet hover:underline">
        <ChevronLeft className="size-4" aria-hidden /> Retour aux tarifs
      </Link>
      <h1 className="mt-3 text-h3 font-semibold">Finaliser ton abonnement {plan.nom}</h1>
      <p className="mt-1 text-[14px] leading-5 text-encre">
        Compte : {session.user.email}
      </p>

      <Carte className="mt-6 p-6">
        <CheckoutPaiement
          plan={plan.cle}
          nomPlan={plan.nom}
          prix={plan.prix}
          simulation={estSimulation()}
        />
      </Carte>

      <p className="mt-4 text-center text-[13px] leading-5 text-encre">
        En payant, tu acceptes que ton abonnement soit actif 30 jours, sans reconduction
        automatique. Tu pourras le renouveler ou l&apos;arrêter à tout moment.
      </p>
    </div>
  );
}