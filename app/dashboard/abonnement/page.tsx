// app/dashboard/abonnement/page.tsx
// Page « Mon abonnement » : statut premium, choix du plan (Découverte /
// Pro / Entreprise), historique de paiements, arrêt / reprise du
// renouvellement. Les plans sont la source lib/plans.ts (même contenu
// que /tarifs) et le paiement part vers le checkout Chariow
// (URLs définies par CHARIOW_URL_PRO / CHARIOW_URL_ENTREPRISE ;
// si une URL manque, repli sur l'ancien flux Moneroo).

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  Crown,
  ExternalLink,
  Gift,
  Leaf,
  Mail,
  PauseCircle,
  PlayCircle,
  ReceiptText,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/badge";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import { PLANS, PLAN_DECOUVERTE, formatePrix } from "@/lib/plans";
import {
  annulerAbonnementFormulaire,
  reactiverAbonnementFormulaire,
} from "@/app/actions/abonnements";

export const metadata: Metadata = {
  title: "Mon abonnement — Webgiverse Outils IA",
};
export const dynamic = "force-dynamic";

// URLs de paiement Chariow (à définir dans Netlify → Environment variables,
// et dans .env.local en local). Vide = repli sur le flux Moneroo existant.
const URL_CHARIOW_PRO = process.env.CHALIOW_URL_PRO?.trim() || null;
const URL_CHARIOW_ENTREPRISE = process.env.CHALIOW_URL_ENTREPRISE?.trim() || null;

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
  const planActifCle = actif ? (abonnement!.plan as "PRO" | "ENTREPRISE") : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:py-10">
      <h1 className="flex items-center gap-2 text-h2 font-semibold">
        <Crown className="size-7 text-violet" aria-hidden /> Mon abonnement
      </h1>

      {/* ── Statut ─────────────────────────────────────────────────── */}
      <Carte
        id="statut"
        className={`animate-apparition-haut mt-6 p-6 ${
          actif ? "border-violet/40 bg-violet/5" : ""
        }`}
      >
        {actif && abonnement ? (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[15px] leading-5 font-semibold text-violet">
                <CheckCircle2 className="size-5" aria-hidden />
                Premium actif — plan{" "}
                {PLANS[abonnement.plan as "PRO" | "ENTREPRISE"]?.nom ?? "Pro"}
              </p>
              <p className="mt-1.5 text-[14px] leading-5 text-encre">
                Actif jusqu&apos;au{" "}
                <strong>{formatteurDate.format(abonnement.expireLe)}</strong>
                {arreteRenouvellement
                  ? " · non renouvelé (tu repasseras au plan Découverte à cette date)"
                  : " · chaque nouveau paiement prolonge automatiquement de 30 jours"}
              </p>
              <p className="mt-1 text-[13px] leading-4 text-encre">
                Souscrit le {formatteurDate.format(abonnement.debutLe)}
              </p>
            </div>
            {abonnement.expireLe.getTime() - maintenant.getTime() <
              8 * 24 * 60 * 60 * 1000 && (
              <Bouton asChild taille="sm">
                <Link href="#plans">Prolonger 30 jours</Link>
              </Bouton>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[15px] leading-5 font-semibold">
                <Sparkles className="size-5 text-violet" aria-hidden /> Plan
                Découverte (gratuit)
              </p>
              <p className="mt-1.5 text-[14px] leading-5 text-encre">
                Passe Premium pour débloquer favoris illimités, alertes et
                avantages exclusifs.
              </p>
            </div>
            <Bouton asChild taille="sm">
              <Link href="#plans">Voir les plans</Link>
            </Bouton>
          </div>
        )}
      </Carte>

      {/* ── Choix du plan : les 3 offres ───────────────────────────── */}
      <section id="plans" className="mt-10 scroll-mt-24">
        <div className="text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
            <Sparkles className="size-4" aria-hidden /> Choisis ton plan
          </p>
          <h2 className="mt-3 text-h3 font-semibold">
            Commence gratuitement, évolue quand tu veux
          </h2>
          <p className="mx-auto mt-2 mesure text-[14px] leading-5 text-encre">
            Paiement sécurisé via Chariow : Mobile Money (MTN, Moov, Orange,
            Wave…), cartes Visa / Mastercard et plus. Abonnement prépayé 30
            jours, sans engagement.
          </p>
          <p className="mx-auto mt-2 flex max-w-2xl items-center justify-center gap-2 text-[13px] leading-5 font-medium text-violet">
            <Mail className="size-4 shrink-0" aria-hidden />
            Paie avec la même adresse e-mail que ton compte Webgiverse : ton
            Premium s&apos;active alors tout seul, en quelques secondes.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* ── Plan Découverte (gratuit) ── */}
          <Carte className="animate-apparition-haut delai-1 survol-carte relative flex flex-col p-6">
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-champ bg-gris text-violet">
                <Leaf className="size-5" aria-hidden />
              </span>
              <h3 className="text-h3 font-semibold">{PLAN_DECOUVERTE.nom}</h3>
            </div>
            <p className="mt-4 font-titre text-[34px] leading-10 font-bold">
              {PLAN_DECOUVERTE.prix}
              <span className="text-[14px] font-medium text-encre">
                {" "}
                / pour toujours
              </span>
            </p>
            <p className="mt-1 text-[14px] leading-5 text-encre">
              {PLAN_DECOUVERTE.accroche}
            </p>
            <ul className="mt-5 grid flex-1 gap-2.5">
              {PLAN_DECOUVERTE.avantages.map((avantage) => (
                <li
                  key={avantage}
                  className="flex items-start gap-2 text-[14px] leading-5"
                >
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-violet"
                    aria-hidden
                  />
                  <span className="text-bleu">{avantage}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {!actif ? (
                <span className="block rounded-full border border-turquoise bg-turquoise/15 px-4 py-2.5 text-center text-[14px] leading-5 font-bold text-[#006e60]">
                  Ton plan actuel
                </span>
              ) : (
                <Bouton asChild variante="secondaire" className="w-full">
                  <Link href="#statut">Gérer mon plan actuel</Link>
                </Bouton>
              )}
            </div>
          </Carte>

          {/* ── Plans payants (Pro + Entreprise) ── */}
          {Object.values(PLANS).map((plan, index) => {
            const estPlanActuel = planActifCle === plan.cle;
            const urlChariow =
              plan.cle === "PRO" ? URL_CHARIOW_PRO : URL_CHARIOW_ENTREPRISE;
            return (
              <Carte
                key={plan.cle}
                className={`animate-apparition-haut survol-carte relative flex flex-col p-6 ${
                  plan.recommande
                    ? "delai-2 border-violet shadow-[0_10px_40px_rgba(106,59,255,0.18)] lg:-translate-y-1"
                    : index === 1
                      ? "delai-3"
                      : ""
                }`}
              >
                {plan.recommande && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet px-3 py-1 text-[12px] leading-4 font-bold text-white shadow-[0_4px_14px_rgba(106,59,255,0.4)]">
                    Le plus populaire
                  </span>
                )}
                {estPlanActuel && (
                  <span className="absolute -top-3 right-5 rounded-full border border-turquoise bg-turquoise px-3 py-1 text-[12px] leading-4 font-bold text-bleu">
                    Ton plan actuel
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <span className="grid size-10 place-items-center rounded-champ bg-violet/10 text-violet">
                    {plan.cle === "PRO" ? (
                      <Crown className="size-5" aria-hidden />
                    ) : (
                      <Rocket className="size-5" aria-hidden />
                    )}
                  </span>
                  <h3 className="text-h3 font-semibold">{plan.nom}</h3>
                </div>
                <p className="mt-4 font-titre text-[34px] leading-10 font-bold">
                  {plan.prix}
                  <span className="text-[14px] font-medium text-encre">
                    {" "}
                    / mois
                  </span>
                </p>
                <p className="mt-1 text-[14px] leading-5 text-encre">
                  {plan.accroche}
                </p>
                <ul className="mt-5 grid flex-1 gap-2.5">
                  {plan.avantages.map((avantage) => (
                    <li
                      key={avantage}
                      className="flex items-start gap-2 text-[14px] leading-5"
                    >
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-violet"
                        aria-hidden
                      />
                      <span className="text-bleu">{avantage}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {estPlanActuel ? (
                    <Bouton asChild variante="secondaire" className="w-full">
                      <Link href="#statut">Ton plan actuel — gérer</Link>
                    </Bouton>
                  ) : urlChariow ? (
                    <Bouton asChild className="w-full">
                      <a
                        href={urlChariow}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {actif
                          ? `Passer au plan ${plan.nom}`
                          : `Choisir ${plan.nom}`}
                        <ExternalLink className="ml-1.5 inline size-4" aria-hidden />
                      </a>
                    </Bouton>
                  ) : (
                    <Bouton asChild className="w-full">
                      <Link href={`/tarifs/paiement?plan=${plan.cle}`}>
                        {actif
                          ? `Passer au plan ${plan.nom}`
                          : `Choisir ${plan.nom}`}
                      </Link>
                    </Bouton>
                  )}
                </div>
              </Carte>
            );
          })}
        </div>

        <p className="mx-auto mt-6 flex max-w-2xl items-center justify-center gap-2 text-center text-[13px] leading-5 text-encre">
          <ShieldCheck className="size-4 shrink-0 text-violet" aria-hidden />
          Transactions traitées par <strong>Chariow</strong>. Webgiverse ne voit
          jamais tes codes ni numéros de carte.
        </p>
      </section>

      {/* ── Gestion du renouvellement ──────────────────────────────── */}
      {actif && abonnement && (
        <Carte className="animate-apparition-haut mt-10 flex flex-wrap items-center justify-between gap-3 p-5">
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
          <ReceiptText className="size-5 text-violet" aria-hidden /> Historique
          de paiements
        </h2>
        {paiements.length === 0 ? (
          <Carte className="animate-apparition-haut mt-4 p-6 text-center text-[14px] leading-5 text-encre">
            Aucun paiement pour le moment.
            {!actif && (
              <>
                {" "}
                <Link
                  href="#plans"
                  className="font-semibold text-violet hover:underline"
                >
                  Découvre les offres Premium →
                </Link>
              </>
            )}
          </Carte>
        ) : (
          <div className="animate-apparition-haut mt-4 overflow-x-auto rounded-carte border border-bordure bg-white shadow-carte">
            <table className="w-full min-w-[480px] text-left text-[14px]">
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
                    <td className="px-4 py-3 text-bleu">
                      {formatteurDateHeure.format(paiement.creeLe)}
                    </td>
                    <td className="px-4 py-3 text-bleu">
                      {PLANS[paiement.plan as "PRO" | "ENTREPRISE"]?.nom ??
                        paiement.plan}
                    </td>
                    <td className="px-4 py-3 font-semibold text-bleu">
                      {formatePrix(paiement.montant)}
                    </td>
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

      {/* ── Avantages premium (rappel si actif) ────────────────────── */}
      {actif && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-h3 font-semibold">
            <Gift className="size-5 text-violet" aria-hidden /> Tes avantages
            Premium
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(
              PLANS[planActifCle ?? "PRO"]?.avantages ?? PLANS.PRO.avantages
            ).map((avantage, index) => (
              <Carte
                key={avantage}
                className={`animate-apparition-haut delai-${
                  (index % 6) + 1
                } flex items-start gap-2 p-4`}
              >
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-violet"
                  aria-hidden
                />
                <span className="text-[14px] leading-5 text-bleu">
                  {avantage}
                </span>
              </Carte>
            ))}
          </div>
        </section>
      )}
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