// app/tarifs/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import {
  Check,
  Crown,
  Leaf,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/badge";
import { PLANS, PLAN_DECOUVERTE } from "@/lib/plans";

export const metadata: Metadata = { title: "Premium — Tarifs — Webgiverse Outils IA" };
export const dynamic = "force-dynamic";

export default async function PageTarifs() {
  const session = await auth();
  const connecte = Boolean(session?.user?.id);
  const abonnement = connecte
    ? await prisma.abonnement
        .findUnique({ where: { utilisateurId: session!.user!.id } })
        .catch(() => null)
    : null;

  const abonnementActif =
    abonnement && abonnement.statut === "ACTIF" && abonnement.expireLe > new Date()
      ? abonnement
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
      <header className="mx-auto max-w-2xl text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
          <Sparkles className="size-4" aria-hidden /> Webgiverse Premium
        </p>
        <h1 className="mt-4 text-h2 font-titre font-semibold">Tire le meilleur de l&apos;annuaire</h1>
        <p className="mt-3 text-[15px] leading-6 text-encre">
          Passe Premium pour débloquer tes favoris, soutenir le projet et profiter d&apos;avantages
          exclusifs. Paiement sécurisé via Chariow : Mobile Money (MTN, Moov, Orange, Wave…) et
          cartes Visa / Mastercard — tu peux payer depuis n&apos;importe quel pays.
        </p>
        <p className="mt-3 flex items-center justify-center gap-2 text-[13px] leading-5 font-medium text-violet">
          <Mail className="size-4 shrink-0" aria-hidden />
          Ton e-mail et ton nom sont déjà remplis sur la page de paiement : tu reviens ici
          automatiquement après.
        </p>
      </header>

      {abonnementActif && (
        <Carte className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-between gap-3 border-violet/40 bg-violet/5 p-5">
          <p className="flex items-center gap-2 text-[15px] leading-5 font-semibold text-violet">
            <Crown className="size-5" aria-hidden />
            Tu es Premium ({PLANS[abonnementActif.plan as "PRO" | "ENTREPRISE"]?.nom ?? "Pro"})
            jusqu&apos;au{" "}
            {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(abonnementActif.expireLe)}
          </p>
          <Bouton asChild variante="secondaire" taille="sm">
            <Link href="/dashboard/abonnement">Gérer mon abonnement</Link>
          </Bouton>
        </Carte>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {/* Plan Découverte (gratuit) */}
        <Carte className="flex flex-col p-6">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-champ bg-gris text-violet">
              <Leaf className="size-5" aria-hidden />
            </span>
            <h2 className="text-h3 font-semibold">{PLAN_DECOUVERTE.nom}</h2>
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
          <Bouton asChild variante="secondaire" className="mt-6">
            <Link href={connecte ? "/dashboard" : "/connexion?suite=%2Ftarifs"}>
              {connecte ? "Ton plan actuel" : "Commencer gratuitement"}
            </Link>
          </Bouton>
        </Carte>

        {/* Plans payants */}
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
              <h2 className="text-h3 font-semibold">{plan.nom}</h2>
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
            {abonnementActif?.plan === plan.cle ? (
              /* Déjà abonné à CE plan → gestion de l'abonnement. */
              <Bouton asChild variante="secondaire" className="mt-6">
                <Link href="/dashboard/abonnement">Ton plan actuel — gérer</Link>
              </Bouton>
            ) : !connecte ? (
              /* PAS connecté → connexion OBLIGATOIRE avant de choisir,
                 puis retour automatique sur /tarifs après la connexion. */
              <Bouton asChild className="mt-6 w-full">
                <Link href="/connexion?suite=%2Ftarifs">Choisir {plan.nom}</Link>
              </Bouton>
            ) : (
              /* Connecté → parcours de paiement normal (Chariow). */
              <Bouton asChild className="mt-6 w-full">
                <Link href={`/dashboard/abonnement?plan=${encodeURIComponent(plan.cle)}`}>
                  {abonnementActif ? `Passer au plan ${plan.nom}` : `Choisir ${plan.nom}`}
                </Link>
              </Bouton>
            )}
          </Carte>
        ))}
      </div>

      <div className="mx-auto mt-10 max-w-2xl">
        <Carte className="flex flex-wrap items-center justify-center gap-3 p-5 text-center">
          <Badge variante="source" className="gap-1.5">
            <ShieldCheck className="size-4" aria-hidden /> Paiement sécurisé
          </Badge>
          <p className="text-[13px] leading-5 text-encre">
            Transactions traitées par <strong>Chariow</strong>. Webgiverse ne voit jamais tes
            codes ou numéros de carte. Abonnement prépayé 30 jours, sans engagement : tu arrêtes
            quand tu veux.
          </p>
        </Carte>
      </div>
    </div>
  );
}