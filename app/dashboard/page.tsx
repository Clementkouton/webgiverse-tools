// app/dashboard/page.tsx
// ─────────────────────────────────────────────────────────────────
// MON ESPACE — tableau de bord utilisateur, ACCUEIL ÉPURÉ (lot 53).
// LOT 60 — onglet « Mes listes » redessiné (même charte, aucune
// couleur ni composant nouveau) :
//   · cartes plus larges : 2 colonnes en desktop, 3 sur grand écran
//     (elles étaient écrasées sur 3 colonnes dès 1024 px) ;
//   · en-tête de carte : pastille initiales en dégradé (comme les
//     logos d'outils), nom sur UNE ligne (truncate), date de création
//     en dessous, badge compteur violet/gris à droite — fini le
//     titre écrasé par « 0 outil » collé à la fin du nom ;
//   · outils affichés avec leur logo (LogoOutil), rangées douces au
//     survol, 6 visibles puis « + N autres » si la liste est longue ;
//   · état vide en encadré pointillés avec lien direct vers les
//     favoris (au lieu d'une phrase grise perdue) ;
//   · renommage REPLIÉ par défaut (formulaire natif <details>, sans
//     JavaScript nouveau) au lieu du bloc toujours déployé ;
//   · UN SEUL bouton Supprimer (pill rouge en bas) — le bouton rond
//     en doublon en haut à droite disparaît ;
//   · le partage public reste en bas de carte (composant intact).
// 5 onglets : Aperçu / Favoris / Mes listes / Mes avis / Activité.
// Navigation par paramètre d'URL (?onglet=…) : tout reste côté
// serveur, aucune donnée ne se charge inutilement.
//
// Lot 53 — l'aperçu fait DÉCOUVRIR LES 4 ÉLÉMENTS du site, chacun
// avec sa propre section et son accès direct :
//   · « L'univers en chiffres » : statistique générale des 4 éléments
//     (outils, tutoriels, prompts, skills) — 4 tuiles cliquables juste
//     sous la checklist, pour donner envie d'explorer chaque univers ;
//   · « Mes outils »      : favoris récents AVEC détails (catégorie,
//     tarif, statut, note, description) — remplace le tableau sec ;
//   · « Tutoriels vidéo » : reprendre les tutos en cours, sinon les
//     recommandés de la collection ;
//   · « Prompts IA »      : derniers prompts sauvegardés, sinon les
//     plus populaires de la bibliothèque ;
//   · « Skills IA »       : skills épinglées (+ retours d'usage) pour
//     les abonnés Premium, invitation à s'abonner sinon — la section
//     skills apparaît enfin sur la page d'accueil du dashboard.
// La checklist d'onboarding (« Bienvenue à bord 🚀 »), les 6 cartes
// statistiques, les graphiques et les rappels restent en place.
// Le reste vit déjà là où il est :
//   · Mes prompts (gestion) → /dashboard/prompts ;
//   · Mes tutoriels         → /dashboard/tutoriels ;
//   · Mes skills            → /dashboard/skills-favoris ;
//   · Mon abonnement        → /dashboard/abonnement ;
//   · Médailles, Vu récemment, Recommandations de l'assistant
//     → onglet « Activité » de cette même page.
// Tout est DÉFENSIF : si une table n'existe pas encore en base
// (migration SQL non passée), la section reste affichable — jamais de crash.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeftRight,
  CheckCircle2,
  ChevronRight,
  Compass,
  Crown,
  Bot,
  Flame,
  History,
  LayoutDashboard,
  ListChecks,
  Loader,
  Lock,
  MessageSquareQuote,
  MonitorPlay,
  Pencil,
  Plus,
  Search,
  Share2,

  Star,
  TerminalSquare,
  ThumbsUp,
  Trash2,
  User,
  X,
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
import { CarteStatistique } from "@/components/dashboard/carte-statistique";
import { GraphiqueActivite } from "@/components/dashboard/graphique-activite";
import { GraphiqueRepartition } from "@/components/dashboard/graphique-repartition";
// Lot 20 — engagement & rétention
import { calculerOnboarding, calculerStreak } from "@/lib/engagement";
import { synchroniserNotificationsTutos } from "@/lib/notifications";
import { ChecklistOnboarding } from "@/components/dashboard/checklist-onboarding";
import { CarteRappelsATester } from "@/components/dashboard/carte-rappels-a-tester";
// Lot 53 — cartes réutilisées des bibliothèques (style identique au site)
import { CarteTuto } from "@/components/tutoriels/carte-tuto";
import { CartePrompt } from "@/components/prompts/carte-prompt";
import { CarteSkill } from "@/components/skills/carte-skill";
import type { Skill, Tuto } from "@prisma/client";

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

const ICONES_ACTIVITE: Record<string, { icone: LucideIcon; libelle: string }> = {
  favori: { icone: Star, libelle: "Favoris" },
  assistant: { icone: Bot, libelle: "Assistant IA" },
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

// Lot 60 — date de création courte pour les cartes de listes (« 4 novembre 2026 »).
const formateurDateListe = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
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

  // ── Lot 20 — activité des 60 derniers jours (streak + graphique) ──
  const debutStreak = new Date();
  debutStreak.setHours(0, 0, 0, 0);
  debutStreak.setDate(debutStreak.getDate() - 59);
  let activitesRecents: { creeLe: Date }[] = [];
  try {
    activitesRecents = await prisma.activiteUtilisateur.findMany({
      where: { utilisateurId: userId, creeLe: { gte: debutStreak } },
      select: { creeLe: true },
    });
  } catch {
    /* journal indisponible : graphique à zéro, streak à 0 */
  }
  const streak = calculerStreak(activitesRecents.map((a) => a.creeLe));

  // ── Abonnement (chargé une seule fois pour l'en-tête) ──────────
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
    { titre: "Collectionneur pro", description: "10 favoris", obtenu: nbFavoris >= 10, icone: Star },
    { titre: "Testeur actif", description: "3 outils en cours", obtenu: nbEnCours >= 3, icone: Loader },
    { titre: "Fidèle au poste", description: "3 outils adoptés", obtenu: nbAdoptes >= 3, icone: CheckCircle2 },
    { titre: "Premier avis", description: "1 avis publié", obtenu: nbAvis >= 1, icone: MessageSquareQuote },
    { titre: "Grand critique", description: "5 avis publiés", obtenu: nbAvis >= 5, icone: MessageSquareQuote },
    { titre: "Organisateur", description: "1 liste créée", obtenu: nbListes >= 1, icone: ListChecks },
    { titre: "Voix qui compte", description: "5 votes donnés", obtenu: nbVotes >= 5, icone: ThumbsUp },
    // Lot 20 — nouveaux badges de rétention
    { titre: "Apprenant assidu", description: "5 tutoriels terminés", obtenu: nbTutosTermines >= 5, icone: MonitorPlay },
    { titre: "Série en feu", description: "7 jours d'affilée", obtenu: streak >= 7, icone: Flame },
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

  /* ══════════════ ONGLET APERÇU (épuré — lot 53) ══════════════ */
  if (ongletActif === "apercu") {
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

    // ── Données du tableau de bord (style Metis) — toutes défensives :
    //    si une table est absente ou vide, l'aperçu reste affichable. ──
    // (Lot 20 : les activités des 60 derniers jours sont déjà chargées
    // dans l'en-tête commun pour le streak — on filtre ici la semaine.)
    const debutSemaine = new Date();
    debutSemaine.setHours(0, 0, 0, 0);
    debutSemaine.setDate(debutSemaine.getDate() - 6);
    const activites7j = activitesRecents.filter((a) => a.creeLe >= debutSemaine);
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

    // ── Lot 20 — checklist d'onboarding (jauge de complétion) ──
    const nbRecommandations = await prisma.recommendation
      .count({ where: { userId } })
      .catch(() => 0);
    const onboarding = calculerOnboarding({
      objectif: utilisateur?.objectif ?? null,
      niveau: utilisateur?.niveau ?? null,
      budget: utilisateur?.budget ?? null,
      nbFavoris,
      nbAvis,
      nbTutosTermines,
      nbRecommandations,
      nbListes,
    });

    // ── Lot 20 — rappels « À tester » : favoris restés en attente
    //    depuis 30 jours ou plus (on relance la découverte) ──
    const ilYa30Jours = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const enAttenteLongtemps = await prisma.favorite
      .findMany({
        where: { userId, statut: "A_TESTER", createdAt: { lt: ilYa30Jours } },
        orderBy: { createdAt: "asc" },
        take: 5,
        select: { createdAt: true, tool: { select: { nom: true, slug: true } } },
      })
      .catch(() => []);
    const outilsEnAttente = enAttenteLongtemps.map((f) => ({
      nom: f.tool.nom,
      slug: f.tool.slug,
      jours: Math.max(30, Math.floor((Date.now() - f.createdAt.getTime()) / (24 * 60 * 60 * 1000))),
    }));

    // 🔔 Lot 20 — détecte les nouveaux tutoriels correspondant aux
    // catégories des outils en favori et crée les notifications.
    await synchroniserNotificationsTutos(userId);

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
      take: 4,
    });

    // ── Lot 53 — Section « Tutoriels vidéo » : on reprend les tutos
    // EN_COURS (triés par rang), puis on complète avec les tutoriels
    // recommandés non terminés. Défensif : table absente → vide. ──
    let progresTutos: { tutoId: string; statut: string }[] = [];
    let tutosAffiches: Tuto[] = [];
    try {
      progresTutos = prismaProgressionTuto?.findMany
        ? await prismaProgressionTuto
            .findMany({ where: { userId }, select: { tutoId: true, statut: true } })
            .catch(() => [])
        : [];
      const tutosEnCours = progresTutos.filter((p) => p.statut === "EN_COURS");
      const tutosTerminesIds = new Set(
        progresTutos.filter((p) => p.statut === "TERMINE").map((p) => p.tutoId),
      );
      if (tutosEnCours.length > 0) {
        tutosAffiches = await prisma.tuto
          .findMany({
            where: { id: { in: tutosEnCours.map((p) => p.tutoId) } },
            orderBy: { ordre: "asc" },
            take: 3,
          })
          .catch(() => []);
      }
      if (tutosAffiches.length < 3) {
        const exclus = [...tutosTerminesIds, ...tutosAffiches.map((t) => t.id)];
        const complets = await prisma.tuto
          .findMany({
            where: { id: { notIn: exclus } },
            orderBy: [{ ordre: "asc" }, { vues: "desc" }],
            take: 3 - tutosAffiches.length,
          })
          .catch(() => []);
        tutosAffiches = [...tutosAffiches, ...complets];
      }
    } catch {
      tutosAffiches = [];
    }
    const nbTutosEnCours = progresTutos.filter((p) => p.statut === "EN_COURS").length;

    // ── Lot 53 — Section « Prompts IA » : derniers prompts
    // sauvegardés, sinon les plus populaires de la bibliothèque. ──
    type PromptCarte = {
      slug: string;
      titre: string;
      emoji: string;
      description: string;
      type: "TEXTE" | "IMAGE" | "CODE";
      vues: number;
      nouveau: boolean;
      categorie: { nom: string; slug: string } | null;
    };
    const derniersPromptsFavoris: PromptCarte[] = prismaPromptFavori?.findMany
      ? await prismaPromptFavori
          .findMany({
            where: { userId },
            orderBy: { creeLe: "desc" },
            take: 3,
            select: {
              prompt: {
                select: {
                  slug: true,
                  titre: true,
                  emoji: true,
                  description: true,
                  type: true,
                  vues: true,
                  nouveau: true,
                  categorie: { select: { nom: true, slug: true } },
                },
              },
            },
          })
          .then((lignes: { prompt: PromptCarte }[]) => lignes.map((l) => l.prompt))
          .catch(() => [])
      : [];
    const suggestionsPrompts: PromptCarte[] =
      derniersPromptsFavoris.length > 0
        ? []
        : await prisma.prompt
            .findMany({
              orderBy: { vues: "desc" },
              take: 3,
              select: {
                slug: true,
                titre: true,
                emoji: true,
                description: true,
                type: true,
                vues: true,
                nouveau: true,
                categorie: { select: { nom: true, slug: true } },
              },
            })
            .catch(() => []);
    const promptsAffiches =
      derniersPromptsFavoris.length > 0 ? derniersPromptsFavoris : suggestionsPrompts;

    // ── Lot 53 — Section « Skills IA » : skills épinglées + retours
    // d'usage (abonnés Premium seulement, même règle que /skills).
    // DÉFENSIF : si la migration SQL des tables SkillFavori/SkillRetour
    // n'a pas encore été passée dans Neon, tout tombe à zéro sans crash.
    const prismaSkillFavori = (prisma as any).skillFavori;
    const prismaSkillRetour = (prisma as any).skillRetour;
    const prismaSkill = (prisma as any).skill;
    let skillsEpingles: Skill[] = [];
    let nbRetoursSkills = 0;
    if (premium) {
      skillsEpingles = prismaSkillFavori?.findMany
        ? await prismaSkillFavori
            .findMany({
              where: { userId },
              orderBy: { creeLe: "desc" },
              take: 3,
              include: { skill: true },
            })
            .then((lignes: { skill: Skill }[]) => lignes.map((l) => l.skill))
            .catch(() => [])
        : [];
      nbRetoursSkills = prismaSkillRetour?.count
        ? await prismaSkillRetour.count({ where: { userId } }).catch(() => 0)
        : 0;
    }
    const suggestionsSkills: Skill[] =
      premium && skillsEpingles.length === 0 && prismaSkill?.findMany
        ? await prismaSkill
            .findMany({ orderBy: [{ ordre: "asc" }, { popularite: "desc" }], take: 3 })
            .catch(() => [])
        : [];
    const skillsAffichees = skillsEpingles.length > 0 ? skillsEpingles : suggestionsSkills;

    // ── Lot 53 — Statistique générale : l'étendue des 4 éléments du
    // site, pour donner envie d'explorer chaque univers. Défensif :
    // skills (client/tables non régénérés) → 0, jamais de crash. ──
    const nbOutilsSite = await prisma.tool
      .count({ where: { statut: "PUBLIE" } })
      .catch(() => 0);
    const nbTutosSite = await prisma.tuto.count().catch(() => 0);
    const nbPromptsSite = await prisma.prompt.count().catch(() => 0);
    const nbSkillsSite = prismaSkill?.count
      ? await prismaSkill.count().catch(() => 0)
      : 0;

    contenu = (
      <>
        {/* ── Lot 20 — Checklist d'onboarding (jauge de complétion) ── */}
        <div className="mt-8">
          <ChecklistOnboarding onboarding={onboarding} />
        </div>

        {/* ── Lot 53 — Statistique générale : l'univers Webgiverse en
            4 chiffres, chaque tuile mène à son univers. ── */}
        <section aria-label="L'univers Webgiverse en chiffres" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/outils", valeur: nbOutilsSite, libelle: "Outils dans l'annuaire", sousTexte: "Trouve ta pépite IA", icone: Compass },
              { href: "/tutoriels", valeur: nbTutosSite, libelle: "Tutoriels vidéo", sousTexte: "Apprends pas à pas", icone: MonitorPlay },
              { href: "/prompts", valeur: nbPromptsSite, libelle: "Prompts prêts à copier", sousTexte: "Inspire-toi des meilleurs", icone: TerminalSquare },
              { href: "/skills", valeur: nbSkillsSite, libelle: "Skills IA (agents)", sousTexte: "Prêts à l'emploi · Premium", icone: Bot },
            ].map((u) => (
              <Link
                key={u.href}
                href={u.href}
                className="survol-carte group flex items-start gap-3 rounded-carte border border-bordure bg-white p-5 shadow-carte"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-champ bg-[linear-gradient(120deg,rgba(106,59,255,0.12),rgba(0,209,255,0.14))] text-sky-500 transition-transform duration-300 group-hover:scale-110">
                  <u.icone className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-titre text-[22px] leading-7 font-bold text-bleu">
                    {u.valeur}
                  </span>
                  <span className="block text-[14px] leading-5 font-semibold group-hover:text-sky-500">
                    {u.libelle}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-4 text-encre">
                    {u.sousTexte}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Cartes statistiques (style Metis) ───────────────────── */}
        <section aria-label="Mes statistiques" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            icone={Bot}
            teinte="magenta"
            delay={210}
          />
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
        </section>

        {/* ══════ Lot 53 — LES 4 ÉLÉMENTS DU SITE, chacun avec sa section ══════ */}

        {/* ── 1. Mes outils : favoris récents avec détails (remplace
            l'ancien tableau « Derniers favoris », plus riche et plus
            invitant : catégorie, tarif, statut, note, description). ── */}
        <section className="mt-8" aria-label="Mes outils">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-h3 font-semibold">Mes outils</h2>
              <p className="mesure mt-1 text-legende text-encre">
                Tes favoris récents — statut, tarif et détails en un coup d&apos;œil.
              </p>
            </div>
            <Link
              href="/dashboard?onglet=favoris"
              className="text-[13px] leading-4 font-semibold text-sky-500 hover:underline"
            >
              Tout voir →
            </Link>
          </div>
          {derniersFavoris.length > 0 ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {derniersFavoris.map((f, index) => {
                const metaStatut =
                  f.statut === "ADOPTE"
                    ? { libelle: "Adopté", variante: "source" as const }
                    : f.statut === "EN_COURS"
                      ? { libelle: "En cours", variante: "agent" as const }
                      : { libelle: "À tester", variante: "defaut" as const };
                return (
                  <Carte
                    key={f.id}
                    className="animate-apparition-haut survol-carte p-5"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      <LogoOutil nom={f.tool.nom} logo={f.tool.logo} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/outil/${f.tool.slug}`}
                            className="font-titre text-[17px] leading-6 font-semibold hover:text-sky-500"
                          >
                            {f.tool.nom}
                          </Link>
                          <Badge variante={metaStatut.variante}>{metaStatut.libelle}</Badge>
                        </div>
                        <p className="text-legende text-encre">
                          {f.tool.categories[0]?.categorie.nom ?? "Outil"}
                          {f.tool.gratuit ? " · version gratuite" : ` · ${f.tool.tarif}`}
                        </p>
                      </div>
                    </div>
                    <p className="mesure mt-3 line-clamp-2 text-[14px] leading-5 text-encre">
                      {f.tool.description}
                    </p>
                    {f.note && (
                      <p className="mesure mt-2 truncate text-[12px] leading-4 text-encre">
                        Ma note : {f.note}
                      </p>
                    )}
                    <Link
                      href={`/outil/${f.tool.slug}`}
                      className="mt-3 inline-flex min-h-9 items-center gap-1 text-[14px] leading-5 font-semibold text-sky-500 hover:underline"
                    >
                      Ouvrir la fiche <ChevronRight className="size-4" aria-hidden />
                    </Link>
                  </Carte>
                );
              })}
            </div>
          ) : (
            <Carte className="animate-apparition-haut p-8 text-center md:col-span-2">
              <p className="text-[14px] leading-6 text-encre">
                Aucun favori pour le moment. Explore l&apos;annuaire et garde tes
                découvertes ici.
              </p>
              <Bouton variante="secondaire" taille="sm" className="mt-4" asChild>
                <Link href="/outils">Explorer l&apos;annuaire</Link>
              </Bouton>
            </Carte>
          )}
        </section>

        {/* ── 2. Tutoriels vidéo : reprendre les tutos en cours, sinon
            les recommandés de la collection. ───────────────────────── */}
        <section className="mt-8" aria-label="Tutoriels vidéo">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-h3 font-semibold">Tutoriels vidéo</h2>
              <p className="mesure mt-1 text-legende text-encre">
                {nbTutosEnCours > 0
                  ? `Reprends là où tu t'es arrêté : ${nbTutosEnCours} tutoriel${nbTutosEnCours > 1 ? "s" : ""} en cours.`
                  : nbTutosTermines > 0
                    ? `${nbTutosTermines} tutoriel${nbTutosTermines > 1 ? "s" : ""} terminé${nbTutosTermines > 1 ? "s" : ""} — la suite t'attend.`
                    : "Apprends pas à pas avec la collection vidéo, du premier prompt aux workflows avancés."}
              </p>
            </div>
            <Link
              href="/dashboard/tutoriels"
              className="text-[13px] leading-4 font-semibold text-sky-500 hover:underline"
            >
              Tout voir →
            </Link>
          </div>
          {tutosAffiches.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tutosAffiches.map((t, index) => (
                <div
                  key={t.id}
                  className="animate-apparition-haut"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <CarteTuto tuto={t} />
                </div>
              ))}
            </div>
          ) : (
            <Carte className="p-8 text-center">
              <p className="text-[14px] leading-6 text-encre">
                Aucun tutoriel publié pour le moment. La collection vidéo arrive
                ici dès qu&apos;elle est en ligne.
              </p>
              <Bouton variante="secondaire" taille="sm" className="mt-4" asChild>
                <Link href="/tutoriels">Voir les tutoriels</Link>
              </Bouton>
            </Carte>
          )}
        </section>

        {/* ── 3. Prompts IA : derniers prompts sauvegardés, sinon les
            plus populaires de la bibliothèque. ─────────────────────── */}
        <section className="mt-8" aria-label="Prompts IA">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-h3 font-semibold">Prompts IA</h2>
              <p className="mesure mt-1 text-legende text-encre">
                {derniersPromptsFavoris.length > 0
                  ? "Tes derniers prompts sauvegardés, prêts à copier."
                  : "Explore la bibliothèque et sauvegarde tes premiers prompts pour les retrouver ici."}
              </p>
            </div>
            <Link
              href="/dashboard/prompts"
              className="text-[13px] leading-4 font-semibold text-sky-500 hover:underline"
            >
              Tout voir →
            </Link>
          </div>
          {promptsAffiches.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {promptsAffiches.map((p, index) => (
                <div
                  key={p.slug}
                  className="animate-apparition-haut"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <CartePrompt prompt={p} />
                </div>
              ))}
            </div>
          ) : (
            <Carte className="p-8 text-center">
              <p className="text-[14px] leading-6 text-encre">
                Aucun prompt disponible pour le moment. La bibliothèque
                s&apos;étoffe au fil des mises à jour.
              </p>
              <Bouton variante="secondaire" taille="sm" className="mt-4" asChild>
                <Link href="/prompts">Explorer la bibliothèque</Link>
              </Bouton>
            </Carte>
          )}
        </section>

        {/* ── 4. Skills IA : skills épinglées (+ retours d'usage) pour
            les abonnés Premium ; invitation à s'abonner sinon — la
            section skills apparaît enfin sur l'accueil du dashboard. ── */}
        <section className="mt-8" aria-label="Skills IA">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-h3 font-semibold">Skills IA</h2>
              <p className="mesure mt-1 text-legende text-encre">
                {premium
                  ? skillsEpingles.length > 0
                    ? `Tes skills épinglées${nbRetoursSkills > 0 ? ` — ${nbRetoursSkills} retour${nbRetoursSkills > 1 ? "s" : ""} d'usage publié${nbRetoursSkills > 1 ? "s" : ""}` : ""}`
                    : "Épingle des skills depuis la bibliothèque pour les retrouver ici."
                  : "Agents IA prêts à l'emploi — bibliothèque réservée aux abonnés Premium."}
              </p>
            </div>
            {premium && (
              <Link
                href="/dashboard/skills-favoris"
                className="text-[13px] leading-4 font-semibold text-sky-500 hover:underline"
              >
                Tout voir →
              </Link>
            )}
          </div>
          {premium && skillsAffichees.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {skillsAffichees.map((s, index) => (
                <div
                  key={s.id}
                  className="animate-apparition-haut"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <CarteSkill skill={s} />
                </div>
              ))}
            </div>
          ) : premium ? (
            <Carte className="p-8 text-center">
              <p className="text-[14px] leading-6 text-encre">
                Aucune skill épinglée pour l&apos;instant. Explore la bibliothèque et
                épingle ta première compétence.
              </p>
              <Bouton variante="secondaire" taille="sm" className="mt-4" asChild>
                <Link href="/skills">Explorer la bibliothèque</Link>
              </Bouton>
            </Carte>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-carte border border-violet/30 bg-violet/5 p-5">
              <p className="min-w-0 text-[14px] leading-5 text-bleu">
                Les <strong className="font-semibold">skills IA</strong> (agents prêts à
                l&apos;emploi, traduits en français) sont réservées aux abonnés Premium :
                épingle-les et partage tes retours d&apos;usage.
              </p>
              <Bouton asChild taille="sm">
                <Link href="/dashboard/abonnement#plans">
                  Passer Premium <Crown className="ml-1.5 size-4" aria-hidden />
                </Link>
              </Bouton>
            </div>
          )}
        </section>


        {/* ── Graphiques : activité 7 jours + favoris par statut ──── */}
        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <Carte className="animate-apparition-haut p-6 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">Mon activité</h2>
              <div className="flex flex-wrap items-center gap-2">
                {/* Lot 20 — 🔥 streak : jours consécutifs d'activité */}
                {streak > 0 && (
                  <span
                    title={`${streak} jour${streak > 1 ? "s" : ""} consécutif${streak > 1 ? "s" : ""} d'activité`}
                    className="inline-flex items-center gap-1 rounded-full bg-[linear-gradient(100deg,#6a3bff,#8f6bff)] px-2.5 py-0.5 text-[12px] leading-4 font-bold text-white"
                  >
                    🔥 {streak} jour{streak > 1 ? "s" : ""} d'affilée
                  </span>
                )}
                <Badge variante="defaut">7 derniers jours</Badge>
              </div>
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

        {/* ── Lot 20 — Rappels « À tester » (30 jours et plus) ────── */}
        <div className="mt-6">
          <CarteRappelsATester outils={outilsEnAttente} />
        </div>

        {/* Lot 53 : l'ancien tableau « Derniers favoris » est remplacé
            par la section « Mes outils » détaillée, plus haut dans
            l'aperçu (voir LES 4 ÉLÉMENTS DU SITE). */}

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
            className="min-h-11 w-full max-w-xl flex-1 rounded-champ border border-bordure bg-white px-4 text-[15px] leading-5 focus:border-sky-500 focus:outline-none"
          />
          <Bouton variante="primaire" type="submit">
            <Plus aria-hidden /> Créer la liste
          </Bouton>
        </form>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {listes.map((liste) => {
            // Pastille initiales : même génération que LogoOutil.
            const initiales =
              liste.nom
                .split(/[\s:.-]+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((m) => m[0])
                .join("")
                .toUpperCase() || "L";
            const outilsAffiches = liste.items.slice(0, 6);
            const autres = liste.items.length - outilsAffiches.length;
            return (
              <Carte key={liste.id} className="flex flex-col p-5">
                {/* En-tête : pastille + nom sur une ligne + compteur en badge */}
                <div className="flex items-center gap-3">
                  <div
                    aria-hidden
                    className="grid size-11 shrink-0 place-items-center rounded-champ bg-[linear-gradient(135deg,#00d1ff,#6a3bff)] font-titre text-[15px] font-bold text-white"
                  >
                    {initiales}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-titre text-[16px] leading-6 font-semibold">
                      {liste.nom}
                    </h3>
                    <p className="mt-0.5 text-[12px] leading-4 text-encre">
                      Créée le {formateurDateListe.format(liste.createdAt)}
                    </p>
                  </div>
                  <Badge variante={liste.items.length > 0 ? "source" : "defaut"} className="shrink-0">
                    {liste.items.length} outil{liste.items.length > 1 ? "s" : ""}
                  </Badge>
                </div>

                {/* Outils : logo + nom + retirer (6 max, le reste en résumé) */}
                {liste.items.length === 0 ? (
                  <div className="mt-4 rounded-champ border border-dashed border-bordure bg-gris/40 p-4 text-center">
                    <p className="text-[14px] leading-5 font-semibold text-bleu">Liste vide</p>
                    <p className="mt-1 text-[13px] leading-5 text-encre">
                      Ajoute des outils depuis{" "}
                      <Link
                        href="/dashboard?onglet=favoris"
                        className="font-semibold text-sky-500 hover:underline"
                      >
                        tes favoris
                      </Link>
                      .
                    </p>
                  </div>
                ) : (
                  <ul className="mt-4 grid gap-1">
                    {outilsAffiches.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-2.5 rounded-champ p-1 transition hover:bg-gris/60"
                      >
                        <LogoOutil nom={item.tool.nom} logo={item.tool.logo} />
                        <Link
                          href={`/outil/${item.tool.slug}`}
                          className="min-w-0 flex-1 truncate text-[14px] leading-5 font-medium text-sky-500 hover:underline"
                        >
                          {item.tool.nom}
                        </Link>
                        <form action={retirerDeListeFormulaire}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <button
                            type="submit"
                            aria-label={`Retirer ${item.tool.nom} de la liste`}
                            className="grid size-8 shrink-0 place-items-center rounded-full text-encre/60 transition hover:bg-white hover:text-red-600"
                          >
                            <X className="size-4" aria-hidden />
                          </button>
                        </form>
                      </li>
                    ))}
                    {autres > 0 && (
                      <li className="px-1.5 py-1 text-[13px] leading-5 text-encre">
                        + {autres} autre{autres > 1 ? "s" : ""} outil{autres > 1 ? "s" : ""} dans la liste
                      </li>
                    )}
                  </ul>
                )}

                {/* Actions : renommage replié + suppression, partage en dessous */}
                <div className="mt-auto border-t border-bordure pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <details className="min-w-0">
                      <summary
                        className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-full border border-bordure bg-white px-3 text-[13px] leading-4 font-semibold text-bleu transition hover:border-violet hover:text-violet [&::-webkit-details-marker]:hidden"
                      >
                        <Pencil className="size-3.5 text-sky-500" aria-hidden /> Renommer
                      </summary>
                      <form action={renommerListeFormulaire} className="mt-2 grid w-full max-w-xs gap-2">
                        <input className=" w-full" type="hidden" name="listeId" value={liste.id} />
                        <input
                          name="nom"
                          defaultValue={liste.nom}
                          required
                          minLength={2}
                          maxLength={60}
                          aria-label={`Nouveau nom pour la liste ${liste.nom}`}
                          className="min-h-10 w-full rounded-champ border border-bordure bg-white px-3 text-[14px] leading-5 focus:border-sky-500 focus:outline-none"
                        />
                        <Bouton variante="primaire" taille="sm" type="submit">
                          Enregistrer le nom
                        </Bouton>
                      </form>
                    </details>
                    <form action={supprimerListeFormulaire}>
                      <input type="hidden" name="listeId" value={liste.id} />
                      <BoutonConfirmer
                        type="submit"
                        message={`Supprimer la liste « ${liste.nom} » définitivement ?`}
                        aria-label={`Supprimer la liste ${liste.nom}`}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-red-300 bg-white px-3 text-[13px] leading-4 font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        <Trash2 className="size-4" aria-hidden /> 
                      </BoutonConfirmer>
                    </form>
                  </div>
                  <BoutonPartageListe listeId={liste.id} />
                </div>
              </Carte>
            );
          })}
          {listes.length === 0 && (
            <Carte className="col-span-full flex flex-col items-center gap-3 p-10 text-center">
              <div
                aria-hidden
                className="grid size-14 place-items-center rounded-carte bg-[linear-gradient(135deg,#00d1ff,#6a3bff)] text-white"
              >
                <ListChecks className="size-7" aria-hidden />
              </div>
              <div>
                <p className="font-titre text-[17px] leading-6 font-semibold text-bleu">
                  Aucune liste pour l'instant
                </p>
                <p className="mx-auto mt-1.5 max-w-md text-[14px] leading-5 text-encre">
                  Crée ta première liste ci-dessus, puis ajoute des outils depuis l'onglet Favoris.
                  Une liste regroupe des outils par projet, par client ou par objectif — et peut
                  être partagée en public.
                </p>
              </div>
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

  /* ══════════════ ONGLET ACTIVITÉ (enrichi — lot 53) ══════════════ */
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

    // Lot 53 — historique des recommandations de l'assistant, déplacé
    // de l'accueil : c'est de l'activité IA, à sa place ici.
    const recommandations = await prisma.recommendation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 4,
    });

    contenu = (
      <>
        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Conversations avec l'assistant */}
          <div className="grid content-start gap-4">
            <Carte className="p-5">
              <h2 className="font-titre text-[17px] leading-6 font-semibold">Tes conversations IA</h2>
              <p className="mt-2 font-titre text-[32px] leading-10 font-bold">{nbConversations}</p>
              <p className="text-legende text-encre">conversations avec l'assistant</p>
              <Bouton variante="secondaire" taille="sm" className="mt-4" asChild>
                <Link href="/assistant">
                  <Bot aria-hidden /> Continuer
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

        {/* ── Lot 53 — Tes médailles (déplacées de l'accueil) ─────── */}
        <Carte className="animate-apparition-haut mt-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">Tes médailles</h2>
            <span className="text-[13px] leading-4 font-semibold text-encre">
              {badges.filter((b) => b.obtenu).length} / {badges.length} débloquées
            </span>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
            {badges.map((b) => (
              <div
                key={b.titre}
                title={b.description}
                className={`flex w-32 shrink-0 flex-col items-center gap-1.5 rounded-carte border p-3.5 text-center transition ${
                  b.obtenu
                    ? "border-transparent bg-[linear-gradient(140deg,rgba(106,59,255,0.12),rgba(0,209,255,0.10))] shadow-[0_4px_14px_rgba(106,59,255,0.18)]"
                    : "border-bordure bg-gris/60 opacity-60"
                }`}
              >
                <span
                  className={`grid size-10 place-items-center rounded-full text-[18px] ${
                    b.obtenu
                      ? "bg-[linear-gradient(120deg,#6a3bff,#00d1ff)] text-white"
                      : "bg-white text-encre"
                  }`}
                >
                  {b.obtenu ? <b.icone className="size-5" aria-hidden /> : <Lock className="size-4" aria-hidden />}
                </span>
                <p className="font-titre text-[12px] leading-4 font-semibold text-bleu">{b.titre}</p>
                <p className="text-[11px] leading-3.5 text-encre">{b.description}</p>
              </div>
            ))}
          </div>
        </Carte>

        {/* ── Lot 53 — Recommandations de l'assistant (déplacées de
            l'accueil) ─────────────────────────────────────────────── */}
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-h3 font-semibold">Dernières recommandations de l'assistant</h2>
            <Link
              href="/assistant"
              className="inline-flex min-h-11 items-center gap-1 text-[15px] leading-5 font-semibold text-sky-500 hover:underline"
            >
              Ouvrir l'assistant
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

        {/* ── Lot 53 — Vu récemment (déplacé de l'accueil) ────────── */}
        <VuRecemment variante="compacte" />
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 lg:py-12">
      {enTete}
      {contenu}
    </div>
  );
}