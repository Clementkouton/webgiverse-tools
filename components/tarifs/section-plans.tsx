// components/tarifs/section-plans.tsx
// ─────────────────────────────────────────────────────────────────
// Section « Webgiverse Premium » affichée sur la page d'accueil.
// Composant serveur : il lit lib/plans.ts et les URLs de checkout
// Chariow (variables d'environnement) — aucune requête à la base de
// données, donc il ne peut JAMAIS faire planter la landing page.
// ─────────────────────────────────────────────────────────────────
import Link from "next/link";
import { ArrowRight, Check, Crown, Leaf, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { Carte } from "@/components/ui/carte";
import { BoutonPaiement } from "@/components/tarifs/bouton-paiement";
import { PLANS, PLAN_DECOUVERTE } from "@/lib/plans";

export async function SectionPlans() {
  const session = await auth().catch(() => null);
  // Paiement INTÉGRÉ (fenêtre dans le site, via l'API Chariow) : si la clé
  // API ou les produits manquent, on garde l'ancien lien de secours.
  const paiementIntegrePret = Boolean(
    process.env.CHARIOW_API_KEY?.trim() &&
      process.env.CHARIOW_PRODUCT_PRO?.trim() &&
      process.env.CHARIOW_PRODUCT_ENTREPRISE?.trim(),
  );
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
              href="/outils"
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-violet bg-white px-6 text-[16px] leading-5 font-semibold text-bleu transition hover:border-violet-clair hover:bg-gris"
            >
              Explorer l&apos;annuaire <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Carte>

          {/* Plans payants (Pro et Entreprise) */}
          {Object.values(PLANS).map((plan) => {
            // URL de checkout Chariow (Netlify → Environment variables).
            // Si la variable manque, le bouton ramène à la page /tarifs.
            // On pré-remplit l'e-mail du compte connecté (?email=…) : le
            // webhook reconnaît ainsi le client à coup sûr.
            const urlBase =
              plan.cle === "PRO"
                ? process.env.CHARIOW_URL_PRO?.trim() || null
                : process.env.CHARIOW_URL_ENTREPRISE?.trim() || null;
            const urlChariow =
              urlBase && session?.user?.email
                ? `${urlBase}${urlBase.includes("?") ? "&" : "?"}email=${encodeURIComponent(session.user.email)}`
                : urlBase;
            return (
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
                {paiementIntegrePret ? (
                  <BoutonPaiement
                    clePlan={plan.cle}
                    libelle={`Choisir ${plan.nom}`}
                    className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] px-6 text-[16px] leading-5 font-semibold text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)] transition hover:brightness-110"
                  />
                ) : (
                  <a
                    href={urlChariow ?? "/tarifs"}
                    target={urlChariow ? "_blank" : undefined}
                    rel={urlChariow ? "noopener noreferrer" : undefined}
                    className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] px-6 text-[16px] leading-5 font-semibold text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)] transition hover:brightness-110"
                  >
                    Choisir {plan.nom} <ArrowRight className="size-4" aria-hidden />
                  </a>
                )}
              </Carte>
            );
          })}
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