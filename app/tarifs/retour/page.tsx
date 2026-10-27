// app/tarifs/retour/page.tsx
// ─────────────────────────────────────────────────────────────────
// Page de retour après paiement Chariow (paramètre redirect_url de
// l'API checkout). Deux usages :
//   - ?embed=1 : affichée DANS la fenêtre de paiement (iframe) — le
//     composant BoutonPaiement détecte cette URL et referme la fenêtre.
//   - navigation normale : le client revient ici après paiement ; la
//     page vérifie l'abonnement toutes les 3 s (le webhook Chariow
//     active le Premium en arrière-plan) puis félicite.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Crown } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";
import { VerificationRetour } from "@/components/tarifs/verification-retour";

export const metadata: Metadata = { title: "Paiement — Webgiverse Outils IA" };
export const dynamic = "force-dynamic";

export default async function PageRetour({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string }>;
}) {
  const { embed } = await searchParams;
  const session = await auth().catch(() => null);
  const abonnement = session?.user?.id
    ? await prisma.abonnement
        .findUnique({ where: { utilisateurId: session.user.id } })
        .catch(() => null)
    : null;
  const actif = Boolean(
    abonnement && abonnement.statut === "ACTIF" && abonnement.expireLe > new Date(),
  );

  // ── Version compacte (iframe de la fenêtre de paiement) ──
  if (embed) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-6 text-center">
        {actif ? (
          <p className="flex items-center gap-2 text-[15px] font-semibold text-violet">
            <CheckCircle2 className="size-5" aria-hidden /> Paiement confirmé — tu peux fermer
            cette fenêtre.
          </p>
        ) : (
          <p className="text-[14px] text-encre">Paiement reçu — vérification…</p>
        )}
      </div>
    );
  }

  // ── Version complète (navigation normale) ──
  const nomPlan = actif && abonnement ? PLANS[abonnement.plan as "PRO" | "ENTREPRISE"]?.nom : null;

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      {actif ? (
        <>
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-violet/10">
            <Crown className="size-8 text-violet" aria-hidden />
          </span>
          <h1 className="mt-5 text-h2 font-titre font-semibold">Bienvenue en Premium ! 🎉</h1>
          <p className="mt-3 text-[15px] leading-6 text-encre">
            Ton paiement est confirmé et ton plan{" "}
            <strong className="text-violet">{nomPlan ?? "Premium"}</strong> est actif jusqu&apos;au{" "}
            {abonnement
              ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(abonnement.expireLe)
              : ""}
            . Merci de soutenir Webgiverse !
          </p>
          <Link
            href="/dashboard"
            className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-violet px-7 text-[16px] leading-5 font-semibold text-white transition hover:bg-violet-clair"
          >
            Retourner dans mon espace
          </Link>
        </>
      ) : (
        <>
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-gris">
            <CheckCircle2 className="size-8 text-violet" aria-hidden />
          </span>
          <h1 className="mt-5 text-h2 font-titre font-semibold">Paiement en cours de vérification</h1>
          <p className="mt-3 text-[15px] leading-6 text-encre">
            Nous avons bien reçu ton retour de paiement. L&apos;activation automatique arrive —
            cette page se met à jour toute seule. Si tu fermes la page, aucun souci : ton
            Premium s&apos;activera quand même dans ton tableau de bord.
          </p>
          <VerificationRetour />
        </>
      )}
    </div>
  );
}