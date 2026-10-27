// components/tarifs/section-plans.tsx
// ─────────────────────────────────────────────────────────────────
// Section « Webgiverse Premium » affichée sur la page d'accueil.
//
// NOUVEAU — connexion obligatoire AVANT de choisir un plan :
//   • visiteur NON connecté → le bouton envoie vers /connexion
//     (avec suite=%2Ftarifs) : après la connexion, il revient sur la
//     page des tarifs pour choisir son plan tranquillement ;
//   • visiteur connecté → bouton BoutonPayer (parcours Chariow
//     normal, inchangé).
// Aucune requête à la base de données ici → la landing page ne peut
// jamais planter à cause de cette section (le connecte vient de la
// session JWT, sans base de données).
// ─────────────────────────────────────────────────────────────────
import Link from "next/link";
import { ArrowRight, Check, Crown, Leaf, ShieldCheck } from "lucide-react";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { BoutonPayer } from "@/components/paiement/bouton-payer";
import { PLANS, PLAN_DECOUVERTE } from "@/lib/plans";

export function SectionPlans({ connecte = false }: { connecte?: boolean }) {
  return (
    <section className="bg-white py-14 lg:py-18" aria-labelledby="titre-premium-accueil">
      <div className="mx-auto max-w-7xl px-4">
        {/* En-tête de la section */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
            <Crown className="size-4" aria-hidden /> Webgiverse Premium
          </p>
          <h2 id="titre-premium-accueil" className="mt-4 text-[26px] leading-8 font-semibold sm:text-h2">
            Passe à la vitesse supérieure
          </h2>
          <p className="mesure mx-auto mt-3 text-encre">
            Débloque tes favoris, tes listes et des avantages exclusifs. Paiement sécurisé via
            Chariow : Mobile Money (MTN, Moov, Orange, Wave…) et cartes Visa / Mastercard.
          </p>
        </div>

        {/* Les 3 plans */}
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {/* Plan Découverte (gratuit) */}
          <Carte className="flex flex-col p-6">
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-champ bg-gris text-violet">
                <Leaf className="size-5" aria-hidden />
              </span>
              <h3 className="text-h3 font-semibold">{PLAN_DECOUVERTE.nom}</h3>
            </div>
            <p className="mt-4 font-titre text-[34px] leading-10 font-bold">
              {PLAN_DECOUVERTE.prix}
              <span className="text-[14px] font-medium text-encre"> / pour toujours</span>
            </p>
            <p className="mt-1 text-[14px] leading-5 text-encre">{PLAN_DECOUVERTE.accroche}</p>
            <ul className="mt-5 grid flex-1 gap-2.5">
              {PLAN_DECOUVERTE.avantages.map((avantage) => (
                <li key={avantage} className="flex items-start gap-2 text-[14px] leading-5">
                  <Check className="mt-0.5 size-4 shrink-0 text-violet" aria-hidden />
                  <span className="text-bleu">{avantage}</span>
                </li>
              ))}
            </ul>
            <Link
              href={connecte ? "/dashboard" : "/connexion?suite=%2Ftarifs"}
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-violet bg-white px-6 text-[16px] leading-5 font-semibold text-bleu transition hover:border-violet-clair hover:bg-gris"
            >
              {connecte ? "Ton espace" : "Commencer gratuitement"}{" "}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Carte>

          {/* Plans payants (Pro et Entreprise) */}
          {Object.values(PLANS).map((plan) => (
            <Carte
              key={plan.cle}
              className={`relative flex flex-col p-6 ${
                plan.recommande ? "border-violet shadow-[0_10px_40px_rgba(106,59,255,0.18)]" : ""
              }`}
            >
              {plan.recommande && (
                <span className="absolute -top-3 left-6 rounded-full bg-violet px-3 py-1 text-[12px] leading-4 font-bold text-white">
                  Le plus populaire
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="grid size-10 place-items-center rounded-champ bg-violet/10 text-violet">
                  <Crown className="size-5" aria-hidden />
                </span>
                <h3 className="text-h3 font-semibold">{plan.nom}</h3>
              </div>
              <p className="mt-4 font-titre text-[34px] leading-10 font-bold">
                {plan.prix}
                <span className="text-[14px] font-medium text-encre"> / mois</span>
              </p>
              <p className="mt-1 text-[14px] leading-5 text-encre">{plan.accroche}</p>
              <ul className="mt-5 grid flex-1 gap-2.5">
                {plan.avantages.map((avantage) => (
                  <li key={avantage} className="flex items-start gap-2 text-[14px] leading-5">
                    <Check className="mt-0.5 size-4 shrink-0 text-violet" aria-hidden />
                    <span className="text-bleu">{avantage}</span>
                  </li>
                ))}
              </ul>
              {connecte ? (
                /* Connecté → parcours de paiement normal (Chariow). */
                <BoutonPayer plan={plan.cle} nomPlan={plan.nom} className="mt-6 w-full" />
              ) : (
                /* PAS connecté → connexion d'abord, retour sur /tarifs
                   après la connexion pour choisir le plan. */
                <Bouton asChild className="mt-6 w-full">
                  <Link href="/connexion?suite=%2Ftarifs">Choisir {plan.nom}</Link>
                </Bouton>
              )}
            </Carte>
          ))}
        </div>

        {/* Lien vers la page tarifs complète */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-center">
          <Link
            href="/tarifs"
            className="inline-flex min-h-11 items-center gap-1.5 text-[15px] leading-5 font-semibold text-violet hover:underline"
          >
            Voir le détail des plans et gérer mon abonnement{" "}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[13px] leading-5 text-encre">
            <ShieldCheck className="size-4 text-violet" aria-hidden />
            Sans engagement : tu arrêtes quand tu veux.
          </span>
        </div>
      </div>
    </section>
  );
}