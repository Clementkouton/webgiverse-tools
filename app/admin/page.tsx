// app/admin/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 21 — TABLEAU DE BORD ADMIN « Spark » : l'ESSENTIEL uniquement.
//   • en-tête + période du mois en cours ;
//   • bandeau vert d'activité (style Spark, décoration étoile) ;
//   • 4 cartes statistiques avec tendance ± % vs le mois dernier et
//     mini-courbe des 7 derniers jours ;
//   • graphique en barres des inscriptions (14 jours) + anneau
//     « Membres par plan ».
// Aucun tableau ici : chaque contenu a sa page dans le menu
// (Outils, Tutoriels, Prompts, Articles, Propositions, Avis,
// Utilisateurs, Abonnements). Aucune librairie ajoutée.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Crown, MessageSquareQuote, Sparkles, Users, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { CarteStatAdmin } from "@/components/admin/carte-stat-admin";
import { GraphiqueBarres } from "@/components/admin/graphique-barres";
import { GraphiqueRepartition } from "@/components/dashboard/graphique-repartition";

export const metadata: Metadata = { title: "Administration" };
export const dynamic = "force-dynamic";

/** % de variation entre la période courante et la précédente. */
function tendance(cur: number, prec: number): number {
  if (prec > 0) return Math.round(((cur - prec) / prec) * 100);
  return cur > 0 ? 100 : 0;
}

/** Répartit des dates en compteurs journaliers sur `nb` jours. */
function parJour(dates: Date[], debut: Date, nb: number): number[] {
  return Array.from({ length: nb }, (_, i) => {
    const d = new Date(debut);
    d.setDate(debut.getDate() + i);
    const fin = new Date(d);
    fin.setDate(d.getDate() + 1);
    return dates.filter((x) => x >= d && x < fin).length;
  });
}

export default async function PageAdmin() {
  // ── Bornes de temps ─────────────────────────────────────────────
  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const debutMoisPrec = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1);
  const debut7j = new Date();
  debut7j.setHours(0, 0, 0, 0);
  debut7j.setDate(debut7j.getDate() - 6);
  const debut14j = new Date(debut7j);
  debut14j.setDate(debut7j.getDate() - 7);

  // ── Compteurs ───────────────────────────────────────────────────
  const [
    nbUtilisateurs, inscritsMois, inscritsMoisPrec, inscrits14j,
    nbOutilsPublies, nbOutilsTotal, outilsMois, outilsMoisPrec, outils14j,
    nbAvis, avisMois, avisMoisPrec, avis14j,
    abonnementsActifs, premium14j, revenusMois, revenusMoisPrec, paiements14j,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: debutMois } } }),
    prisma.user.count({ where: { createdAt: { gte: debutMoisPrec, lt: debutMois } } }),
    prisma.user.findMany({ where: { createdAt: { gte: debut14j } }, select: { createdAt: true } }),
    prisma.tool.count({ where: { statut: "PUBLIE" } }),
    prisma.tool.count(),
    prisma.tool.count({ where: { createdAt: { gte: debutMois } } }),
    prisma.tool.count({ where: { createdAt: { gte: debutMoisPrec, lt: debutMois } } }),
    prisma.tool.findMany({ where: { createdAt: { gte: debut14j } }, select: { createdAt: true } }),
    prisma.avis.count(),
    prisma.avis.count({ where: { creeLe: { gte: debutMois } } }),
    prisma.avis.count({ where: { creeLe: { gte: debutMoisPrec, lt: debutMois } } }),
    prisma.avis.findMany({ where: { creeLe: { gte: debut14j } }, select: { creeLe: true } }),
    prisma.abonnement.findMany({
      where: { statut: "ACTIF", expireLe: { gt: maintenant } },
      select: { plan: true, debutLe: true },
    }),
    prisma.abonnement.findMany({ where: { debutLe: { gte: debut7j } }, select: { debutLe: true } }),
    prisma.paiement.aggregate({
      where: { statut: "PAYE", creeLe: { gte: debutMois } },
      _sum: { montant: true },
    }),
    prisma.paiement.aggregate({
      where: { statut: "PAYE", creeLe: { gte: debutMoisPrec, lt: debutMois } },
      _sum: { montant: true },
    }),
    prisma.paiement.findMany({
      where: { statut: "PAYE", creeLe: { gte: debut7j } },
      select: { montant: true, creeLe: true },
    }),
  ]);

  // Lot 20 — votes « Utile » (lecture défensive, jamais bloquante).
  const delegueVotesAvis = (prisma as any).voteAvis;
  const nbVotesUtile: number = delegueVotesAvis?.count
    ? await delegueVotesAvis.count().catch(() => 0)
    : 0;

  // ── Séries journalières (7 derniers jours) + barres (14 jours) ──
  const joursInscrits = parJour(inscrits14j.map((u) => u.createdAt), debut7j, 7);
  const joursOutils = parJour(outils14j.map((o) => o.createdAt), debut7j, 7);
  const joursAvis = parJour(avis14j.map((a) => a.creeLe), debut7j, 7);
  const joursPremium = parJour(premium14j.map((a) => a.debutLe), debut7j, 7);
  const joursRevenus = parJour(paiements14j.map((p) => p.creeLe), debut7j, 7);

  const valeursBarres = parJour(inscrits14j.map((u) => u.createdAt), debut14j, 14);
  const labelsBarres = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(debut14j);
    d.setDate(debut14j.getDate() + i);
    return String(d.getDate());
  });

  // ── Plans Premium ───────────────────────────────────────────────
  const nbPremium = abonnementsActifs.length;
  const nbPro = abonnementsActifs.filter((a) => a.plan === "PRO").length;
  const nbEntreprise = abonnementsActifs.filter((a) => a.plan === "ENTREPRISE").length;
  const nbDecouverte = Math.max(nbUtilisateurs - nbPremium, 0);

  // ── Tendances vs le mois dernier ────────────────────────────────
  const revenusCur = revenusMois._sum.montant ?? 0;
  const revenusPrec = revenusMoisPrec._sum.montant ?? 0;

  const formateurJour = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  const periode = `${formateurJour.format(debutMois)} – ${formateurJour.format(maintenant)} ${maintenant.getFullYear()}`;
  const dateLongue = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(maintenant);

  return (
    <div>
      {/* ── En-tête + période ───────────────────────────────────────── */}
      <div className="animate-apparition-haut flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h3 font-semibold">Tableau de bord</h1>
          <p className="mt-1 text-[14px] leading-6 text-encre">
            Une vue simple de l'activité de Webgiverse — le détail de chaque contenu vit dans le menu.
          </p>
        </div>
        <Badge variante="defaut" className="capitalize">{periode}</Badge>
      </div>

      {/* ── Bandeau vert d'activité (style Spark) ───────────────────── */}
      <div className="animate-apparition-haut delai-1 relative mt-5 overflow-hidden rounded-carte bg-foret p-6 text-white sm:p-7">
        <Sparkles
          aria-hidden
          className="pointer-events-none absolute -right-4 -bottom-6 size-32 text-lime/25"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-lime px-2.5 py-0.5 text-[11px] leading-4 font-bold uppercase tracking-wide text-sapin">
                Activité
              </span>
              <span className="text-[12px] leading-4 font-medium text-white/70 capitalize">{dateLonge ?? dateLongue}</span>
            </p>
            <p className="mt-2.5 font-titre text-[19px] leading-7 font-semibold">
              {inscritsMois > 0
                ? `+${inscritsMois} nouveau${inscritsMois > 1 ? "x" : ""} membre${inscritsMois > 1 ? "s" : ""} ce mois-ci (${tendance(inscritsMois, inscritsMoisPrec) >= 0 ? "+" : ""}${tendance(inscritsMois, inscritsMoisPrec)} % vs le mois dernier)`
                : "L'activité de la communauté, en un coup d'œil."}
            </p>
          </div>
          <Link
            href="/admin/utilisateurs"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-lime px-4 py-2 text-[13px] font-bold text-sapin transition hover:bg-lime/85 active:scale-[0.98]"
          >
            Voir les utilisateurs <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      {/* ── 4 cartes statistiques avec tendance + sparkline ─────────── */}
      <section aria-label="Statistiques essentielles" className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CarteStatAdmin
          href="/admin/utilisateurs"
          libelle="Utilisateurs"
          valeur={nbUtilisateurs}
          icone={Users}
          tendance={tendance(inscritsMois, inscritsMoisPrec)}
          contexte={`${inscritsMois} inscription${inscritsMois > 1 ? "s" : ""} ce mois`}
          donnees={joursInscrits}
          delay={0}
        />
        <CarteStatAdmin
          href="/admin/outils"
          libelle="Outils publiés"
          valeur={nbOutilsPublies}
          icone={Wrench}
          tendance={tendance(outilsMois, outilsMoisPrec)}
          contexte={`${nbOutilsTotal} fiches au total`}
          donnees={joursOutils}
          delay={70}
        />
        <CarteStatAdmin
          href="/admin/avis"
          libelle="Avis publiés"
          valeur={nbAvis}
          icone={MessageSquareQuote}
          tendance={tendance(avisMois, avisMoisPrec)}
          contexte={`${nbVotesUtile} vote${nbVotesUtile > 1 ? "s" : ""} « Utile »`}
          donnees={joursAvis}
          delay={140}
        />
        <CarteStatAdmin
          href="/admin/abonnements"
          libelle="Abonnés Premium"
          valeur={nbPremium}
          icone={Crown}
          tendance={tendance(revenusCur, revenusPrec)}
          contexte="tendance des revenus du mois"
          donnees={joursRevenus.length > 0 ? joursRevenus : joursPremium}
          delay={210}
        />
      </section>

      {/* ── Graphiques : inscriptions 14 jours + membres par plan ──── */}
      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        <Carte className="animate-apparition-haut p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">
              Nouvelles inscriptions
            </h2>
            <Badge variante="defaut">14 derniers jours</Badge>
          </div>
          <p className="mt-1 text-[13px] leading-4 text-encre">
            {valeursBarres.reduce((s, v) => s + v, 0) > 0
              ? "Inscriptions par jour, sur les deux dernières semaines."
              : "Aucune inscription sur la période : partage ton lien d'invitation !"}
          </p>
          <div className="mt-4">
            <GraphiqueBarres valeurs={valeursBarres} labels={labelsBarres} />
          </div>
        </Carte>

        <Carte className="animate-apparition-haut delai-1 p-6">
          <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">
            Membres par plan
          </h2>
          <div className="mt-4">
            <GraphiqueRepartition
              segments={[
                { libelle: "Découverte", valeur: nbDecouverte, couleur: "#97a3b8" },
                { libelle: "Premium Pro", valeur: nbPro, couleur: "#17854f" },
                { libelle: "Entreprise", valeur: nbEntreprise, couleur: "#0f2e21" },
              ]}
              total={nbUtilisateurs}
              totalLibelle="membres"
            />
          </div>
        </Carte>
      </section>
    </div>
  );
}