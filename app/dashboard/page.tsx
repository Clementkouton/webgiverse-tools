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
  History,
  LayoutDashboard,
  ListChecks,
  Loader,
  Lock,
  MessageSquareQuote,
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
import { BoutonDeconnexion } from "@/components/auth/bouton-deconnexion";
import { PortailConnexion } from "@/components/auth/portail-connexion";
import BoutonPartageListe from "@/components/partage/bouton-partage-liste";
import VuRecemment from "@/components/visites/vu-recemment";

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
  "min-h-11 rounded-champ border border-bordure bg-white px-3 text-[15px] leading-5 focus:border-violet focus:outline-none";

const ICONES_ACTIVITE: Record<string, { icone: LucideIcon; libelle: string }> = {
  favori: { icone: Star, libelle: "Favoris" },
  assistant: { icone: Sparkles, libelle: "Assistant IA" },
  avis: { icone: MessageSquareQuote, libelle: "Avis" },
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

const PALIERS = [
  { min: 30, nom: "Maître IA" },
  { min: 15, nom: "Conquérant" },
  { min: 5, nom: "Explorateur" },
];

export default async function PageDashboard({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string; statut?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return <PortailConnexion />;

  const { onglet, statut } = await searchParams;
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
  const [nbFavoris, nbEnCours, nbAdoptes, nbAvis, nbVotes, nbListes] = await Promise.all([
    prisma.favorite.count({ where: { userId } }),
    prisma.favorite.count({ where: { userId, statut: "EN_COURS" } }),
    prisma.favorite.count({ where: { userId, statut: "ADOPTE" } }),
    Promise.resolve(0),
    Promise.resolve(0),
    prisma.list.count({ where: { userId } }),
  ]);

  const score = nbFavoris + nbEnCours + nbAdoptes * 2 + nbAvis * 2 + nbVotes + nbListes;
  const palier = PALIERS.find((p) => score >= p.min) ?? { min: 0, nom: "Débutant" };
  const seuilSuivant = score >= 30 ? null : score >= 15 ? 30 : score >= 5 ? 15 : 5;
  const progression = seuilSuivant
    ? Math.min(100, Math.round((score / seuilSuivant) * 100))
    : 100;

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

  // ── En-tête commun (greeting + niveau + onglets) ───────────────
  const enTete = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-legende text-encre capitalize">
            {new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}
          </p>
          <h1 className="mt-1 text-h2 font-semibold">
            {prenom ? `Bonjour ${prenom} 👋` : "Bonjour 👋"}
          </h1>
        </div>
        <BoutonDeconnexion />
      </div>

      {/* Carte de bienvenue avec progression */}
      <div className="relative mt-6 overflow-hidden rounded-carte bg-[linear-gradient(110deg,#0b1b3f_0%,#4326a8_55%,#6a3bff_100%)] p-6 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-ciel/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="text-legende text-white/70">Ton espace personnel Webgiverse</p>
            <p className="mt-2 flex flex-wrap items-center gap-2 font-titre text-[20px] leading-7 font-semibold">
              Niveau : {palier.nom}
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[12px] leading-4 font-medium">
                {score} pts
              </span>
            </p>
            <div className="mt-3 w-full max-w-xs">
              <div className="h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#00d1ff,#00e5c6)]"
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
              className="size-16 shrink-0 rounded-full border-2 border-white/30 object-cover"
            />
          ) : (
            <div className="grid size-16 shrink-0 place-items-center rounded-full border-2 border-white/30 bg-white/15 font-titre text-[22px] font-bold">
              {(prenom || "W").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Navigation par onglets */}
      <nav
        aria-label="Sections du tableau de bord"
        className="mt-6 flex gap-1.5 overflow-x-auto rounded-full border border-bordure bg-white p-1.5 shadow-carte"
      >
        {ONGLETS.map((o) => {
          const actif = o.cle === ongletActif;
          return (
            <Link
              key={o.cle}
              href={`/dashboard?onglet=${o.cle}`}
              aria-current={actif ? "page" : undefined}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] leading-5 font-semibold transition ${
                actif ? "bg-violet text-white" : "text-bleu hover:bg-gris"
              }`}
            >
              <o.icone className="size-4" aria-hidden /> {o.libelle}
            </Link>
          );
        })}
      </nav>
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
            take: 3,
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

    contenu = (
      <>
        {/* Statistiques cliquables */}
        <section aria-label="Mes statistiques" className="mt-8 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { libelle: "Favoris", valeur: nbFavoris, icone: Star, href: "/dashboard?onglet=favoris" },
            { libelle: "En cours", valeur: nbEnCours, icone: Loader, href: "/dashboard?onglet=favoris&statut=EN_COURS" },
            { libelle: "Adoptés", valeur: nbAdoptes, icone: CheckCircle2, href: "/dashboard?onglet=favoris&statut=ADOPTE" },
            { libelle: "Avis publiés", valeur: nbAvis, icone: MessageSquareQuote, href: "/dashboard?onglet=avis" },
            { libelle: "Votes donnés", valeur: nbVotes, icone: ThumbsUp, href: "/populaires" },
            { libelle: "Listes", valeur: nbListes, icone: ListChecks, href: "/dashboard?onglet=listes" },
          ].map((s) => (
            <Link
              key={s.libelle}
              href={s.href}
              className="group flex items-center gap-3 rounded-carte border border-bordure bg-white p-4 shadow-carte transition hover:border-violet"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-champ bg-gris text-violet">
                <s.icone className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-titre text-[22px] leading-7 font-bold">{s.valeur}</span>
                <span className="block truncate text-[12px] leading-4 text-encre">{s.libelle}</span>
              </span>
            </Link>
          ))}
        </section>

        {/* Badges / gamification */}
        <Carte className="mt-8 p-6">
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
                  b.obtenu ? "border-violet bg-violet/5" : "border-bordure bg-gris/60 opacity-60"
                }`}
              >
                <span
                  className={`grid size-10 place-items-center rounded-full ${
                    b.obtenu ? "bg-violet text-white" : "bg-white text-encre"
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
        <Carte className="mt-8 p-6">
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
              <h2 className="text-h3 font-semibold">Pour ton objectif « {utilisateur.objectif} »</h2>
              <Link
                href="/outils"
                className="inline-flex min-h-11 items-center gap-1 text-[15px] leading-5 font-semibold text-violet hover:underline"
              >
                Voir l'annuaire <ChevronRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {suggestions.map((o) => (
                <Carte key={o.id} className="p-5 transition hover:-translate-y-0.5">
                  <div className="flex items-start gap-3">
                    <LogoOutil nom={o.nom} logo={o.logo} />
                    <div className="min-w-0">
                      <Link
                        href={`/outil/${o.slug}`}
                        className="font-titre text-[17px] leading-6 font-semibold hover:text-violet"
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
                    className="mt-3 inline-flex min-h-9 items-center gap-1 text-[14px] leading-5 font-semibold text-violet hover:underline"
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

        {/* Vu récemment (version compacte) */}
        <VuRecemment variante="compacte" />

        {/* Recommandations de l'assistant */}
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-h3 font-semibold">Dernières recommandations de l'assistant</h2>
            <Link
              href="/assistant"
              className="inline-flex min-h-11 items-center gap-1 text-[15px] leading-5 font-semibold text-violet hover:underline"
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
                            className="inline-flex rounded-full border border-violet bg-violet/5 px-3 py-1 text-[13px] leading-4 font-medium text-violet hover:bg-violet/10"
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
                <Link href="/assistant" className="font-semibold text-violet hover:underline">
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
                className="group flex items-start gap-3 rounded-carte border border-bordure bg-white p-5 shadow-carte transition hover:-translate-y-0.5 hover:border-violet"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-champ bg-gris text-violet">
                  <r.icone className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-titre text-[16px] leading-5 font-semibold group-hover:text-violet">
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
          <h2 className="text-h3 font-semibold">Mes favoris ({favoris.length})</h2>
          <Link
            href="/favoris"
            className="inline-flex min-h-11 items-center gap-1 text-[15px] leading-5 font-semibold text-violet hover:underline"
          >
            Exporter en PDF <ChevronRight className="size-4" aria-hidden />
          </Link>
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
                  actif ? "border-violet bg-violet/10 text-violet" : "border-bordure bg-white text-encre hover:border-violet"
                }`}
              >
                {f.libelle}
              </Link>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {favoris.map((f) => (
            <Carte key={f.id} className="p-5">
              <div className="flex items-start gap-3">
                <LogoOutil nom={f.tool.nom} logo={f.tool.logo} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/outil/${f.tool.slug}`}
                    className="font-titre text-[17px] leading-6 font-semibold hover:text-violet"
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
        <h2 className="text-h3 font-semibold">Mes listes ({listes.length})</h2>
        <p className="mt-1 text-legende text-encre">
          Regroupe tes outils par projet, par client ou par objectif — et partage une liste en public si tu veux.
        </p>
        <form action={creerListeFormulaire} className="mt-4 flex flex-wrap gap-2">
          <input
            name="nom"
            placeholder="Nom de la liste (ex. « Boîte à outils client X »)"
            aria-label="Nom de la nouvelle liste"
            required
            minLength={2}
            maxLength={60}
            className="min-h-11 w-full max-w-sm flex-1 rounded-champ border border-bordure bg-white px-4 text-[15px] leading-5 focus:border-violet focus:outline-none"
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
                  <ListChecks className="mr-1 inline size-4 text-violet" aria-hidden />
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
                      className="min-h-9 py-1.5 font-medium text-violet hover:underline"
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
              <form action={renommerListeFormulaire} className="mt-4 flex gap-2 border-t border-bordure pt-4">
                <input type="hidden" name="listeId" value={liste.id} />
                <input
                  name="nom"
                  defaultValue={liste.nom}
                  aria-label={`Renommer ${liste.nom}`}
                  className="min-h-11 flex-1 rounded-champ border border-bordure px-3 text-[14px] leading-5 focus:border-violet focus:outline-none"
                />
                <Bouton variante="fantome" taille="sm" type="submit">
                  Renommer
                </Bouton>
              </form>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-bordure pt-4">
                <BoutonPartageListe listeId={liste.id} />
                <form action={supprimerListeFormulaire}>
                  <Bouton variante="fantome" taille="sm" type="submit">
                    Supprimer
                  </Bouton>
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
    const mesAvis: {
      id: string;
      note: number;
      contenu: string | null;
      majLe: Date;
      outil: { nom: string; slug: string; logo: string | null };
    }[] = [];

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
                    className="font-titre text-[17px] leading-6 font-semibold hover:text-violet"
                  >
                    {a.outil.nom}
                  </Link>
                  <p className="text-legende text-encre">
                    Dernière mise à jour : {formateurDate.format(a.majLe)}
                  </p>
                </div>
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
        take: 25,
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
          <h2 className="text-h3 font-semibold">Journal d'activité</h2>
          <div className="mt-4 grid gap-2.5">
            {activites.map((a) => {
              const meta = ICONES_ACTIVITE[a.type] ?? { icone: History, libelle: "Activité" };
              return (
                <Carte key={a.id} className="flex items-center gap-3 p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-champ bg-gris text-violet">
                    <meta.icone className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-5 font-semibold">{meta.libelle}</p>
                    {a.details && (
                      <p className="truncate text-[13px] leading-4 text-encre">{a.details}</p>
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
    <div className="mx-auto max-w-7xl px-4 py-10 lg:py-12">
      {enTete}
      {contenu}
    </div>
  );
}