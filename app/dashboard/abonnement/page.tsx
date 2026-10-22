// app/dashboard/abonnement/page.tsx
// Page « Mon abonnement » : statut premium, avantages, historique de paiements,
// arrêt / reprise du renouvellement. Accessible depuis /tarifs et le dashboard.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  Crown,
  Gift,
  PauseCircle,
  PlayCircle,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/badge";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import { PLANS, formatePrix } from "@/lib/plans";
import { annulerAbonnementFormulaire, reactiverAbonnementFormulaire } from "@/app/actions/abonnements";

export const metadata: Metadata = { title: "Mon abonnement — Webgiverse Outils IA" };
export const dynamic = "force-dynamic";

const formatteurDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });
const formatteurDateHeure = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function PageMonAbonnement() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?suite=/dashboard/abonnement");

  // Le modèle peut ne pas exister si le db push n'a pas encore été fait : garde douce.
  let abonnement = null;
  let paiements: Awaited<ReturnType<typeof listerPaiements>> = [];
  try {
    abonnement = await prisma.abonnement.findUnique({
      where: { utilisateurId: session.user.id },
    });
    paiements = await listerPaiements(session.user.id);
  } catch {
    // base pas encore à jour → on affiche l'invitation premium
  }

  const maintenant = new Date();
  const actif = abonnement?.statut === "ACTIF" && abonnement.expireLe > maintenant;
  const arreteRenouvellement = Boolean(abonnement?.annuleLe);
  const avantages: readonly string[] =
    (actif && abonnement
      ? PLANS[abonnement.plan as "PRO" | "ENTREPRISE"]?.avantages
      : undefined) ?? PLANS.PRO.avantages;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:py-12">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-[14px] font-semibold text-violet hover:underline">
        <ChevronLeft className="size-4" aria-hidden /> Retour au dashboard
      </Link>
      <h1 className="mt-3 flex items-center gap-2 text-h2 font-semibold">
        <Crown className="size-7 text-violet" aria-hidden /> Mon abonnement
      </h1>

      {/* ── Statut ─────────────────────────────────────────────────── */}
      <Carte
        className={`mt-6 p-6 ${actif ? "border-violet/40 bg-violet/5" : ""}`}
      >
        {actif && abonnement ? (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[15px] leading-5 font-semibold text-violet">
                <CheckCircle2 className="size-5" aria-hidden />
                Premium actif — plan {PLANS[abonnement.plan as "PRO" | "ENTREPRISE"]?.nom ?? "Pro"}
              </p>
              <p className="mt-1.5 text-[14px] leading-5 text-encre">
                Actif jusqu&apos;au <strong>{formatteurDate.format(abonnement.expireLe)}</strong>
                {arreteRenouvellement
                  ? " · non renouvelé (tu repasseras au plan Découverte à cette date)"
                  : " · tu peux prolonger à tout moment depuis la page Tarifs"}
              </p>
              <p className="mt-1 text-[13px] leading-4 text-encre">
                Souscrit le {formatteurDate.format(abonnement.debutLe)}
              </p>
            </div>
            {abonnement.expireLe.getTime() - maintenant.getTime() < 8 * 24 * 60 * 60 * 1000 && (
              <Bouton asChild taille="sm">
                <Link href="/tarifs">Prolonger 30 jours</Link>
              </Bouton>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[15px] leading-5 font-semibold">
                <Sparkles className="size-5 text-violet" aria-hidden /> Plan Découverte (gratuit)
              </p>
              <p className="mt-1.5 text-[14px] leading-5 text-encre">
                Passe Premium pour débloquer favoris illimités, alertes et avantages exclusifs.
              </p>
            </div>
            <Bouton asChild taille="sm">
              <Link href="/tarifs">Voir les offres</Link>
            </Bouton>
          </div>
        )}
      </Carte>

      {/* ── Gestion du renouvellement ──────────────────────────────── */}
      {actif && abonnement && (
        <Carte className="mt-4 flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-[14px] leading-5 text-encre">
            {arreteRenouvellement
              ? "Tu as arrêté le renouvellement. Tu profites de Premium jusqu'à l'échéance."
              : "Ton plan reste actif 30 jours après chaque paiement. Aucun prélèvement automatique."}
          </p>
          {arreteRenouvellement ? (
            <form action={reactiverAbonnementFormulaire}>
              <BoutonConfirmer
                type="submit"
                message="Reprendre le plan Premium ? Tu pourras le payer à l'échéance depuis la page Tarifs."
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-violet bg-white px-4 text-[14px] leading-5 font-semibold text-bleu transition hover:bg-gris"
              >
                <PlayCircle className="size-4" aria-hidden /> Reprendre Premium
              </BoutonConfirmer>
            </form>
          ) : (
            <form action={annulerAbonnementFormulaire}>
              <BoutonConfirmer
                type="submit"
                message="Arrêter ton plan Premium ? Il restera actif jusqu'à la date d'échéance déjà payée."
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-bordure bg-white px-4 text-[14px] leading-5 font-semibold text-red-600 transition hover:bg-red-50"
              >
                <PauseCircle className="size-4" aria-hidden /> Arrêter le plan
              </BoutonConfirmer>
            </form>
          )}
        </Carte>
      )}

      {/* ── Historique des paiements ───────────────────────────────── */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-h3 font-semibold">
          <ReceiptText className="size-5 text-violet" aria-hidden /> Historique de paiements
        </h2>
        {paiements.length === 0 ? (
          <Carte className="mt-4 p-6 text-center text-[14px] leading-5 text-encre">
            Aucun paiement pour le moment.
            {!actif && (
              <>
                {" "}
                <Link href="/tarifs" className="font-semibold text-violet hover:underline">
                  Découvre les offres Premium →
                </Link>
              </>
            )}
          </Carte>
        ) : (
          <div className="mt-4 overflow-hidden rounded-carte border border-bordure bg-white shadow-carte">
            <table className="w-full text-left text-[14px]">
              <thead className="bg-gris text-[12px] leading-4 uppercase text-encre">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Montant</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {paiements.map((paiement) => (
                  <tr key={paiement.id} className="border-t border-bordure">
                    <td className="px-4 py-3 text-bleu">{formatteurDateHeure.format(paiement.creeLe)}</td>
                    <td className="px-4 py-3 text-bleu">
                      {PLANS[paiement.plan as "PRO" | "ENTREPRISE"]?.nom ?? paiement.plan}
                    </td>
                    <td className="px-4 py-3 font-semibold text-bleu">{formatePrix(paiement.montant)}</td>
                    <td className="px-4 py-3">
                      {paiement.statut === "PAYE" ? (
                        <Badge variante="gratuit">Payé</Badge>
                      ) : paiement.statut === "ECHOUE" ? (
                        <Badge variante="defaut">Échoué</Badge>
                      ) : (
                        <Badge variante="defaut">En attente</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Avantages premium (rappel) ─────────────────────────────── */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-h3 font-semibold">
          <Gift className="size-5 text-violet" aria-hidden /> Tes avantages Premium
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {avantages.map((avantage) => (
              <Carte key={avantage} className="flex items-start gap-2 p-4">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-violet" aria-hidden />
                <span className="text-[14px] leading-5 text-bleu">{avantage}</span>
              </Carte>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Liste les paiements de l'utilisateur (les plus récents d'abord). */
async function listerPaiements(utilisateurId: string) {
  return prisma.paiement.findMany({
    where: { utilisateurId },
    orderBy: { creeLe: "desc" },
    take: 10,
  });
}