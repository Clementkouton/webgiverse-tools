// app/admin/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 22 — TABLEAU DE BORD ADMIN « TailwindAdmin » : l'ESSENTIEL.
//   • en-tête + période du mois en cours ;
//   • bannière dégradé indigo → bleu ciel (style du template) ;
//   • 4 cartes statistiques avec pastilles pastel, tendance ± % vs
//     le mois dernier et mini-courbe des 7 derniers jours ;
//   • graphique en barres des inscriptions (14 jours) + anneau
//     « Membres par plan ».
// Lot 26 — PILOTAGE & DONNÉES :
//   • rangée « Pilotage du jour » : KPI temps réel (inscrits
//     aujourd'hui, avis à modérer, Premium actifs, revenus du mois) ;
//   • alertes visuelles : liens morts détectés (avec vérification en
//     1 clic) et brouillons d'articles oubliés (30 jours) ;
//   • raccourcis vers les nouvelles pages Recherches et Segments.
// Aucun tableau ici : chaque contenu a sa page dans le menu
// (Outils, Tutoriels, Prompts, Articles, Propositions, Avis,
// Utilisateurs, Abonnements). Aucune librairie ajoutée.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Captions as CaptionIcon,
  Crown,
  FileWarning,
  Link2Off,
  MessageSquareQuote,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { CarteStatAdmin } from "@/components/admin/carte-stat-admin";
import { GraphiqueBarres } from "@/components/admin/graphique-barres";
import { GraphiqueRepartition } from "@/components/dashboard/graphique-repartition";
import { BoutonVerifierLiens } from "@/components/admin/bouton-verifier-liens";
import { BoutonRecupererDescriptions } from "@/components/admin/bouton-recuperer-descriptions";

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

/** Libellé humain d'un code de vérification de lien. */
function libelleCodeLien(code: number | null): string {
  if (code === null) return "Jamais vérifié";
  if (code === 0) return "Injoignable";
  return `HTTP ${code}`;
}

export default async function PageAdmin() {
  // ── Bornes de temps ─────────────────────────────────────────────
  const maintenant = new Date();
  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const debutMoisPrec = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1);
  const debut7j = new Date();
  debut7j.setHours(0, 0, 0, 0);
  debut7j.setDate(debut7j.getDate() - 6);
  const debut14j = new Date(debut7j);
  debut14j.setDate(debut7j.getDate() - 7);
  const ilYa24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const ilYa30j = new Date(maintenant);
  ilYa30j.setDate(ilYa30j.getDate() - 30);

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

  // ── Lot 26 — pilotage du jour + alertes ─────────────────────────
  const whereLienMort = {
    statut: "PUBLIE" as const,
    OR: [{ statutLien: { gte: 400 } }, { statutLien: 0 }],
  };
  const [
    inscritsAujourdhui, avis24h, messagesNonTraites, nbLiensMorts,
    liensMorts, nbJamaisVerifies, nbBrouillonsAnciens, brouillonsAnciens,
  ] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: debutJour } } }),
    prisma.avis.count({ where: { creeLe: { gte: ilYa24h } } }),
    prisma.messageContact.count({ where: { traite: false } }),
    prisma.tool.count({ where: whereLienMort }),
    prisma.tool.findMany({
      where: whereLienMort,
      orderBy: [{ lienVerifieLe: { sort: "desc", nulls: "last" } }],
      select: { id: true, nom: true, statutLien: true, lienVerifieLe: true },
      take: 5,
    }),
    prisma.tool.count({ where: { statut: "PUBLIE", statutLien: null } }),
    prisma.article.count({ where: { statut: "BROUILLON", majLe: { lt: ilYa30j } } }),
    prisma.article.findMany({
      where: { statut: "BROUILLON", majLe: { lt: ilYa30j } },
      orderBy: { majLe: "asc" },
      select: { id: true, titre: true, majLe: true },
      take: 5,
    }),
  ]);

  // Lot 28 — tutoriels attendant leur description YouTube raffinée
  // (lecture défensive : colonne absente → 0, la page reste affichable).
  const [nbTutosSansDescription, tutosSansDescription] = await Promise.all([
    prisma.tuto
      .count({ where: { youtubeId: { not: null }, descriptionRaffinee: { equals: Prisma.AnyNull } } })
      .catch(() => 0),
    prisma.tuto
      .findMany({
        where: { youtubeId: { not: null }, descriptionRaffinee: { equals: Prisma.AnyNull } },
        orderBy: { ordre: "asc" },
        select: { id: true, titre: true },
        take: 5,
      })
      .catch(() => []),
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
  const revenusFormates = `${(revenusCur / 100).toFixed(2)} $`;

  const formateurJour = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  const periode = `${formateurJour.format(debutMois)} – ${formateurJour.format(maintenant)} ${maintenant.getFullYear()}`;
  const dateLongue = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(maintenant);
  const formateurDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

  /** Âge en jours d'une date (pour les brouillons oubliés). */
  const ageJours = (date: Date) =>
    Math.max(0, Math.floor((maintenant.getTime() - new Date(date).getTime()) / 86_400_000));

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

      {/* ── Bannière d'activité (dégradé TailwindAdmin) ─────────────── */}
      <div className="animate-apparition-haut delai-1 relative mt-5 overflow-hidden rounded-carte bg-[linear-gradient(115deg,#5d87ff_0%,#49beff_100%)] p-6 text-white sm:p-7">
        <span aria-hidden className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-white/15 blur-2xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-24 right-40 size-44 rounded-full bg-white/10 blur-2xl" />
        <Sparkles
          aria-hidden
          className="pointer-events-none absolute -right-4 -bottom-6 size-32 text-white/20"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] leading-4 font-bold uppercase tracking-wide text-white">
                Activité
              </span>
              <span className="text-[12px] leading-4 font-medium text-white/85 capitalize">{dateLongue}</span>
            </p>
            <p className="mt-2.5 font-titre text-[19px] leading-7 font-semibold">
              {inscritsMois > 0
                ? `+${inscritsMois} nouveau${inscritsMois > 1 ? "x" : ""} membre${inscritsMois > 1 ? "s" : ""} ce mois-ci (${tendance(inscritsMois, inscritsMoisPrec) >= 0 ? "+" : ""}${tendance(inscritsMois, inscritsMoisPrec)} % vs le mois dernier)`
                : "L'activité de la communauté, en un coup d'œil."}
            </p>
          </div>
          <Link
            href="/admin/utilisateurs"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-bold text-primaire-texte shadow-[0_4px_14px_rgba(32,41,54,0.18)] transition hover:bg-white/90 active:scale-[0.98]"
          >
            Voir les utilisateurs <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      {/* ── Lot 26 — Pilotage du jour (KPI temps réel) ──────────────── */}
      <section aria-label="Pilotage du jour" className="animate-apparition-haut delai-1 mt-5">
        <h2 className="mb-2.5 px-1 text-[11px] leading-4 font-bold uppercase tracking-[0.14em] text-adm-gris-clair">
          Pilotage du jour
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CarteStatAdmin
            href="/admin/utilisateurs"
            libelle="Inscrits aujourd'hui"
            valeur={inscritsAujourdhui}
            icone={Users}
            ton="primaire"
            contexte={`${inscritsMois} inscription${inscritsMois > 1 ? "s" : ""} ce mois-ci`}
          />
          <CarteStatAdmin
            href="/admin/moderation"
            libelle="À modérer"
            valeur={avis24h + messagesNonTraites}
            icone={MessageSquareQuote}
            ton="alerte"
            contexte={`${avis24h} avis (24 h) · ${messagesNonTraites} message${messagesNonTraites > 1 ? "s" : ""} de contact`}
          />
          <CarteStatAdmin
            href="/admin/abonnements"
            libelle="Premium actifs"
            valeur={nbPremium}
            icone={Crown}
            ton="info"
            contexte={`${nbPro} Pro · ${nbEntreprise} Entreprise`}
          />
          <CarteStatAdmin
            href="/admin/abonnements"
            libelle="Revenus du mois"
            valeur={revenusFormates}
            icone={Wrench}
            ton="succes"
            contexte={`tendance ${tendance(revenusCur, revenusPrec) >= 0 ? "+" : ""}${tendance(revenusCur, revenusPrec)} % vs le mois dernier`}
          />
        </div>
      </section>

      {/* ── 4 cartes statistiques avec tendance + sparkline ─────────── */}
      <section aria-label="Statistiques essentielles" className="animate-apparition-haut delai-2 mt-6">
        <h2 className="mb-2.5 px-1 text-[11px] leading-4 font-bold uppercase tracking-[0.14em] text-adm-gris-clair">
          Ce mois-ci
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CarteStatAdmin
            href="/admin/utilisateurs"
            libelle="Utilisateurs"
            valeur={nbUtilisateurs}
            icone={Users}
            ton="primaire"
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
            ton="succes"
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
            ton="alerte"
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
            ton="info"
            tendance={tendance(revenusCur, revenusPrec)}
            contexte="tendance des revenus du mois"
            donnees={joursRevenus.length > 0 ? joursRevenus : joursPremium}
            delay={210}
          />
        </div>
      </section>

      {/* ── Lot 26 — Alertes visuelles ──────────────────────────────── */}
      <section aria-label="Alertes" className="animate-apparition-haut delai-2 mt-6 grid gap-4 lg:grid-cols-2">
        {/* Liens morts détectés */}
        <Carte className={`p-6 ${nbLiensMorts > 0 ? "border-[#f3c3b5] bg-[#fdf6f4]" : ""}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-xl ${
                  nbLiensMorts > 0 ? "bg-adm-erreur-doux text-[#c94f35]" : "bg-adm-succes-doux text-[#0f9b85]"
                }`}
              >
                <Link2Off className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-titre text-[16px] leading-6 font-semibold text-adm-sombre">
                  Liens morts détectés
                </h3>
                <p className="text-[13px] leading-4 text-adm-gris">
                  {nbLiensMorts > 0
                    ? `${nbLiensMorts} fiche${nbLiensMorts > 1 ? "s" : ""} publiée${nbLiensMorts > 1 ? "s" : ""} pointe vers un site en défaut`
                    : nbJamaisVerifies > 0
                      ? "Aucun lien mort connu — certaines fiches ne sont pas encore vérifiées"
                      : "Aucun lien mort : tous les liens vérifiés répondent"}
                </p>
              </div>
            </div>
            <BoutonVerifierLiens />
          </div>

          {nbLiensMorts > 0 && (
            <ul className="mt-4 grid gap-2">
              {liensMorts.map((outil) => (
                <li key={outil.id}>
                  <Link
                    href={`/admin/outils/${outil.id}`}
                    className="group flex items-center justify-between gap-3 rounded-champ border border-adm-bordure bg-white px-3.5 py-2.5 transition hover:border-[#e0917a]"
                  >
                    <span className="min-w-0 truncate text-[13.5px] font-medium text-adm-sombre group-hover:text-[#c94f35]">
                      {outil.nom}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-adm-erreur-doux px-2 py-0.5 text-[11px] leading-4 font-bold text-[#c94f35]">
                        {libelleCodeLien(outil.statutLien)}
                      </span>
                      {outil.lienVerifieLe && (
                        <span className="text-[11px] text-adm-gris-clair">
                          {formateurDate.format(new Date(outil.lienVerifieLe))}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
              {nbLiensMorts > liensMorts.length && (
                <li className="px-1 text-[12px] text-adm-gris">
                  + {nbLiensMorts - liensMorts.length} autre{nbLiensMorts - liensMorts.length > 1 ? "s" : ""} fiche{nbLiensMorts - liensMorts.length > 1 ? "s" : ""} en défaut
                </li>
              )}
            </ul>
          )}
        </Carte>

        {/* Brouillons oubliés */}
        <Carte className={`p-6 ${nbBrouillonsAnciens > 0 ? "border-[#efdda8] bg-[#fdfaf1]" : ""}`}>
          <div className="flex items-center gap-3">
            <span
              className={`grid size-11 shrink-0 place-items-center rounded-xl ${
                nbBrouillonsAnciens > 0 ? "bg-adm-alerte-doux text-[#b26f00]" : "bg-adm-succes-doux text-[#0f9b85]"
              }`}
            >
              <FileWarning className="size-5" aria-hidden />
            </span>
            <div>
              <h3 className="font-titre text-[16px] leading-6 font-semibold text-adm-sombre">
                Brouillons oubliés
              </h3>
              <p className="text-[13px] leading-4 text-adm-gris">
                {nbBrouillonsAnciens > 0
                  ? `${nbBrouillonsAnciens} brouillon${nbBrouillonsAnciens > 1 ? "s" : ""} d'article sans modification depuis 30 jours`
                  : "Aucun brouillon ancien : tout est à jour"}
              </p>
            </div>
          </div>

          {nbBrouillonsAnciens > 0 && (
            <ul className="mt-4 grid gap-2">
              {brouillonsAnciens.map((article) => (
                <li key={article.id}>
                  <Link
                    href={`/admin/articles/${article.id}`}
                    className="group flex items-center justify-between gap-3 rounded-champ border border-adm-bordure bg-white px-3.5 py-2.5 transition hover:border-[#dfb95c]"
                  >
                    <span className="min-w-0 truncate text-[13.5px] font-medium text-adm-sombre group-hover:text-[#b26f00]">
                      {article.titre}
                    </span>
                    <span className="shrink-0 text-[11px] leading-4 font-semibold text-[#b26f00]">
                      inactif depuis {ageJours(article.majLe)} j
                    </span>
                  </Link>
                </li>
              ))}
              {nbBrouillonsAnciens > brouillonsAnciens.length && (
                <li className="px-1 text-[12px] text-adm-gris">
                  + {nbBrouillonsAnciens - brouillonsAnciens.length} autre{nbBrouillonsAnciens - brouillonsAnciens.length > 1 ? "s" : ""} brouillon{nbBrouillonsAnciens - brouillonsAnciens.length > 1 ? "s" : ""}
                </li>
              )}
            </ul>
          )}
        </Carte>

        {/* Lot 28 — Descriptions YouTube des tutoriels (raffinées) */}
        <Carte className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-xl ${nbTutosSansDescription > 0 ? "bg-adm-info-doux text-[#3b6fc9]" : "bg-adm-succes-doux text-[#0f9b85]"
                  }`}
              >
                <CaptionIcon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-titre text-[16px] leading-6 font-semibold text-adm-sombre">
                  Descriptions YouTube
                </h3>
                <p className="max-w-md text-[13px] leading-4 text-adm-gris">
                  {nbTutosSansDescription > 0
                    ? `${nbTutosSansDescription} tutoriel${nbTutosSansDescription > 1 ? "s" : ""} attend${nbTutosSansDescription > 1 ? "ent" : ""} sa description raffinée (chapitres + ressources utiles)`
                    : "Toutes les vidéos ont leur description raffinée, affichée sous chaque tutoriel"}
                </p>
              </div>
            </div>
            <BoutonRecupererDescriptions />
          </div>

          {nbTutosSansDescription > 0 && (
            <ul className="mt-4 grid gap-2">
              {tutosSansDescription.map((tuto) => (
                <li key={tuto.id}>
                  <Link
                    href="/admin/tutoriels"
                    className="group flex items-center justify-between gap-3 rounded-champ border border-adm-bordure bg-white px-3.5 py-2.5 transition hover:border-[#9db8e8]"
                  >
                    <span className="min-w-0 truncate text-[13.5px] font-medium text-adm-sombre group-hover:text-[#3b6fc9]">
                      {tuto.titre}
                    </span>
                    <span className="shrink-0 text-[11px] leading-4 font-semibold text-[#3b6fc9]">
                      sans description
                    </span>
                  </Link>
                </li>
              ))}
              {nbTutosSansDescription > tutosSansDescription.length && (
                <li className="px-1 text-[12px] text-adm-gris">
                  + {nbTutosSansDescription - tutosSansDescription.length} autre{nbTutosSansDescription - tutosSansDescription.length > 1 ? "s" : ""}
                </li>
              )}
            </ul>
          )}
        </Carte>
      </section>

      {/* ── Graphiques : inscriptions 14 jours + raccourcis + plans ── */}
      <section className="mt-6 grid gap-4 lg:grid-cols-3">
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

        {/* Raccourcis — Lot 26 : + Recherches & Segments */}
        <Carte className="animate-apparition-haut delai-1 p-6">
          <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">
            Raccourcis
          </h2>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {[
              { href: "/admin/moderation", libelle: "Modération", texte: "Propositions, contacts et avis en attente" },
              { href: "/admin/recherches", libelle: "Recherches", texte: "Ce que les visiteurs cherchent" },
              { href: "/admin/segments", libelle: "Segments", texte: "Filtres prêts à l'emploi + export CSV" },
              { href: "/admin/statistiques", libelle: "Statistiques", texte: "Vues par outil, article et prompt" },
              { href: "/admin/journal", libelle: "Journal d'audit", texte: "Qui a fait quoi, quand" },
              { href: "/admin/sauvegarde", libelle: "Sauvegarde", texte: "Exporter la base en JSON / CSV" },
            ].map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="group flex items-center justify-between gap-3 rounded-champ border border-bordure bg-white px-4 py-3 transition hover:border-primaire hover:bg-primaire/5"
              >
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-adm-sombre group-hover:text-primaire-texte">{r.libelle}</span>
                  <span className="block truncate text-[12px] text-encre">{r.texte}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-adm-gris-clair transition group-hover:translate-x-0.5 group-hover:text-primaire" aria-hidden />
              </Link>
            ))}
          </div>
        </Carte>

        <Carte className="animate-apparition-haut delai-1 p-6">
          <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">
            Membres par plan
          </h2>
          <div className="mt-4">
            <GraphiqueRepartition
              segments={[
                { libelle: "Découverte", valeur: nbDecouverte, couleur: "#99a1af" },
                { libelle: "Premium Pro", valeur: nbPro, couleur: "#5d87ff" },
                { libelle: "Entreprise", valeur: nbEntreprise, couleur: "#202936" },
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
