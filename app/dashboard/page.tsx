// app/dashboard/page.tsx
// ─────────────────────────────────────────────────────────────────
// MON ESPACE — tableau de bord utilisateur enrichi.
// 5 onglets : Aperçu / Favoris / Mes listes / Mes avis / Activité.
// Navigation par paramètre d'URL (?onglet=…) : tout reste côté
// serveur, aucune donnée ne se charge inutilement.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeftRight,
  CheckCircle2,
  ChevronRight,
  Compass,
  Crown,
  History,
  LayoutDashboard,
  ListChecks,
  Loader,
  Lock,
  MessageSquareQuote,
  Pencil,
  MonitorPlay,
  TerminalSquare,
  Play,
  Plus,
  Search,
  Share2,
  Sparkles,
  Star,
  ThumbsUp,
  Trash2,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";
import { LIMITES_DECOUVERTE } from "@/lib/premium";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/badge";
import { LogoOutil } from "@/components/commun/logo-outil";
import { SelecteurStatut } from "@/components/dashboard/selecteur-statut";
import { EditeurNote } from "@/components/dashboard/editeur-note";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import { FormulaireProfil } from "@/components/dashboard/formulaire-profil";
import { EditeurAvis } from "@/components/dashboard/editeur-avis";
import {
  ajouterDansListeFormulaire,
  creerListeFormulaire,
  renommerListeFormulaire,
  retirerDeListeFormulaire,
  supprimerListeFormulaire,
} from "@/app/actions/listes";
import { supprimerFavoriFormulaire } from "@/app/actions/favoris";
import { supprimerAvisFormulaire } from "@/app/actions/avis";
import { PortailConnexion } from "@/components/auth/portail-connexion";
import BoutonPartageListe from "@/components/partage/bouton-partage-liste";
import VuRecemment from "@/components/visites/vu-recemment";
import BoutonExportPdf from "@/components/pdf/bouton-export-pdf";
import { urlMiniature, formaterDuree, NIVEAUX } from "@/lib/tutos-utils";

export const metadata: Metadata = { title: "Mon espace" };

const ONGLETS = [
  { cle: "apercu", libelle: "Aperçu", icone: LayoutDashboard },
  { cle: "favoris", libelle: "Favoris", icone: Star },
  { cle: "listes", libelle: "Mes listes", icone: ListChecks },
  { cle: "avis", libelle: "Mes avis", icone: MessageSquareQuote },
  { cle: "activite", libelle: "Activité", icone: History },
] as const;

type CleOnglet = (typeof ONGLETS)[number]["cle"];

const STYLE_SELECT =
  "min-h-11 rounded-champ border border-bordure bg-white px-3 text-[15px] leading-5 focus:border-sky-500 focus:outline-none";

const TEINTES_STATISTIQUE = {
  violet: "bg-violet-100 text-violet-700",
  ciel: "bg-sky-100 text-sky-700",
  turquoise: "bg-teal-100 text-teal-700",
  magenta: "bg-fuchsia-100 text-fuchsia-700",
} as const;

function CarteStatistique({
  href,
  libelle,
  valeur,
  contexte,
  icone: Icone,
  teinte,
  delay = 0,
}: {
  href: string;
  libelle: string;
  valeur: number;
  contexte: string;
  icone: LucideIcon;
  teinte: keyof typeof TEINTES_STATISTIQUE;
  delay?: number;
}) {
  return (
    <Link
      href={href}
      className="animate-apparition-haut rounded-carte border border-bordure bg-white p-5 transition-shadow hover:shadow-carte"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] leading-5 text-encre">{libelle}</p>
          <p className="mt-1 font-titre text-[26px] leading-8 font-bold text-bleu">{valeur}</p>
        </div>
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${TEINTES_STATISTIQUE[teinte]}`}>
          <Icone className="size-5" aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-[12px] leading-4 text-encre">{contexte}</p>
    </Link>
  );
}

function GraphiqueActivite({ valeurs, labels }: { valeurs: number[]; labels: string[] }) {
  const maximum = Math.max(...valeurs, 1);
  const points = valeurs.map((valeur, index) => {
    const x = valeurs.length > 1 ? 24 + (index * 652) / (valeurs.length - 1) : 350;
    const y = 145 - (valeur / maximum) * 112;
    return { x, y, valeur, label: labels[index] ?? "" };
  });

  return (
    <svg viewBox="0 0 700 190" className="h-44 w-full" role="img" aria-label="Activité des sept derniers jours">
      {[33, 89, 145].map((y) => (
        <line key={y} x1="20" x2="680" y1={y} y2={y} stroke="#e5e7eb" strokeDasharray="4 5" />
      ))}
      {points.length > 1 && (
        <polyline
          points={points.map(({ x, y }) => `${x},${y}`).join(" ")}
          fill="none"
          stroke="#6a3bff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {points.map(({ x, y, valeur, label }, index) => (
        <g key={`${label}-${index}`}>
          <circle cx={x} cy={y} r="4" fill="#6a3bff" />
          <text x={x} y="177" textAnchor="middle" fill="#667085" fontSize="12">{label}</text>
          <title>{`${label} : ${valeur} action${valeur === 1 ? "" : "s"}`}</title>
        </g>
      ))}
    </svg>
  );
}

function GraphiqueRepartition({
  segments,
  total,
  totalLibelle,
}: {
  segments: { libelle: string; valeur: number; couleur: string }[];
  total: number;
  totalLibelle: string;
}) {
  let cumul = 0;
  const gradient = segments.map((segment) => {
    const debut = total > 0 ? (cumul / total) * 100 : 0;
    cumul += segment.valeur;
    const fin = total > 0 ? (cumul / total) * 100 : 0;
    return `${segment.couleur} ${debut}% ${fin}%`;
  }).join(", ");

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div
        className="relative grid size-32 shrink-0 place-items-center rounded-full"
        style={{ background: total > 0 ? `conic-gradient(${gradient})` : "#e5e7eb" }}
        role="img"
        aria-label={`${total} ${totalLibelle}`}
      >
        <div className="grid size-20 place-content-center rounded-full bg-white text-center">
          <span className="font-titre text-xl font-bold text-bleu">{total}</span>
          <span className="text-[11px] text-encre">{totalLibelle}</span>
        </div>
      </div>
      <ul className="space-y-2 text-[13px]">
        {segments.map((segment) => (
          <li key={segment.libelle} className="flex items-center gap-2 text-encre">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: segment.couleur }} aria-hidden />
            {segment.libelle} <span className="font-semibold text-bleu">{segment.valeur}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const ICONES_ACTIVITE: Record<string, { icone: LucideIcon; libelle: string }> = {
  favori: { icone: Star, libelle: "Favoris" },
  assistant: { icone: Sparkles, libelle: "Assistant IA" },
  avis: { icone: MessageSquareQuote, libelle: "Avis" },
  avis_publie: { icone: MessageSquareQuote, libelle: "Avis publié" },
  vote: { icone: ThumbsUp, libelle: "Recommandation (vote)" },
  partage_liste: { icone: Share2, libelle: "Partage de liste" },
  recherche: { icone: Search, libelle: "Recherche" },
  profil: { icone: User, libelle: "Profil" },
  proposition: { icone: Plus, libelle: "Proposition d'outil" },
};

const formateurDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

// ── Rend les détails du journal lisibles ───────────────────────
// Certaines API enregistrent du JSON brut (ex. {"outil":"canva","note":4}).
// Cette fonction le transforme en phrase française propre ; si le détail
// est déjà un texte simple (ex. « Ajouté : canva »), il est affiché tel quel.
function formaterDetails(type: string, details: string | null): string | null {
  if (!details) return null;
  try {
    const d = JSON.parse(details);
    if (d && typeof d === "object" && !Array.isArray(d)) {
      if (type === "avis_publie" && d.outil) {
        return `Outil : ${d.outil}${d.note ? ` · Note : ${d.note}/5` : ""}`;
      }
      if (type === "vote" && d.outil) {
        return `Outil : ${d.outil}${d.vote === false ? " · Recommandation retirée" : " · Recommandé 👍"}`;
      }
      if (type === "partage_liste" || type === "partage_favoris") {
        return d.publique === false ? "Liste rendue privée" : "Liste partagée en public";
      }
      return Object.entries(d)
        .map(([cle, valeur]) => `${cle} : ${String(valeur)}`)
        .join(" · ");
    }
  } catch {
    /* détail texte simple : affiché tel quel */
  }
  return details;
}

const PALIERS = [
  { min: 30, nom: "Maître IA" },
  { min: 15, nom: "Conquérant" },
  { min: 5, nom: "Explorateur" },
];

export default async function PageDashboard({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string; statut?: string; message?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return <PortailConnexion />;

  const { onglet, statut, message } = await searchParams;
  const ongletActif: CleOnglet = ONGLETS.some((o) => o.cle === onglet)
    ? (onglet as CleOnglet)
    : "apercu";
  const statutFiltre = ["A_TESTER", "EN_COURS", "ADOPTE"].includes(statut ?? "")
    ? (statut as "A_TESTER" | "EN_COURS" | "ADOPTE")
    : null;

  const userId = session.user.id;
  const utilisateur = await prisma.user.findUnique({ where: { id: userId } });
  const prenom = (utilisateur?.name ?? "").trim().split(/\s+/)[0] ?? "";

  // ── Compteurs (toujours chargés : en-tête + badges) ────────────
  // « avis » et « vote » sont protégés : si le client Prisma n'est pas
  // encore régénéré (ou si la requête échoue), on affiche 0 sans crash.
  const prismaAvis = (prisma as any).avis;
  const prismaVote = (prisma as any).vote;
  // Lot 19 — nouveaux compteurs de la section « Apprendre » (défensifs :
  // tables PromptFavori / ProgressionTuto créées lors du db push)
  const prismaPromptFavori = (prisma as any).promptFavori;
  const prismaProgressionTuto = (prisma as any).progressionTuto;
  const [nbFavoris, nbEnCours, nbAdoptes, nbAvis, nbVotes, nbListes, nbPromptsFavoris, nbTutosTermines] = await Promise.all([
    prisma.favorite.count({ where: { userId } }),
    prisma.favorite.count({ where: { userId, statut: "EN_COURS" } }),
    prisma.favorite.count({ where: { userId, statut: "ADOPTE" } }),
    prismaAvis?.count
      ? prismaAvis.count({ where: { utilisateurId: userId } }).catch(() => 0)
      : Promise.resolve(0),
    prismaVote?.count
      ? prismaVote.count({ where: { utilisateurId: userId } }).catch(() => 0)
      : Promise.resolve(0),
    prisma.list.count({ where: { userId } }),
    prismaPromptFavori?.count
      ? prismaPromptFavori.count({ where: { userId } }).catch(() => 0)
      : Promise.resolve(0),
    prismaProgressionTuto?.count
      ? prismaProgressionTuto.count({ where: { userId, statut: "TERMINE" } }).catch(() => 0)
      : Promise.resolve(0),
  ]);

  const score = nbFavoris + nbEnCours + nbAdoptes * 2 + nbAvis * 2 + nbVotes + nbListes;
  const palier = PALIERS.find((p) => score >= p.min) ?? { min: 0, nom: "Débutant" };
  const seuilSuivant = score >= 30 ? null : score >= 15 ? 30 : score >= 5 ? 15 : 5;
  const progression = seuilSuivant
    ? Math.min(100, Math.round((score / seuilSuivant) * 100))
    : 100;

  // ── Abonnement (chargé une seule fois pour l'en-tête ET l'onglet Aperçu) ──
  const prismaAbonnement = (prisma as any).abonnement;
  const abonnementEnTete = prismaAbonnement?.findUnique
    ? await prismaAbonnement
        .findUnique({ where: { utilisateurId: userId } })
        .catch(() => null)
    : null;
  const abonnementEnTeteActif =
    abonnementEnTete &&
    abonnementEnTete.statut === "ACTIF" &&
    abonnementEnTete.expireLe > new Date();
  const planNomEnTete = abonnementEnTeteActif
    ? (PLANS[abonnementEnTete.plan as "PRO" | "ENTREPRISE"]?.nom ?? "Pro")
    : "Découverte";
    const premium = Boolean(abonnementEnTeteActif);
  // Plan Entreprise = promesses spécifiques : accès anticipé aux nouveautés
  // et historique d'activité étendu (voir /tarifs et lib/plans.ts).
  const planEntreprise = Boolean(
    abonnementEnTeteActif && abonnementEnTete.plan === "ENTREPRISE"
  );

  const badges: { titre: string; description: string; obtenu: boolean; icone: LucideIcon }[] = [
    { titre: "Premier favori", description: "1 outil en favori", obtenu: nbFavoris >= 1, icone: Star },
    { titre: "Collectionneur", description: "5 favoris", obtenu: nbFavoris >= 5, icone: Star },
    { titre: "Testeur actif", description: "3 outils en cours", obtenu: nbEnCours >= 3, icone: Loader },
    { titre: "Fidèle au poste", description: "3 outils adoptés", obtenu: nbAdoptes >= 3, icone: CheckCircle2 },
    { titre: "Premier avis", description: "1 avis publié", obtenu: nbAvis >= 1, icone: MessageSquareQuote },
    { titre: "Grand critique", description: "5 avis publiés", obtenu: nbAvis >= 5, icone: MessageSquareQuote },
    { titre: "Organisateur", description: "1 liste créée", obtenu: nbListes >= 1, icone: ListChecks },
    { titre: "Voix qui compte", description: "5 votes donnés", obtenu: nbVotes >= 5, icone: ThumbsUp },
  ];

  // ── En-tête commun (greeting + niveau) ───────────────
  const enTete = (
    <>
      <div className="animate-apparition-haut">
        <p className="text-legende text-encre capitalize">
          {new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}
        </p>
        <h1 className="mt-1 text-h2 font-semibold">
          {prenom ? `Bonjour ${prenom} 👋` : "Bonjour 👋"}
        </h1>
      </div>

      {/* Carte de bienvenue avec progression (animée) */}
      <div className="animate-apparition-haut delai-1 relative mt-6 overflow-hidden rounded-carte bg-[linear-gradient(110deg,#0b1b3f_0%,#4326a8_55%,#6a3bff_100%)] p-6 text-white sm:p-8">
        <div aria-hidden className="animate-flottant pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-ciel/20 blur-3xl" />
        <div aria-hidden className="animate-flottant-lent pointer-events-none absolute -bottom-20 -left-10 size-44 rounded-full bg-sky-500-clair/25 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="text-legende text-white/70">Ton espace personnel Webgiverse</p>
            <p className="mt-2 flex flex-wrap items-center gap-2 font-titre text-[20px] leading-7 font-semibold">
              Niveau : {palier.nom}
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[12px] leading-4 font-medium">
                {score} pts
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[12px] leading-4 font-semibold">
                {abonnementEnTeteActif ? (
                  <>
                    <Crown className="size-3.5 text-ciel" aria-hidden /> Plan {planNomEnTete}
                  </>
                ) : (
                  "Plan Découverte"
                )}
              </span>
            </p>
            <div className="mt-3 w-full max-w-xs">
              <div className="h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="barre-progression h-full rounded-full bg-[linear-gradient(90deg,#00d1ff,#00e5c6)]"
                  style={{ width: `${progression}%` }}
                />
              </div>
              <p className="mt-1.5 text-[12px] leading-4 text-white/70">
                {seuilSuivant
                  ? `Encore ${seuilSuivant - score} pts avant le niveau suivant`
                  : "Niveau maximum atteint — bravo ! 🎉"}
              </p>
            </div>
          </div>
          {session.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt=""
              className="size-16 shrink-0 rounded-full border-2 border-white/30 object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className="grid size-16 shrink-0 place-items-center rounded-full border-2 border-white/30 bg-white/15 font-titre text-[22px] font-bold">
              {(prenom || "W").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </>
  );

  // ── Contenu selon l'onglet actif ───────────────────────────────
  let contenu: React.ReactNode = null;

  /* ══════════════ ONGLET APERÇU ══════════════ */
  if (ongletActif === "apercu") {
    const [recommandations, suggestions] = await Promise.all([
      prisma.recommendation.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      utilisateur?.objectif
        ? prisma.tool.findMany({
            where: { statut: "PUBLIE", objectifs: { has: utilisateur.objectif } },
            orderBy: [{ misEnAvant: "desc" }, { createdAt: "desc" }],
            take: premium ? 6 : 3,
            select: {
              id: true,
              nom: true,
              slug: true,
              logo: true,
              description: true,
              tarif: true,
              gratuit: true,
            },
          })
        : Promise.resolve([]),
    ]);

    // ── Accès anticipé aux nouveautés (plan Entreprise) : les derniers
    // outils publiés qui ne sont pas encore mis en avant, visibles ici
    // avant leur passage à la une — promesse affichée sur /tarifs. ──
    const nouveauxEntreprise = planEntreprise
      ? await prisma.tool.findMany({
          where: { statut: "PUBLIE", misEnAvant: false },
          orderBy: { createdAt: "desc" },
          take: 4,
          select: {
            id: true,
            nom: true,
            slug: true,
            logo: true,
            description: true,
            tarif: true,
            gratuit: true,
          },
        })
      : [];

    // ── Abonnement déjà chargé dans l'en-tête commun (lecture défensive) ──
    const abonnementActif =
      abonnementEnTete &&
      abonnementEnTete.statut === "ACTIF" &&
      abonnementEnTete.expireLe > new Date()
        ? abonnementEnTete
        : null;

    // ── Données du tableau de bord (style Metis) — toutes défensives :
    //    si une table est absente ou vide, l'aperçu reste affichable. ──
    const debutSemaine = new Date();
    debutSemaine.setHours(0, 0, 0, 0);
    debutSemaine.setDate(debutSemaine.getDate() - 6);

    let activites7j: { creeLe: Date }[] = [];
    try {
      activites7j = await prisma.activiteUtilisateur.findMany({
        where: { utilisateurId: userId, creeLe: { gte: debutSemaine } },
        select: { creeLe: true },
      });
    } catch {
      /* journal indisponible : le graphique affichera une ligne à zéro */
    }
    const jours = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(debutSemaine);
      d.setDate(debutSemaine.getDate() + i);
      return d;
    });
    const valeursActivite = jours.map((d) => {
      const fin = new Date(d);
      fin.setDate(d.getDate() + 1);
      return activites7j.filter((a) => a.creeLe >= d && a.creeLe < fin).length;
    });
    const labelsJours = jours.map((d) =>
      new Intl.DateTimeFormat("fr-FR", { weekday: "short" })
        .format(d)
        .replace(".", ""),
    );
    const totalActivite = valeursActivite.reduce((somme, v) => somme + v, 0);

    const nbATester = await prisma.favorite.count({
      where: { userId, statut: "A_TESTER" },
    });

    const derniersFavoris = await prisma.favorite.findMany({
      where: { userId },
      include: {
        tool: {
          include: { categories: { select: { categorie: { select: { nom: true } } } } },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    const tutosPopulaires = await prisma.tuto.findMany({
      orderBy: [{ vues: "desc" }],
      take: 3,
      select: {
        slug: true,
        titre: true,
        dureeMin: true,
        niveau: true,
        miniature: true,
        youtubeId: true,
        vues: true,
      },
    });

    const deleguePrompt = (prisma as any).prompt;
    const promptsPopulaires = deleguePrompt?.findMany
      ? await deleguePrompt
          .findMany({
            orderBy: [{ vues: "desc" }],
            take: 4,
            select: {
              slug: true,
              titre: true,
              emoji: true,
              vues: true,
              categorie: { select: { nom: true } },
            },
          })
          .catch(() => [])
      : [];

    const formateurJour = new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
    });

    contenu = (
      <>
        {/* ── Cartes statistiques (style Metis) ───────────────────── */}
        <section aria-label="Mes statistiques" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CarteStatistique
            href="/dashboard/prompts"
            libelle="Prompts sauvegardés"
            valeur={nbPromptsFavoris}
            contexte={premium ? "Illimité · plan Premium" : `Limite : ${LIMITES_DECOUVERTE.prompts} · plan Découverte`}
            icone={TerminalSquare}
            teinte="violet"
            delay={280}
          />
          <CarteStatistique
            href="/dashboard/tutoriels"
            libelle="Tutoriels terminés"
            valeur={nbTutosTermines}
            contexte="Ta progression dans la collection vidéo"
            icone={MonitorPlay}
            teinte="ciel"
            delay={350}
          />
          <CarteStatistique
            href="/dashboard?onglet=favoris"
            libelle="Favoris"
            valeur={nbFavoris}
            contexte={premium ? "Illimité · plan Premium" : `Limite : ${LIMITES_DECOUVERTE.favoris} · plan Découverte`}
            icone={Star}
            teinte="violet"
          />
          <CarteStatistique
            href="/dashboard?onglet=favoris&statut=ADOPTE"
            libelle="Outils adoptés"
            valeur={nbAdoptes}
            contexte={`${nbEnCours} en cours de test`}
            icone={CheckCircle2}
            teinte="ciel"
            delay={70}
          />
          <CarteStatistique
            href="/dashboard?onglet=avis"
            libelle="Avis publiés"
            valeur={nbAvis}
            contexte={nbVotes > 0 ? `${nbVotes} votes de recommandation` : "Un avis aide toute la communauté"}
            icone={MessageSquareQuote}
            teinte="turquoise"
            delay={140}
          />
          <CarteStatistique
            href="/dashboard?onglet=activite"
            libelle="Points d'activité"
            valeur={score}
            contexte={`Niveau : ${palier.nom}`}
            icone={Sparkles}
            teinte="magenta"
            delay={210}
          />
        </section>

        {/* ── Graphiques : activité 7 jours + favoris par statut ──── */}
        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <Carte className="animate-apparition-haut p-6 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">Mon activité</h2>
              <Badge variante="defaut">7 derniers jours</Badge>
            </div>
            <p className="mt-1 text-[13px] leading-4 text-encre">
              {totalActivite > 0
                ? `${totalActivite} action${totalActivite > 1 ? "s" : ""} enregistrée${totalActivite > 1 ? "s" : ""} cette semaine (favoris, avis, recherches…).`
                : "Aucune action enregistrée cette semaine : ajoute un favori ou publie un avis !"}
            </p>
            <div className="mt-4">
              <GraphiqueActivite valeurs={valeursActivite} labels={labelsJours} />
            </div>
          </Carte>

          <Carte className="animate-apparition-haut delai-1 p-6">
            <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">
              Mes favoris par statut
            </h2>
            {nbFavoris > 0 ? (
              <div className="mt-4">
                <GraphiqueRepartition
                  segments={[
                    { libelle: "Adoptés", valeur: nbAdoptes, couleur: "#6a3bff" },
                    { libelle: "En cours", valeur: nbEnCours, couleur: "#00d1ff" },
                    { libelle: "À tester", valeur: nbATester, couleur: "#8a94a6" },
                  ]}
                  total={nbFavoris}
                  totalLibelle="favoris"
                />
              </div>
            ) : (
              <p className="mt-8 mb-6 text-center text-[14px] leading-6 text-encre">
                Ajoute ton premier outil en favori pour voir la répartition
                apparaître ici.
              </p>
            )}
          </Carte>
        </section>

        {/* ── Derniers favoris (tableau style Metis) + Tutoriels ──── */}
        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <Carte className="animate-apparition-haut overflow-hidden p-0 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-bordure px-5 pt-5 pb-4">
              <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">
                Derniers favoris
              </h2>
              <Link
                href="/dashboard?onglet=favoris"
                className="text-[13px] leading-4 font-semibold text-sky-500 hover:underline"
              >
                Tout voir →
              </Link>
            </div>
            {derniersFavoris.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left">
                  <thead>
                    <tr className="border-b border-bordure bg-gris/50 text-[12px] leading-4 font-semibold tracking-wide text-encre uppercase">
                      <th scope="col" className="px-5 py-2.5">Outil</th>
                      <th scope="col" className="px-3 py-2.5">Catégorie</th>
                      <th scope="col" className="px-3 py-2.5">Statut</th>
                      <th scope="col" className="px-5 py-2.5 text-right">Mis à jour</th>
                    </tr>
                  </thead>
                  <tbody>
                    {derniersFavoris.map((f) => {
                      const metaStatut =
                        f.statut === "ADOPTE"
                          ? { libelle: "Adopté", variante: "source" as const }
                          : f.statut === "EN_COURS"
                            ? { libelle: "En cours", variante: "agent" as const }
                            : { libelle: "À tester", variante: "defaut" as const };
                      return (
                        <tr key={f.id} className="border-b border-bordure/60 last:border-0">
                          <td className="px-5 py-3">
                            <Link href={`/outil/${f.tool.slug}`} className="flex items-center gap-2.5">
                              <LogoOutil nom={f.tool.nom} logo={f.tool.logo} />
                              <span className="min-w-0">
                                <span className="block max-w-[200px] truncate text-[14px] leading-5 font-semibold text-bleu hover:text-sky-500">
                                  {f.tool.nom}
                                </span>
                                {f.note && (
                                  <span className="block max-w-[200px] truncate text-[12px] leading-4 text-encre">
                                    {f.note}
                                  </span>
                                )}
                              </span>
                            </Link>
                          </td>
                          <td className="px-3 py-3 text-[13px] leading-4 text-encre">
                            {f.tool.categories[0]?.categorie.nom ?? "—"}
                          </td>
                          <td className="px-3 py-3">
                            <Badge variante={metaStatut.variante}>{metaStatut.libelle}</Badge>
                          </td>
                          <td className="px-5 py-3 text-right text-[13px] leading-4 text-encre">
                            {formateurJour.format(f.updatedAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-[14px] leading-6 text-encre">
                  Aucun favori pour le moment. Explore l&apos;annuaire et garde
                  tes découvertes ici.
                </p>
                <Bouton variante="secondaire" taille="sm" className="mt-4" asChild>
                  <Link href="/outils">Explorer l&apos;annuaire</Link>
                </Bouton>
              </div>
            )}
          </Carte>

          {/* Tutoriels à suivre (les plus vus) */}
          <Carte className="animate-apparition-haut delai-1 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">
                Tutoriels à suivre
              </h2>
              <Link
                href="/tutoriels"
                className="text-[13px] leading-4 font-semibold text-sky-500 hover:underline"
              >
                Tous →
              </Link>
            </div>
            {tutosPopulaires.length > 0 ? (
              <ul className="mt-4 grid gap-4">
                {tutosPopulaires.map((t) => {
                  const niveau = NIVEAUX[t.niveau];
                  const mini = urlMiniature(t);
                  return (
                    <li key={t.slug}>
                      <Link href={`/tutoriels/${t.slug}`} className="group flex items-center gap-3">
                        <span className="relative block aspect-video w-24 shrink-0 overflow-hidden rounded-champ bg-bleu">
                          {mini ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={mini}
                              alt=""
                              loading="lazy"
                              className="size-full object-cover transition duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <span className="grid size-full place-items-center bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)]">
                              <Play className="size-5 text-white" aria-hidden />
                            </span>
                          )}
                          <span className="absolute right-1 bottom-1 rounded bg-black/75 px-1.5 text-[10px] leading-3.5 font-semibold text-white">
                            {formaterDuree(t.dureeMin)}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 block text-[13px] leading-4 font-semibold text-bleu group-hover:text-sky-500">
                            {t.titre}
                          </span>
                          <span className="mt-1 block text-[12px] leading-4 text-encre">
                            {niveau.libelle} · {t.vues.toLocaleString("fr-FR")} vues
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-6 mb-2 text-[14px] leading-6 text-encre">
                Les tutoriels vidéo apparaîtront ici dès leur publication.
              </p>
            )}
          </Carte>
        </section>

        {/* ── Prompts IA populaires ────────────────────────────────── */}
        <section className="mt-6">
          <Carte className="animate-apparition-haut p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">
                  Prompts IA populaires
                </h2>
                <p className="mt-0.5 text-[13px] leading-4 text-encre">
                  Les prompts les plus consultés — lecture et copie réservées aux
                  abonnés Premium.
                </p>
              </div>
              <Link
                href="/prompts"
                className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-sky-500 bg-sky-500/5 px-4 text-[13px] leading-4 font-semibold text-sky-500 transition hover:bg-sky-500 hover:text-white"
              >
                Explorer la bibliothèque
              </Link>
            </div>
            {promptsPopulaires.length > 0 ? (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {promptsPopulaires.map(
                  (p: { slug: string; titre: string; emoji: string; vues: number; categorie?: { nom: string } | null }) => (
                    <li key={p.slug}>
                      <Link
                        href={`/prompts/${p.slug}`}
                        className="group flex h-full items-start gap-3 rounded-carte border border-bordure p-4 transition hover:border-sky-500"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-champ bg-gris text-[18px]">
                          {p.emoji || "✨"}
                        </span>
                        <span className="min-w-0">
                          <span className="line-clamp-2 block text-[14px] leading-5 font-semibold text-bleu group-hover:text-sky-500">
                            {p.titre}
                          </span>
                          <span className="mt-1 block text-[12px] leading-4 text-encre">
                            {p.categorie?.nom ?? "Prompt"} · {p.vues.toLocaleString("fr-FR")} vues
                          </span>
                        </span>
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            ) : (
              <p className="mt-4 text-[14px] leading-6 text-encre">
                La bibliothèque de prompts s&apos;affichera ici dès que les
                données seront disponibles.
              </p>
            )}
          </Carte>
        </section>

        {/* Mon abonnement Premium */}
        <Carte className="animate-apparition-haut delai-2 mt-8 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-champ bg-sky-500/10 text-sky-500">
                <Crown className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-h3 font-semibold">Mon abonnement</h2>
                {abonnementActif ? (
                  <p className="mt-1 text-legende text-encre">
                    Plan{" "}
                    {PLANS[abonnementActif.plan as "PRO" | "ENTREPRISE"]?.nom ?? "Pro"} actif
                    jusqu&apos;au{" "}
                    {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
                      abonnementActif.expireLe,
                    )}
                    {abonnementActif.annuleLe
                      ? " — renouvellement arrêté, tu gardes tes jours payés"
                      : " — se renouvelle automatiquement à la fin de la période"}
                  </p>
                ) : abonnementEnTete ? (
                  <p className="mt-1 text-legende text-encre">
                    Ton abonnement Premium n&apos;est plus actif. Renouvelle-le en un clic pour
                    retrouver tes avantages.
                  </p>
                ) : (
                  <p className="mt-1 text-legende text-encre">
                        Tu es sur le plan Découverte (gratuit). Passe Premium pour débloquer favoris,
                        listes et assistant illimités, et plus encore.
                  </p>
                )}
              </div>
            </div>
            {abonnementActif ? (
              <div className="flex shrink-0 items-center gap-2">
                <Badge variante="magenta">
                  <Crown className="size-3.5" aria-hidden /> Premium
                </Badge>
                <Bouton variante="secondaire" taille="sm" asChild>
                  <Link href="/dashboard/abonnement">Gérer mon abonnement</Link>
                </Bouton>
              </div>
            ) : (
              <Bouton taille="sm" asChild className="shrink-0">
                <Link href="/dashboard/abonnement#plans">
                  {abonnementEnTete ? "Renouveler Premium" : "Voir les plans"}
                </Link>
              </Bouton>
            )}
          </div>
        </Carte>

        {/* Badges / gamification */}
        <Carte className="animate-apparition-haut delai-3 mt-8 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-h3 font-semibold">Tes badges</h2>
            <Badge variante="source">Niveau : {palier.nom}</Badge>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
            {badges.map((b) => (
              <div
                key={b.titre}
                title={b.description}
                className={`flex w-36 shrink-0 flex-col items-center gap-2 rounded-carte border p-4 text-center ${
                  b.obtenu ? "border-sky-500 bg-sky-500/5" : "border-bordure bg-gris/60 opacity-60"
                }`}
              >
                <span
                  className={`grid size-10 place-items-center rounded-full ${
                    b.obtenu ? "bg-sky-500 text-white" : "bg-white text-encre"
                  }`}
                >
                  {b.obtenu ? <b.icone className="size-5" aria-hidden /> : <Lock className="size-4" aria-hidden />}
                </span>
                <p className="font-titre text-[13px] leading-4 font-semibold">{b.titre}</p>
                <p className="text-[11px] leading-4 text-encre">{b.description}</p>
              </div>
            ))}
          </div>
        </Carte>

        {/* Mon profil */}
        <Carte className="animate-apparition-haut delai-4 mt-8 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-h3 font-semibold">Mon profil</h2>
            <Bouton variante="secondaire" taille="sm" asChild>
              <Link href="/assistant">Refaire le diagnostic</Link>
            </Bouton>
          </div>
          <FormulaireProfil
            nomInitial={utilisateur?.name ?? ""}
            objectifInitial={utilisateur?.objectif ?? ""}
            niveauInitial={utilisateur?.niveau ?? ""}
            budgetInitial={utilisateur?.budget ?? ""}
          />
        </Carte>

        {/* Suggestions liées à l'objectif */}
        {utilisateur?.objectif && suggestions.length > 0 ? (
          <section className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-h3 font-semibold">Pour ton objectif « {utilisateur.objectif} »</h2>
                {premium && (
                  <Badge variante="magenta">
                    <Crown className="size-3.5" aria-hidden /> Priorité Premium · le double
                  </Badge>
                )}
              </div>
              <Link
                href="/outils"
                className="inline-flex min-h-11 items-center gap-1 text-[15px] leading-5 font-semibold text-sky-500 hover:underline"
              >
                Voir l'annuaire <ChevronRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {suggestions.map((o, index) => (
                <Carte
                  key={o.id}
                  className="animate-apparition-haut survol-carte p-5"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <LogoOutil nom={o.nom} logo={o.logo} />
                    <div className="min-w-0">
                      <Link
                        href={`/outil/${o.slug}`}
                        className="font-titre text-[17px] leading-6 font-semibold hover:text-sky-500"
                      >
                        {o.nom}
                      </Link>
                      <p className="text-legende text-encre">
                        {o.gratuit ? "Version gratuite disponible" : o.tarif}
                      </p>
                    </div>
                  </div>
                  <p className="mesure mt-3 line-clamp-2 text-[14px] leading-5 text-encre">{o.description}</p>
                  <Link
                    href={`/outil/${o.slug}`}
                    className="mt-3 inline-flex min-h-9 items-center gap-1 text-[14px] leading-5 font-semibold text-sky-500 hover:underline"
                  >
                    Découvrir <ChevronRight className="size-4" aria-hidden />
                  </Link>
                </Carte>
              ))}
            </div>
          </section>
        ) : (
          <Carte className="mt-8 flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <h2 className="font-titre text-[17px] leading-6 font-semibold">Personnalise tes recommandations</h2>
              <p className="mt-1 text-legende text-encre">
                Indique ton objectif ci-dessus ou lance le diagnostic : le dashboard t'orientera vers les bons outils.
              </p>
            </div>
            <Bouton variante="secondaire" asChild>
              <Link href="/assistant">
                <Sparkles aria-hidden /> Faire le diagnostic
              </Link>
            </Bouton>
          </Carte>
        )}

        {/* Accès anticipé aux nouveautés (plan Entreprise) */}
        {planEntreprise && nouveauxEntreprise.length > 0 && (
          <section className="mt-10">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-h3 font-semibold">Accès anticipé aux nouveautés</h2>
              <Badge variante="magenta">
                <Crown className="size-3.5" aria-hidden /> Entreprise
              </Badge>
            </div>
            <p className="mesure mt-1 text-legende text-encre">
              Les outils tout juste ajoutés à l&apos;annuaire : tu les vois ici en premier,
              avant leur passage à la une.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {nouveauxEntreprise.map((o, index) => (
                <Carte
                  key={o.id}
                  className="animate-apparition-haut survol-carte p-5"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <LogoOutil nom={o.nom} logo={o.logo} />
                    <div className="min-w-0">
                      <Link
                        href={`/outil/${o.slug}`}
                        className="font-titre text-[17px] leading-6 font-semibold hover:text-sky-500"
                      >
                        {o.nom}
                      </Link>
                      <p className="text-legende text-encre">
                        {o.gratuit ? "Version gratuite disponible" : o.tarif}
                      </p>
                    </div>
                  </div>
                  <p className="mesure mt-3 line-clamp-2 text-[14px] leading-5 text-encre">{o.description}</p>
                  <Link
                    href={`/outil/${o.slug}`}
                    className="mt-3 inline-flex min-h-9 items-center gap-1 text-[14px] leading-5 font-semibold text-sky-500 hover:underline"
                  >
                    Découvrir <ChevronRight className="size-4" aria-hidden />
                  </Link>
                </Carte>
              ))}
            </div>
          </section>
        )}

        {/* Vu récemment (version compacte) */}
        <VuRecemment variante="compacte" />

        {/* Recommandations de l'assistant */}
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-h3 font-semibold">Dernières recommandations de l'assistant</h2>
            <Link
              href="/assistant"
              className="inline-flex min-h-11 items-center gap-1 text-[15px] leading-5 font-semibold text-sky-500 hover:underline"
            >
              Ouvrir l'assistant <Sparkles className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-4 grid gap-3">
            {recommandations.map((r) => {
              let outilsReco: { slug: string; nom: string }[] = [];
              try {
                outilsReco = r.mode === "guide" ? JSON.parse(r.reponse) : [];
              } catch {
                /* réponse texte */
              }
              return (
                <Carte key={r.id} className="p-5">
                  <p className="flex flex-wrap items-center gap-2 text-legende text-encre">
                    {formateurDate.format(r.createdAt)}
                    <Badge>{r.mode === "guide" ? "Diagnostic guidé" : "Conversation"}</Badge>
                  </p>
                  {outilsReco.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {outilsReco.map((o) => (
                        <li key={o.slug}>
                          <Link
                            href={`/outil/${o.slug}`}
                            className="inline-flex rounded-full border border-sky-500 bg-sky-500/5 px-3 py-1 text-[13px] leading-4 font-medium text-sky-500 hover:bg-sky-500/10"
                          >
                            {o.nom}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mesure mt-2 line-clamp-3 text-[14px] leading-5 text-encre">{r.reponse}</p>
                  )}
                </Carte>
              );
            })}
            {recommandations.length === 0 && (
              <Carte className="p-6 text-encre">
                L'assistant ne t'a encore rien recommandé.{" "}
                <Link href="/assistant" className="font-semibold text-sky-500 hover:underline">
                  Lance-le ici
                </Link>
                .
              </Carte>
            )}
          </div>
        </section>

        {/* Raccourcis */}
        <section className="mt-10" aria-label="Raccourcis">
          <h2 className="text-h3 font-semibold">Aller plus loin</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/outils", titre: "Explorer l'annuaire", texte: "Parcourir tous les outils", icone: Compass },
              { href: "/comparer", titre: "Comparer des outils", texte: "Mettre tes préférés côte à côte", icone: ArrowLeftRight },
              { href: "/populaires", titre: "Top populaires", texte: "Les outils les plus recommandés", icone: ThumbsUp },
              { href: "/proposer", titre: "Proposer un outil", texte: "Partager une pépite IA", icone: Plus },
            ].map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="survol-carte group flex items-start gap-3 rounded-carte border border-bordure bg-white p-5 shadow-carte"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-champ bg-[linear-gradient(120deg,rgba(106,59,255,0.12),rgba(0,209,255,0.14))] text-sky-500 transition-transform duration-300 group-hover:scale-110">
                  <r.icone className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-titre text-[16px] leading-5 font-semibold group-hover:text-sky-500">
                    {r.titre}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-4 text-encre">{r.texte}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </>
    );
  }

  /* ══════════════ ONGLET FAVORIS ══════════════ */
  if (ongletActif === "favoris") {
    const [favoris, listesPourAjout] = await Promise.all([
      prisma.favorite.findMany({
        where: statutFiltre ? { userId, statut: statutFiltre } : { userId },
        include: {
          tool: {
            include: { categories: { select: { categorie: { select: { nom: true, slug: true } } } } },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.list.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { id: true, nom: true },
      }),
    ]);

    contenu = (
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-h3 font-semibold">
            Mes favoris ({favoris.length})
            {!premium && (
              <span className="ml-3 inline-flex items-center rounded-full border border-bordure bg-white px-3 py-1 align-middle text-[12px] leading-4 font-semibold text-encre">
                {nbFavoris} / {LIMITES_DECOUVERTE.favoris} · plan Découverte
              </span>
            )}
          </h2>
          {/* Export PDF RÉEL : télécharge un PDF de la sélection (avec notes + statuts) */}
          <BoutonExportPdf
            titre="Mes favoris Webgiverse"
            sousTitre={`Sélection de ${prenom || "membre"} — espace personnel Webgiverse`}
            fichier="mes-favoris-webgiverse"
            libelle="Exporter en PDF"
            outils={favoris.map((f) => ({
              nom: f.tool.nom,
              description: f.tool.description,
              tarif: f.tool.tarif,
              slug: f.tool.slug,
              gratuit: f.tool.gratuit,
              note: f.note,
              statut: f.statut,
            }))}
          />
        </div>

        {/* Filtres par statut */}
        <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par statut">
          {[
            { cle: "", libelle: "Tous" },
            { cle: "A_TESTER", libelle: "À tester" },
            { cle: "EN_COURS", libelle: "En cours" },
            { cle: "ADOPTE", libelle: "Adopté" },
          ].map((f) => {
            const actif = f.cle === (statutFiltre ?? "");
            return (
              <Link
                key={f.libelle}
                href={f.cle ? `/dashboard?onglet=favoris&statut=${f.cle}` : "/dashboard?onglet=favoris"}
                aria-current={actif ? "true" : undefined}
                className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-[13px] leading-4 font-medium transition ${
                  actif ? "border-sky-500 bg-sky-500/10 text-sky-500" : "border-bordure bg-white text-encre hover:border-sky-500"
                }`}
              >
                {f.libelle}
              </Link>
            );
          })}
        </div>

        {/* Bandeau limite du plan Découverte : 20 favoris maximum */}
        {!premium && nbFavoris >= LIMITES_DECOUVERTE.favoris && (
          <div className="animate-apparition-haut mt-4 flex flex-wrap items-center justify-between gap-3 rounded-carte border border-sky-500/30 bg-sky-500/5 p-4">
            <p className="min-w-0 text-[14px] leading-5 text-bleu">
              Tu as atteint la limite de{" "}
              <strong>{LIMITES_DECOUVERTE.favoris} favoris</strong> du plan
              Découverte. Retire un favori ou passe Premium pour en ajouter
              sans limite.
            </p>
            <Link
              href="/dashboard/abonnement#plans"
              className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-sky-500 px-4 text-[13px] leading-4 font-bold text-white transition hover:bg-sky-500-clair"
            >
              Passer Premium <Crown className="ml-1.5 size-4" aria-hidden />
            </Link>
          </div>
        )}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {favoris.map((f) => (
            <Carte key={f.id} className="p-5">
              <div className="flex items-start gap-3">
                <LogoOutil nom={f.tool.nom} logo={f.tool.logo} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/outil/${f.tool.slug}`}
                    className="font-titre text-[17px] leading-6 font-semibold hover:text-sky-500"
                  >
                    {f.tool.nom}
                  </Link>
                  <p className="text-legende text-encre">
                    {f.tool.categories[0]?.categorie.nom ?? "Outil"}
                    {f.tool.gratuit ? " · version gratuite" : ` · ${f.tool.tarif}`}
                  </p>
                </div>
                <form action={supprimerFavoriFormulaire}>
                  <input type="hidden" name="favoriId" value={f.id} />
                  <BoutonConfirmer
                    type="submit"
                    message={`Retirer ${f.tool.nom} des favoris ?`}
                    aria-label={`Retirer ${f.tool.nom} des favoris`}
                    className="grid size-9 place-items-center rounded-full text-encre hover:bg-gris hover:text-red-600"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </BoutonConfirmer>
                </form>
              </div>
              <div className="mt-4">
                <SelecteurStatut favoriId={f.id} statut={f.statut} />
              </div>
              <div className="mt-4">
                <EditeurNote favoriId={f.id} note={f.note} />
              </div>
              <form
                action={ajouterDansListeFormulaire}
                className="mt-4 flex items-center gap-2 border-t border-bordure pt-4"
              >
                <input type="hidden" name="toolId" value={f.tool.id} />
                <select
                  name="listeId"
                  aria-label={`Ajouter ${f.tool.nom} à une liste`}
                  defaultValue=""
                  className={`${STYLE_SELECT} flex-1`}
                >
                  <option value="">Ajouter à une liste…</option>
                  {listesPourAjout.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nom}
                    </option>
                  ))}
                </select>
                <Bouton variante="fantome" taille="sm" type="submit">
                  OK
                </Bouton>
              </form>
            </Carte>
          ))}
          {favoris.length === 0 && (
            <Carte className="p-8 text-center lg:col-span-2">
              <p className="text-encre">
                {statutFiltre
                  ? "Aucun favori avec ce statut. Change de filtre ou ajoute de nouveaux outils."
                  : "Aucun favori pour l'instant. Explore l'annuaire et garde tes découvertes sous la main."}
              </p>
              <Bouton className="mt-4" asChild>
                <Link href="/outils">
                  Explorer l'annuaire <ChevronRight aria-hidden />
                </Link>
              </Bouton>
            </Carte>
          )}
        </div>
      </section>
    );
  }

  /* ══════════════ ONGLET MES LISTES ══════════════ */
  if (ongletActif === "listes") {
    const listes = await prisma.list.findMany({
      where: { userId },
      include: { items: { include: { tool: true } } },
      orderBy: { createdAt: "asc" },
    });

    contenu = (
      <section className="mt-8">
        <h2 className="text-h3 font-semibold">
          Mes listes ({listes.length})
          {!premium && (
            <span className="ml-3 inline-flex items-center rounded-full border border-bordure bg-white px-3 py-1 align-middle text-[12px] leading-4 font-semibold text-encre">
              {nbListes} / {LIMITES_DECOUVERTE.listes} · plan Découverte
            </span>
          )}
        </h2>
        <p className="mt-1 text-legende text-encre">
          Regroupe tes outils par projet, par client ou par objectif — et partage une liste en public si tu veux.
        </p>

        {/* Bandeau limite du plan Découverte : 10 listes maximum
            (affiché aussi quand l'action renvoie ?message=limite-listes) */}
        {!premium && (message === "limite-listes" || nbListes >= LIMITES_DECOUVERTE.listes) && (
          <div className="animate-apparition-haut mt-4 flex flex-wrap items-center justify-between gap-3 rounded-carte border border-sky-500/30 bg-sky-500/5 p-4">
            <p className="min-w-0 text-[14px] leading-5 text-bleu">
              Limite du plan Découverte atteinte :{" "}
              <strong>{LIMITES_DECOUVERTE.listes} listes maximum</strong>. Passe
              Premium pour créer des listes sans limite.
            </p>
            <Link
              href="/dashboard/abonnement#plans"
              className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-sky-500 px-4 text-[13px] leading-4 font-bold text-white transition hover:bg-sky-500-clair"
            >
              Passer Premium <Crown className="ml-1.5 size-4" aria-hidden />
            </Link>
          </div>
        )}

        <form action={creerListeFormulaire} className="mt-4 flex flex-wrap gap-2">
          <input
            name="nom"
            placeholder="Nom de la liste (ex. « Boîte à outils client X »)"
            aria-label="Nom de la nouvelle liste"
            required
            minLength={2}
            maxLength={60}
            className="min-h-11 w-full max-w-sm flex-1 rounded-champ border border-bordure bg-white px-4 text-[15px] leading-5 focus:border-sky-500 focus:outline-none"
          />
          <Bouton variante="secondaire" type="submit">
            <Plus aria-hidden /> Créer la liste
          </Bouton>
        </form>

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {listes.map((liste) => (
            <Carte key={liste.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-titre text-[17px] leading-6 font-semibold">
                  <ListChecks className="mr-1 inline size-4 text-sky-500" aria-hidden />
                  {liste.nom}
                  <span className="ml-2 text-[12px] leading-4 font-normal text-encre">
                    {liste.items.length} outil{liste.items.length > 1 ? "s" : ""}
                  </span>
                </h3>
                <form action={supprimerListeFormulaire}>
                  <input type="hidden" name="listeId" value={liste.id} />
                  <BoutonConfirmer
                    type="submit"
                    message={`Supprimer la liste « ${liste.nom} » ?`}
                    aria-label={`Supprimer la liste ${liste.nom}`}
                    className="grid size-9 place-items-center rounded-full text-encre hover:bg-gris hover:text-red-600"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </BoutonConfirmer>
                </form>
              </div>
              <ul className="mt-3 grid gap-1.5">
                {liste.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 text-[15px] leading-5">
                    <Link
                      href={`/outil/${item.tool.slug}`}
                      className="min-h-9 py-1.5 font-medium text-sky-500 hover:underline"
                    >
                      {item.tool.nom}
                    </Link>
                    <form action={retirerDeListeFormulaire}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <button
                        type="submit"
                        aria-label={`Retirer ${item.tool.nom} de la liste`}
                        className="grid size-9 place-items-center rounded-full text-encre hover:text-red-600"
                      >
                        ×
                      </button>
                    </form>
                  </li>
                ))}
                {liste.items.length === 0 && (
                  <li className="text-[14px] leading-5 text-encre">
                    Liste vide — ajoute des outils depuis tes favoris.
                  </li>
                )}
              </ul>
              <form action={renommerListeFormulaire} className="mt-4 border-t border-bordure pt-4">
                <input type="hidden" name="listeId" value={liste.id} />
                <p className="flex items-center gap-1.5 text-[12px] leading-4 font-semibold uppercase tracking-wide text-encre">
                  <Pencil className="size-3.5 text-sky-500" aria-hidden /> Renommer la liste
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    name="nom"
                    defaultValue={liste.nom}
                    required
                    minLength={2}
                    maxLength={60}
                    aria-label={`Nouveau nom pour la liste ${liste.nom}`}
                    className="min-h-11 flex-1 rounded-champ border border-bordure bg-white px-3 text-[14px] leading-5 focus:border-sky-500 focus:outline-none"
                  />
                  <Bouton variante="secondaire" taille="sm" type="submit">
                    <Pencil aria-hidden />
                  </Bouton>
                </div>
              </form>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-bordure pt-4">
                <BoutonPartageListe listeId={liste.id} />
                <form action={supprimerListeFormulaire}>
                  <input type="hidden" name="listeId" value={liste.id} />
                  <BoutonConfirmer
                    type="submit"
                    message={`Supprimer la liste « ${liste.nom} » définitivement ?`}
                    aria-label={`Supprimer la liste ${liste.nom}`}
                    className="inline-flex min-h-11 items-center gap-2 px-4 text-[14px] leading-5 font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 aria-hidden /> Supprimer
                  </BoutonConfirmer>
                </form>
              </div>
            </Carte>
          ))}
          {listes.length === 0 && (
            <Carte className="p-8 text-center md:col-span-2 lg:col-span-3">
              <p className="text-encre">
                Aucune liste pour l'instant. Crée ta première liste ci-dessus, puis ajoute des outils depuis l'onglet Favoris.
              </p>
            </Carte>
          )}
        </div>
      </section>
    );
  }

  /* ══════════════ ONGLET MES AVIS ══════════════ */
  if (ongletActif === "avis") {
    // Récupération RÉELLE des avis de l'utilisateur depuis la base.
    let mesAvis: {
      id: string;
      note: number;
      contenu: string;
      majLe: Date;
      outil: { nom: string; slug: string; logo: string | null };
    }[] = [];

    try {
      const delegueAvis = (prisma as any).avis;
      if (!delegueAvis?.findMany) {
        console.error(
          "[dashboard] Le client Prisma ne contient pas le modèle Avis. Arrête le serveur (Ctrl+C) puis lance : npx prisma generate."
        );
      } else {
        mesAvis = await delegueAvis.findMany({
          where: { utilisateurId: userId },
          include: { outil: { select: { nom: true, slug: true, logo: true } } },
          orderBy: { majLe: "desc" },
        });
      }
    } catch (error) {
      console.error("[dashboard] Impossible de charger tes avis :", error);
    }

    const moyenne = mesAvis.length
      ? (mesAvis.reduce((somme, a) => somme + a.note, 0) / mesAvis.length).toFixed(1)
      : null;

    contenu = (
      <section className="mt-8">
        <h2 className="text-h3 font-semibold">Mes avis ({mesAvis.length})</h2>
        <p className="mt-1 text-legende text-encre">
          {moyenne
            ? `Ta note moyenne : ${moyenne}/5 — merci pour la communauté !`
            : "Partage ton expérience : chaque avis aide les autres à choisir."}
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {mesAvis.map((a) => (
            <Carte key={a.id} className="p-5">
              <div className="flex items-start gap-3">
                <LogoOutil nom={a.outil.nom} logo={a.outil.logo} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/outil/${a.outil.slug}`}
                    className="font-titre text-[17px] leading-6 font-semibold hover:text-sky-500"
                  >
                    {a.outil.nom}
                  </Link>
                  <p className="text-legende text-encre">
                    Dernière mise à jour : {formateurDate.format(a.majLe)}
                  </p>
                </div>
                <form action={supprimerAvisFormulaire}>
                  <input type="hidden" name="avisId" value={a.id} />
                  <BoutonConfirmer
                    type="submit"
                    message={`Supprimer ton avis sur ${a.outil.nom} ?`}
                    aria-label={`Supprimer ton avis sur ${a.outil.nom}`}
                    className="grid size-9 place-items-center rounded-full text-encre hover:bg-gris hover:text-red-600"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </BoutonConfirmer>
                </form>
              </div>
              <div className="mt-4">
                <EditeurAvis avisId={a.id} noteInitiale={a.note} contenuInitial={a.contenu} />
              </div>
            </Carte>
          ))}
          {mesAvis.length === 0 && (
            <Carte className="p-8 text-center lg:col-span-2">
              <p className="text-encre">
                Tu n'as pas encore publié d'avis. Va sur la fiche d'un outil que tu utilises et raconte ton expérience.
              </p>
              <Bouton className="mt-4" asChild>
                <Link href="/outils">
                  Choisir un outil <ChevronRight aria-hidden />
                </Link>
              </Bouton>
            </Carte>
          )}
        </div>
      </section>
    );
  }

  /* ══════════════ ONGLET ACTIVITÉ ══════════════ */
  if (ongletActif === "activite") {
    let activites: { id: string; type: string; details: string | null; creeLe: Date }[] = [];
    try {
      activites = await prisma.activiteUtilisateur.findMany({
        where: { utilisateurId: userId },
        orderBy: { creeLe: "desc" },
        // Historique d'activité étendu (plan Entreprise) : 200 entrées au
        // lieu de 25 — promesse affichée sur /tarifs et dans lib/plans.ts.
        take: planEntreprise ? 200 : 25,
      });
    } catch (error) {
      console.error("[dashboard] Journal d'activité indisponible :", error);
    }
    const nbConversations = await prisma.conversation.count({
      where: { utilisateurId: userId },
    });

    contenu = (
      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Conversations avec l'assistant */}
        <div className="grid content-start gap-4">
          <Carte className="p-5">
            <h2 className="font-titre text-[17px] leading-6 font-semibold">Tes conversations IA</h2>
            <p className="mt-2 font-titre text-[32px] leading-10 font-bold">{nbConversations}</p>
            <p className="text-legende text-encre">conversations avec l'assistant</p>
            <Bouton variante="secondaire" taille="sm" className="mt-4" asChild>
              <Link href="/assistant">
                <Sparkles aria-hidden /> Continuer
              </Link>
            </Bouton>
          </Carte>
          <Carte className="p-5">
            <h2 className="font-titre text-[17px] leading-6 font-semibold">Rappel</h2>
            <ul className="mt-3 grid gap-2 text-[14px] leading-5 text-encre">
              <li>⭐ Ajoute un outil en favori depuis n'importe quelle carte.</li>
              <li>📝 Publie un avis pour aider la communauté.</li>
              <li>👍 Vote pour recommander tes outils préférés.</li>
              <li>✅ Marque tes favoris « Adoptés » quand tu les valides.</li>
            </ul>
          </Carte>
        </div>

        {/* Journal d'activité */}
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-h3 font-semibold">Journal d&apos;activité</h2>
            {planEntreprise ? (
              <Badge variante="magenta">
                <Crown className="size-3.5" aria-hidden /> Étendu · 200 entrées
              </Badge>
            ) : (
              <Badge variante="source">Les 25 dernières</Badge>
            )}
          </div>
          <div className="mt-4 grid gap-2.5">
            {activites.map((a) => {
              const meta = ICONES_ACTIVITE[a.type] ?? { icone: History, libelle: "Activité" };
              return (
                <Carte key={a.id} className="flex items-center gap-3 p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-champ bg-gris text-sky-500">
                    <meta.icone className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-5 font-semibold">{meta.libelle}</p>
                    {a.details && (
                      <p className="truncate text-[13px] leading-4 text-encre">
                        {formaterDetails(a.type, a.details)}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 text-[12px] leading-4 text-encre">
                    {formateurDate.format(a.creeLe)}
                  </p>
                </Carte>
              );
            })}
            {activites.length === 0 && (
              <Carte className="p-6 text-encre">
                Aucune activité enregistrée pour le moment. Ajoute un favori, publie un avis ou discute avec
                l'assistant : tout apparaîtra ici automatiquement.
              </Carte>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
        <div className="mx-auto w-full max-w-7xl px-4 py-10 lg:py-12">
      {enTete}
      {contenu}
    </div>
  );
}