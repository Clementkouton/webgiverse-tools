// app/tarifs/page.tsx
// Lot 7 — corrections des anomalies repérées sur la page Tarifs :
//   1) Bouton Découverte : « Ton plan actuel » ne s'affiche plus pour un
//      abonné Premium (deux plans ne peuvent pas être « actuels » à la fois).
//   2) Un abonné ne voit plus « Passer au plan … » (poussée vers un plan
//      inférieur) : formulation neutre « Basculer vers … », note honnête
//      sur l'effet immédiat, badge « Le plus populaire » réservé aux prospects.
//   3) Bannière finale adaptée au profil : visiteur → compte gratuit,
//      connecté sans Premium → tester / contact, Premium → gérer l'abonnement.
//      Un client Premium ne doit JAMAIS voir « Crée ton compte gratuit ».
//   4) Dates affichées en UTC : plus de décalage d'un jour selon le serveur.
import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarX,
  Check,
  Crown,
  ExternalLink,
  Leaf,
  LifeBuoy,
  Mail,
  Minus,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/badge";
import { Accordeon, ItemAccordeon } from "@/components/ui/accordeon";
import { BoutonPaiement } from "@/components/tarifs/bouton-paiement";
import { PLANS, PLAN_DECOUVERTE } from "@/lib/plans";
import {
  LIGNES_COMPARATIF,
  type CelluleComparatif,
} from "@/content/comparatif-plans";
import { FAQ_TARIFS } from "@/content/faq-tarifs";

export const metadata: Metadata = {
  title: "Premium — Tarifs — Webgiverse Outils IA",
  description:
    "Plan Découverte gratuit, Pro à $2,99/mois, Entreprise à $7,99/mois : comparez les plans en détail, payez par Mobile Money ou carte bancaire, activation automatique, sans engagement.",
};
export const dynamic = "force-dynamic";

// URLs de paiement Chariow (Netlify → Environment variables, et .env.local
// en local). Si une URL manque, le bouton affiche « Paiement bientôt
// disponible » au lieu de mener vers une page inexistante.
const URL_CHARIOW_PRO = process.env.CHARIOW_URL_PRO?.trim() || null;
const URL_CHARIOW_ENTREPRISE = process.env.CHARIOW_URL_ENTREPRISE?.trim() || null;

// Paiement INTÉGRÉ (fenêtre dans le site, via l'API Chariow) : disponible
// dès que la clé API et les deux identifiants produits sont configurés.
// Sinon on retombe sur l'ancien lien Chariow (ou « bientôt disponible »).
const paiementIntegrePret = Boolean(
  process.env.CHARIOW_API_KEY?.trim() &&
    process.env.CHARIOW_PRODUCT_PRO?.trim() &&
    process.env.CHARIOW_PRODUCT_ENTREPRISE?.trim(),
);

// Dates longues rendues en UTC : quel que soit le serveur qui affiche la
// page, « 24 janvier 2027 » reste « 24 janvier 2027 » (avant, un serveur
// dans un autre fuseau pouvait glisser d'un jour à minuit).
const formatDateLongue = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeZone: "UTC",
});

// Données structurées FAQPage (questions tarifs) : Google peut afficher
// ces réponses directement dans les résultats de recherche. Les questions
// sont différentes de celles de la page /faq → pas de doublon.
const donneesFaqTarifs = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_TARIFS.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.reponse },
  })),
};

/* ── Une cellule du tableau comparatif ────────────────────────────── */
function CelluleComparatifVue({
  valeur,
  miseEnAvant,
}: {
  valeur: CelluleComparatif;
  miseEnAvant?: boolean;
}) {
  return (
    <td className={`px-4 py-3 text-center ${miseEnAvant ? "bg-violet/5" : ""}`}>
      {typeof valeur === "boolean" ? (
        valeur ? (
          <Check className="mx-auto size-4 text-violet" aria-label="Inclus" />
        ) : (
          <Minus className="mx-auto size-4 text-bleu/40" aria-label="Non inclus" />
        )
      ) : (
        <span className="font-medium text-bleu">{valeur}</span>
      )}
    </td>
  );
}

export default async function PageTarifs() {
  const session = await auth();
  const abonnement = session?.user?.id
    ? await prisma.abonnement.findUnique({ where: { utilisateurId: session.user.id } }).catch(() => null)
    : null;

  const abonnementActif =
    abonnement && abonnement.statut === "ACTIF" && abonnement.expireLe > new Date()
      ? abonnement
      : null;

  // Nom lisible du plan actif (Pro / Entreprise) pour les textes de la page.
  const nomPlanActif =
    abonnementActif
      ? PLANS[abonnementActif.plan as "PRO" | "ENTREPRISE"]?.nom ?? "Premium"
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(donneesFaqTarifs) }}
      />

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
          Paie avec la même adresse e-mail que ton compte Webgiverse : ton Premium
          s&apos;active tout seul, en quelques secondes.
        </p>
      </header>

      {abonnementActif && (
        <Carte className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-between gap-3 border-violet/40 bg-violet/5 p-5">
          <p className="flex items-center gap-2 text-[15px] leading-5 font-semibold text-violet">
            <Crown className="size-5" aria-hidden />
            Tu es Premium ({nomPlanActif}) jusqu&apos;au{" "}
            {formatDateLongue.format(abonnementActif.expireLe)}
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
          {/* Lot 7 : un abonné Premium ne voit plus « Ton plan actuel » ici.
              Visiteur → inscription · Gratuit connecté → ton plan ·
              Premium → le plan sur lequel il retombera à l'échéance. */}
          <Bouton asChild variante="secondaire" className="mt-6">
            <Link
              href={
                abonnementActif
                  ? "/dashboard/abonnement"
                  : session
                    ? "/dashboard"
                    : "/inscription"
              }
            >
              {abonnementActif
                ? "Ton plan après l'échéance"
                : session
                  ? "Ton plan actuel"
                  : "Commencer gratuitement"}
            </Link>
          </Bouton>
        </Carte>

        {/* Plans payants */}
        {Object.values(PLANS).map((plan) => {
          const urlChariow = plan.cle === "PRO" ? URL_CHARIOW_PRO : URL_CHARIOW_ENTREPRISE;
          // On pré-remplit l'e-mail du compte connecté dans le checkout Chariow
          // (?email=…) : le webhook reconnaît ainsi le client à coup sûr, même
          // si le client ne tape rien dans le formulaire de paiement.
          const urlCheckout =
            urlChariow && session?.user?.email
              ? `${urlChariow}${urlChariow.includes("?") ? "&" : "?"}email=${encodeURIComponent(session.user.email)}`
              : urlChariow;
          // Bascule = un abonné actif regarde l'AUTRE plan payant
          // (ex. un abonné Entreprise qui regarde Pro). On ne le pousse plus
          // avec « Passer au plan Pro » : formulation neutre + note honnête.
          const bascule = Boolean(abonnementActif && abonnementActif.plan !== plan.cle);
          return (
            <Carte
              key={plan.cle}
              className={`relative flex flex-col p-6 ${
                plan.recommande ? "border-violet shadow-[0_10px_40px_rgba(106,59,255,0.18)]" : ""
              }`}
            >
              {/* Lot 7 : le badge marketing ne s'affiche que pour les prospects —
                  un client déjà Premium n'a plus besoin d'être « converti ». */}
              {plan.recommande && !abonnementActif && (
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
              {/* ── 4 cas possibles pour le bouton ── */}
              {abonnementActif?.plan === plan.cle ? (
                /* 1) Déjà abonné à CE plan → gérer l'abonnement */
                <Bouton asChild variante="secondaire" className="mt-6">
                  <Link href="/dashboard/abonnement">Ton plan actuel — gérer</Link>
                </Bouton>
              ) : !session ? (
                /* 2) Visiteur NON connecté → page de connexion d'abord,
                      puis retour automatique sur /tarifs (?suite=%2Ftarifs) */
                <Bouton asChild className="mt-6">
                  <Link href="/connexion?suite=%2Ftarifs">Choisir {plan.nom}</Link>
                </Bouton>
              ) : paiementIntegrePret ? (
                /* 3) Connecté + paiement intégré prêt → fenêtre Chariow dans le site */
                <BoutonPaiement
                  clePlan={plan.cle}
                  libelle={bascule ? `Basculer vers ${plan.nom}` : `Choisir ${plan.nom}`}
                  className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-violet px-6 text-[15px] leading-5 font-semibold text-white transition hover:bg-violet-clair"
                />
              ) : urlCheckout ? (
                /* 4a) Connecté, intégré pas prêt → ancien lien Chariow (secours) */
                <Bouton asChild className="mt-6">
                  <a href={urlCheckout} target="_blank" rel="noopener noreferrer">
                    {bascule ? `Basculer vers ${plan.nom}` : `Choisir ${plan.nom}`}
                    <ExternalLink className="ml-1.5 inline size-4" aria-hidden />
                  </a>
                </Bouton>
              ) : (
                /* 4b) Aucun paiement disponible → message d'attente */
                <span className="mt-6 block rounded-full border border-bordure bg-gris px-6 py-2.5 text-center text-[14px] leading-5 font-semibold text-encre">
                  Paiement bientôt disponible
                </span>
              )}
              {bascule && (
                <p className="mt-2 text-center text-[12px] leading-4 text-encre">
                  La bascule est immédiate — tes jours déjà payés sont conservés.
                </p>
              )}
            </Carte>
          );
        })}
      </div>

      {/* ── Tableau comparatif des 3 plans ───────────────────────── */}
      <section className="mt-14" aria-labelledby="titre-comparatif">
        <h2 id="titre-comparatif" className="text-h3 font-titre font-semibold text-center">
          Compare les plans <span className="texte-degrade">en détail</span>
        </h2>
        <p className="mesure mx-auto mt-2 text-center text-encre">
          Tout ce que chaque plan contient, ligne par ligne. Aucun frais caché : ce tableau
          reprend exactement les limites appliquées dans l&apos;application.
        </p>

        <div className="mt-6 overflow-x-auto rounded-carte border border-bordure bg-white shadow-carte">
          <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
            <caption className="sr-only">
              Comparaison des plans Découverte, Pro et Entreprise
            </caption>
            <thead>
              <tr className="border-b border-bordure bg-gris/60">
                <th scope="col" className="px-4 py-3 font-titre font-semibold">
                  Ce que tu obtiens
                </th>
                <th scope="col" className="px-4 py-3 text-center font-titre font-semibold">
                  Découverte
                </th>
                <th scope="col" className="bg-violet/5 px-4 py-3 text-center font-titre font-semibold text-violet">
                  Pro
                </th>
                <th scope="col" className="px-4 py-3 text-center font-titre font-semibold">
                  Entreprise
                </th>
              </tr>
            </thead>
            <tbody>
              {LIGNES_COMPARATIF.map((ligne) => (
                <tr key={ligne.label} className="border-b border-bordure/60 last:border-0">
                  <th scope="row" className="px-4 py-3 font-normal text-bleu">
                    {ligne.label}
                  </th>
                  <CelluleComparatifVue valeur={ligne.decouverte} />
                  <CelluleComparatifVue valeur={ligne.pro} miseEnAvant />
                  <CelluleComparatifVue valeur={ligne.entreprise} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 3 cartes de réassurance ──────────────────────────────── */}
      <section className="mt-14" aria-labelledby="titre-reassurance">
        <h2 id="titre-reassurance" className="text-h3 font-titre font-semibold text-center">
          Souscris <span className="texte-degrade">l&apos;esprit tranquille</span>
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Carte className="p-5">
            <span className="grid size-10 place-items-center rounded-champ bg-violet/10 text-violet">
              <CalendarX className="size-5" aria-hidden />
            </span>
            <h3 className="mt-3 font-titre text-[16px] leading-6 font-semibold">Sans engagement</h3>
            <p className="mt-1.5 text-[14px] leading-5 text-encre">
              Prépayé 30 jours, aucune reconduction automatique. À l&apos;échéance, tu repasses
              sur le plan gratuit — tes favoris sont conservés.
            </p>
          </Carte>
          <Carte className="p-5">
            <span className="grid size-10 place-items-center rounded-champ bg-violet/10 text-violet">
              <Zap className="size-5" aria-hidden />
            </span>
            <h3 className="mt-3 font-titre text-[16px] leading-6 font-semibold">Activation automatique</h3>
            <p className="mt-1.5 text-[14px] leading-5 text-encre">
              Paie avec l&apos;adresse e-mail de ton compte Webgiverse et ton Premium s&apos;active
              en quelques secondes, tout seul. Pas de code à saisir, pas d&apos;attente.
            </p>
          </Carte>
          <Carte className="p-5">
            <span className="grid size-10 place-items-center rounded-champ bg-violet/10 text-violet">
              <LifeBuoy className="size-5" aria-hidden />
            </span>
            <h3 className="mt-3 font-titre text-[16px] leading-6 font-semibold">Un humain derrière</h3>
            <p className="mt-1.5 text-[14px] leading-5 text-encre">
              Une question, un souci de paiement, un changement de plan ? Écris-nous :
              l&apos;équipe répond sous 48 h ouvrées, en français.
            </p>
          </Carte>
        </div>
      </section>

      {/* ── FAQ tarifs (avec extraits enrichis Google) ───────────── */}
      <section className="mx-auto mt-14 max-w-3xl" aria-labelledby="titre-faq-tarifs">
        <h2 id="titre-faq-tarifs" className="text-h3 font-titre font-semibold text-center">
          Questions sur <span className="texte-degrade">les tarifs</span>
        </h2>
        <p className="mesure mx-auto mt-2 text-center text-encre">
          Les réponses courtes. Une autre question ?{" "}
          <Link href="/contact" className="font-semibold text-violet hover:underline">
            Écris-nous
          </Link>
          .
        </p>
        <Accordeon type="single" collapsible className="mt-6 grid gap-3">
          {FAQ_TARIFS.map((f) => (
            <ItemAccordeon key={f.question} question={f.question} reponse={f.reponse} />
          ))}
        </Accordeon>
      </section>

      {/* ── Sécurité du paiement (déjà présent, conservé) ────────── */}
      <div className="mx-auto mt-12 max-w-2xl">
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

      {/* ── Bannière finale : adaptée au profil du visiteur ──────── */}
      {/* Lot 7 : un client Premium ne doit JAMAIS voir « Crée ton compte ».
          Trois versions : visiteur → compte gratuit, connecté sans Premium →
          tester l'assistant / écrire à l'équipe, Premium → gérer l'abonnement. */}
      <section className="mt-12 rounded-carte bg-bleu px-6 py-10 text-center text-white">
        {abonnementActif ? (
          <>
            <h2 className="text-h3 font-titre font-semibold">
              Ton Premium est actif — merci pour ta confiance.
            </h2>
            <p className="mesure mx-auto mt-2 text-white/85">
              Ton abonnement {nomPlanActif} est actif jusqu&apos;au{" "}
              {formatDateLongue.format(abonnementActif.expireLe)} : favoris illimités, assistant
              sans quota et tous tes avantages sont déjà débloqués. Tu gères tout, quand tu veux.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Bouton asChild>
                <Link href="/dashboard/abonnement">Gérer mon abonnement</Link>
              </Bouton>
              <Link
                href="/assistant"
                className="text-[15px] leading-5 font-semibold text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-white"
              >
                Essayer l&apos;assistant →
              </Link>
            </div>
          </>
        ) : session ? (
          <>
            <h2 className="text-h3 font-titre font-semibold">
              Des questions avant de passer Premium ?
            </h2>
            <p className="mesure mx-auto mt-2 text-white/85">
              Ton compte est prêt : teste l&apos;assistant, enregistre tes premiers favoris, et
              passe Premium le jour où tu en auras vraiment besoin — prépayé 30 jours, sans
              engagement, tu arrêtes quand tu veux.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Bouton asChild>
                <Link href="/assistant">Essayer l&apos;assistant</Link>
              </Bouton>
              <Link
                href="/contact"
                className="text-[15px] leading-5 font-semibold text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-white"
              >
                Écris-nous →
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-h3 font-titre font-semibold">
              Pas prêt à payer ? Commence gratuit.
            </h2>
            <p className="mesure mx-auto mt-2 text-white/85">
              Crée ton compte, teste l&apos;assistant et enregistre tes premiers favoris. Le plan
              Découverte est déjà très complet — tu passeras Premium le jour où tu en auras
              vraiment besoin.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Bouton asChild>
                <Link href="/inscription">Créer mon compte gratuit</Link>
              </Bouton>
              <Link
                href="/assistant"
                className="text-[15px] leading-5 font-semibold text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-white"
              >
                Essayer l&apos;assistant →
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}