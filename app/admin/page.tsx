// app/admin/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 20b — TABLEAU DE BORD ADMIN redesigné (style Metis, aligné sur
// le dashboard utilisateur du Lot 18) :
//   • en-tête daté + salutation de l'admin ;
//   • bandeau dégradé « vue d'ensemble » avec les 3 chiffres clés ;
//   • cartes statistiques cliquables (Lot 20 : votes « Utile », Premium) ;
//   • graphique SVG des inscriptions des 7 derniers jours ;
//   • anneau « Membres par plan » (Découverte / Pro / Entreprise) ;
//   • top outils par votes de recommandation reçus ;
//   • propositions d'outils à modérer, derniers inscrits et derniers
//     avis (avec leurs votes « Utile »).
// Aucune librairie ajoutée : mêmes composants SVG et même charte que
// le dashboard utilisateur.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import {
  Crown,
  Inbox,
  MessageSquareQuote,
  Newspaper,
  ShieldCheck,
  Star,
  Users,
  Wrench,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatePrix } from "@/lib/plans";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { Bouton } from "@/components/ui/bouton";
import { CarteStatistique } from "@/components/dashboard/carte-statistique";
import { GraphiqueActivite } from "@/components/dashboard/graphique-activite";
import { GraphiqueRepartition } from "@/components/dashboard/graphique-repartition";
import { approuverPropositionFormulaire, refuserPropositionFormulaire } from "@/app/actions/admin";
import { formatteDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Administration" };
export const dynamic = "force-dynamic";

export default async function PageAdmin() {
  const session = await auth();
  const prenom = session?.user?.name ?? "";

  // ── Bornes de temps ─────────────────────────────────────────────
  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const debutSemaine = new Date();
  debutSemaine.setHours(0, 0, 0, 0);
  debutSemaine.setDate(debutSemaine.getDate() - 6);

  // ── Compteurs principaux ────────────────────────────────────────
  const [
    nbUtilisateurs, nbInscritsMois, nbOutilsPublies, nbOutilsTotal,
    nbArticles, nbArticlesPublies, nbAvis, nbFavoris, nbVotes,
    nbPropositions, abonnementsActifs, revenusMois,
    inscrits7j, topOutils, derniersInscrits, derniersAvis, propositions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: debutMois } } }),
    prisma.tool.count({ where: { statut: "PUBLIE" } }),
    prisma.tool.count(),
    prisma.article.count(),
    prisma.article.count({ where: { statut: "PUBLIE" } }),
    prisma.avis.count(),
    prisma.favorite.count(),
    prisma.vote.count(),
    prisma.toolSubmission.count({ where: { statut: "EN_ATTENTE" } }),
    prisma.abonnement.findMany({
      where: { statut: "ACTIF", expireLe: { gt: maintenant } },
      select: { plan: true },
    }),
    prisma.paiement.aggregate({
      where: { statut: "PAYE", creeLe: { gte: debutMois } },
      _sum: { montant: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: debutSemaine } },
      select: { createdAt: true },
    }),
    prisma.tool.findMany({
      where: { statut: "PUBLIE" },
      orderBy: { votes: { _count: "desc" } },
      take: 5,
      select: {
        id: true, nom: true, slug: true, tarif: true, gratuit: true,
        _count: { select: { votes: true, favorites: true, avis: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" }, take: 5,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    prisma.avis.findMany({
      orderBy: { majLe: "desc" }, take: 5,
      include: {
        outil: { select: { nom: true, slug: true } },
        utilisateur: { select: { name: true, email: true } },
      },
    }),
    prisma.toolSubmission.findMany({
      orderBy: { createdAt: "desc" }, take: 30, include: { category: true },
    }),
  ]);

  // ── Lot 20 : votes « Utile » sur les avis (lecture défensive, la
  //    table existe depuis le Lot 20a mais on ne casse jamais la page) ──
  const delegueVotesAvis = (prisma as any).voteAvis;
  const nbVotesUtile: number = delegueVotesAvis?.count
    ? await delegueVotesAvis.count().catch(() => 0)
    : 0;
  const votesParAvis: Record<string, number> = delegueVotesAvis?.groupBy
    ? await delegueVotesAvis
        .groupBy({ by: ["avisId"], _count: { avisId: true } })
        .then(
          (lignes: { avisId: string; _count: { avisId: number } }[]) =>
            Object.fromEntries(lignes.map((l) => [l.avisId, l._count.avisId])),
        )
        .catch(() => ({}))
    : {};

  // ── Plans Premium ───────────────────────────────────────────────
  const nbPremium = abonnementsActifs.length;
  const nbPro = abonnementsActifs.filter((a) => a.plan === "PRO").length;
  const nbEntreprise = abonnementsActifs.filter((a) => a.plan === "ENTREPRISE").length;
  const nbDecouverte = Math.max(nbUtilisateurs - nbPremium, 0);

  // ── Inscriptions des 7 derniers jours (courbe) ──────────────────
  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(debutSemaine);
    d.setDate(debutSemaine.getDate() + i);
    return d;
  });
  const valeursInscriptions = jours.map((d) => {
    const fin = new Date(d);
    fin.setDate(d.getDate() + 1);
    return inscrits7j.filter((u) => u.createdAt >= d && u.createdAt < fin).length;
  });
  const labelsJours = jours.map((d) =>
    new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(d).replace(".", ""),
  );
  const totalInscriptions = valeursInscriptions.reduce((somme, v) => somme + v, 0);

  const enAttente = propositions.filter((p) => p.statut === "EN_ATTENTE");

  const STATS = [
    {
      href: "/admin/utilisateurs", libelle: "Utilisateurs", valeur: nbUtilisateurs,
      contexte: `+${nbInscritsMois} ce mois-ci`, icone: Users, teinte: "violet" as const, delay: 0,
    },
    {
      href: "/admin/outils", libelle: "Outils publiés", valeur: nbOutilsPublies,
      contexte: `${nbOutilsTotal} fiches au total`, icone: Wrench, teinte: "ciel" as const, delay: 70,
    },
    {
      href: "/admin/articles", libelle: "Articles publiés", valeur: nbArticlesPublies,
      contexte: `${nbArticles - nbArticlesPublies} brouillon${nbArticles - nbArticlesPublies > 1 ? "s" : ""}`, icone: Newspaper, teinte: "turquoise" as const, delay: 140,
    },
    {
      href: "/admin/avis", libelle: "Avis publiés", valeur: nbAvis,
      contexte: `${nbVotesUtile} vote${nbVotesUtile > 1 ? "s" : ""} « Utile »`, icone: MessageSquareQuote, teinte: "magenta" as const, delay: 210,
    },
    {
      href: "/admin/abonnements", libelle: "Abonnés Premium", valeur: nbPremium,
      contexte: `${formatePrix(revenusMois._sum.montant ?? 0)} ce mois`, icone: Crown, teinte: "violet" as const, delay: 280,
    },
    {
      href: "/admin#propositions", libelle: "Propositions à traiter", valeur: nbPropositions,
      contexte: "Depuis cet écran", icone: Inbox, teinte: "ciel" as const, delay: 350,
    },
  ];

  return (
    <div>
      {/* ── En-tête daté + salutation ───────────────────────────────── */}
      <div className="animate-apparition-haut">
        <p className="text-legende text-encre capitalize">
          {new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(maintenant)}
        </p>
        <h1 className="mt-1 text-h2 font-semibold">
          {prenom ? `Bonjour ${prenom} 👋` : "Bonjour 👋"}
        </h1>
        <p className="mt-1 text-[14px] leading-6 text-encre">
          Voici la santé du site en un coup d'œil — contenu, communauté et monétisation.
        </p>
      </div>

      {/* ── Bandeau dégradé « vue d'ensemble » ──────────────────────── */}
      <div className="animate-apparition-haut delai-1 relative mt-6 overflow-hidden rounded-carte bg-[linear-gradient(110deg,#0b1b3f_0%,#4326a8_55%,#6a3bff_100%)] p-6 text-white sm:p-8">
        <div aria-hidden className="animate-flottant pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-ciel/20 blur-3xl" />
        <div aria-hidden className="animate-flottant-lent pointer-events-none absolute -bottom-20 -left-10 size-44 rounded-full bg-sky-500-clair/25 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="text-legende text-white/70">Console d'administration Webgiverse</p>
            <p className="mt-2 font-titre text-[20px] leading-7 font-semibold">
              {nbUtilisateurs} membres · {nbOutilsPublies} outils en ligne · {nbPremium} Premium actifs
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[12px] leading-4 font-semibold">
                <Star className="size-3.5 text-ciel" aria-hidden /> {nbFavoris} favoris
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[12px] leading-4 font-semibold">
                <MessageSquareQuote className="size-3.5 text-ciel" aria-hidden /> {nbAvis} avis · {nbVotes} votes
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[12px] leading-4 font-semibold">
                <Newspaper className="size-3.5 text-ciel" aria-hidden /> {nbArticlesPublies} articles
              </span>
            </div>
          </div>
          <span
            aria-hidden
            className="grid size-16 shrink-0 place-items-center rounded-full border-2 border-white/30 bg-white/15 transition-transform duration-300 hover:scale-105"
          >
            <ShieldCheck className="size-8 text-white" />
          </span>
        </div>
      </div>

      {/* ── Cartes statistiques cliquables ──────────────────────────── */}
      <section aria-label="Statistiques du site" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATS.map((s) => (
          <CarteStatistique
            key={s.href}
            href={s.href}
            libelle={s.libelle}
            valeur={s.valeur}
            contexte={s.contexte}
            icone={s.icone}
            teinte={s.teinte}
            delay={s.delay}
          />
        ))}
      </section>

      {/* ── Graphiques : inscriptions 7 jours + membres par plan ───── */}
      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Carte className="animate-apparition-haut p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">
              Nouvelles inscriptions
            </h2>
            <Badge variante="defaut">7 derniers jours</Badge>
          </div>
          <p className="mt-1 text-[13px] leading-4 text-encre">
            {totalInscriptions > 0
              ? `${totalInscriptions} inscription${totalInscriptions > 1 ? "s" : ""} cette semaine.`
              : "Aucune inscription cette semaine : partage ton lien d'invitation !"}
          </p>
          <div className="mt-4">
            <GraphiqueActivite valeurs={valeursInscriptions} labels={labelsJours} />
          </div>
        </Carte>

        <Carte className="animate-apparition-haut delai-1 p-6">
          <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">
            Membres par plan
          </h2>
          <div className="mt-4">
            <GraphiqueRepartition
              segments={[
                { libelle: "Découverte", valeur: nbDecouverte, couleur: "#8a94a6" },
                { libelle: "Premium Pro", valeur: nbPro, couleur: "#6a3bff" },
                { libelle: "Entreprise", valeur: nbEntreprise, couleur: "#00d1ff" },
              ]}
              total={nbUtilisateurs}
              totalLibelle="membres"
            />
          </div>
        </Carte>
      </section>

      {/* ── Top outils (votes de recommandation) ────────────────────── */}
      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Carte className="animate-apparition-haut overflow-hidden p-0 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-bordure px-5 pt-5 pb-4">
            <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">
              Top outils par votes
            </h2>
            <Link href="/admin/outils" className="text-[14px] font-semibold text-violet hover:underline">
              Gérer les outils
            </Link>
          </div>
          <table className="w-full text-[14px] leading-5">
            <thead className="text-left text-legende text-encre">
              <tr>
                <th className="px-5 py-3">Outil</th>
                <th className="px-3 py-3">Votes</th>
                <th className="px-3 py-3">Favoris</th>
                <th className="px-3 py-3">Avis</th>
                <th className="px-5 py-3 text-right">Fiche</th>
              </tr>
            </thead>
            <tbody>
              {topOutils.map((o) => (
                <tr key={o.id} className="border-t border-bordure">
                  <td className="max-w-60 truncate px-5 py-3.5">
                    <p className="truncate font-semibold text-bleu">{o.nom}</p>
                    <p className="text-[12px] leading-4 text-encre">{o.tarif || (o.gratuit ? "Gratuit" : "")}</p>
                  </td>
                  <td className="px-3 py-3.5 font-semibold text-violet tabular-nums">{o._count.votes}</td>
                  <td className="px-3 py-3.5 text-encre tabular-nums">{o._count.favorites}</td>
                  <td className="px-3 py-3.5 text-encre tabular-nums">{o._count.avis}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Link href={`/outil/${o.slug}`} className="text-[13px] font-semibold text-violet hover:underline">
                      Voir
                    </Link>
                  </td>
                </tr>
              ))}
              {topOutils.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-encre">Aucun outil publié pour l'instant.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Carte>

        {/* ── Derniers inscrits ─────────────────────────────────────── */}
        <section className="animate-apparition-haut delai-1">
          <div className="flex items-center justify-between">
            <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">Derniers inscrits</h2>
            <Link href="/admin/utilisateurs" className="text-[14px] font-semibold text-violet hover:underline">Tout voir</Link>
          </div>
          <Carte className="mt-4 divide-y divide-bordure">
            {derniersInscrits.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div className="min-w-0">
                  <p className="truncate text-[14px] leading-5 font-semibold text-bleu">{u.name || "Sans nom"}</p>
                  <p className="truncate text-[13px] leading-5 text-encre">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {u.role === "ADMIN" && <Badge variante="source">Admin</Badge>}
                  <span className="text-[13px] text-encre">{formatteDate(u.createdAt)}</span>
                </div>
              </div>
            ))}
            {derniersInscrits.length === 0 && <p className="p-4 text-[14px] text-encre">Aucun inscrit pour l'instant.</p>}
          </Carte>
        </section>
      </section>

      {/* ── Propositions d'outils ───────────────────────────────────── */}
      <section id="propositions" className="mt-10 scroll-mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-h3 font-semibold">Propositions d'outils</h2>
          {enAttente.length > 0 && <Badge variante="nouveau">{enAttente.length} en attente</Badge>}
        </div>
        <div className="mt-4 grid gap-3">
          {enAttente.map((p) => (
            <Carte key={p.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[17px] leading-6 font-titre font-semibold">{p.nom}</h3>
                {p.category && <Badge variante="source">{p.category.nom}</Badge>}
                <span className="text-[13px] text-encre">propose le {formatteDate(p.createdAt)}</span>
              </div>
              <p className="mt-2 text-[14px] leading-5 text-encre">{p.description}</p>
              <p className="mt-1 text-[13px] leading-5 text-encre">
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-violet hover:underline">{p.url}</a>
                {p.tarif ? ` · ${p.tarif}` : ""}{p.contact ? ` · ${p.contact}` : ""}
              </p>
              <div className="mt-4 flex gap-2">
                <form action={approuverPropositionFormulaire}>
                  <input type="hidden" name="propositionId" value={p.id} />
                  <Bouton taille="sm" type="submit">Approuver et publier</Bouton>
                </form>
                <form action={refuserPropositionFormulaire}>
                  <input type="hidden" name="propositionId" value={p.id} />
                  <Bouton taille="sm" variante="danger" type="submit">Refuser</Bouton>
                </form>
              </div>
            </Carte>
          ))}
          {enAttente.length === 0 && (
            <Carte className="p-6 text-encre">Aucune proposition en attente. Tout est traité 🎉</Carte>
          )}
        </div>
      </section>

      {/* ── Derniers avis ───────────────────────────────────────────── */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-h3 font-semibold">Derniers avis</h2>
          <Link href="/admin/avis" className="text-[14px] font-semibold text-violet hover:underline">Tout voir</Link>
        </div>
        <Carte className="mt-4 divide-y divide-bordure">
          {derniersAvis.map((a) => {
            const utiles = votesParAvis[a.id] ?? 0;
            return (
              <div key={a.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/outil/${a.outil.slug}`} className="text-[14px] font-semibold text-violet hover:underline">{a.outil.nom}</Link>
                  <span className="flex items-center gap-2">
                    {utiles > 0 && (
                      <Badge variante="gratuit">👍 {utiles} utile{utiles > 1 ? "s" : ""}</Badge>
                    )}
                    <span className="text-[13px] font-semibold text-amber-500">{"★".repeat(a.note)}{"☆".repeat(5 - a.note)}</span>
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-encre">{a.contenu}</p>
                <p className="mt-1 text-[12px] text-encre">
                  Par {a.utilisateur.name || a.utilisateur.email} · {formatteDate(a.majLe)}
                </p>
              </div>
            );
          })}
          {derniersAvis.length === 0 && <p className="p-4 text-[14px] text-encre">Aucun avis publié pour l'instant.</p>}
        </Carte>
      </section>
    </div>
  );
}
