// app/dashboard/entreprise/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 57 — « Espace Entreprise » (Niveau 3 : idées 19, 20, 21, 22).
// Sections : Collaborateurs de listes · Modèles de listes ·
// Widget d'intégration · Clés d'API.
// Réservé au TITULAIRE d'un abonnement Entreprise actif (comme la
// gestion des sièges : un siège reçu ne suffit pas). Défensif : si
// la migration SQL du lot 57 n'est pas passée, bandeau rouge, pas
// de crash.
// LOT 66 — 1) les résultats des requêtes défensives (membreListe,
//   modeleListe, lues via prismaCompat « any ») sont désormais
//   typés explicitement : le build strict TypeScript passe ;
//   2) la limite de clés affichée passe de 3 à 5 pour être
//   cohérente avec l'action serveur (MAX_CLES_ACTIVES = 5 dans
//   app/actions/cles-api.ts) et la page /dashboard/cles-api.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  AlertCircle,
  BookMarked,
  Building2,
  CheckCircle2,
  Code2,
  KeyRound,
  UserPlus,
  Users,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import { BoutonCopierTexte } from "@/components/entreprise/bouton-copier-texte";
import {
  inviterCollaborateurFormulaire,
  publierCommeModeleFormulaire,
  retirerCollaborateurFormulaire,
  retirerModeleFormulaire,
} from "@/app/actions/collaborations";
import {
  creerCleApiFormulaire,
  revoquerCleApiFormulaire,
} from "../../actions/cles-api";

export const metadata: Metadata = {
  title: "Espace Entreprise — Webgiverse Outils IA",
};
export const dynamic = "force-dynamic";

const formatteurDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });
const formatteurDateHeure = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});

type Props = {
  searchParams: Promise<{ message?: string }>;
};

const MESSAGES: Record<string, { ok: boolean; texte: string }> = {
  invite: {
    ok: true,
    texte:
      "Collaborateur invité : la personne retrouve la liste dans « Listes partagées avec moi » (un e-mail de prévenance lui a été envoyé).",
  },
  "role-maj": {
    ok: true,
    texte: "Les droits de ce collaborateur ont été mis à jour (LECTEUR ↔ EDITEUR).",
  },
  retire: {
    ok: true,
    texte: "Le collaborateur a été retiré de la liste. Son compte et ses propres listes ne sont pas affectés.",
  },
  "modele-publie": {
    ok: true,
    texte:
      "Ta liste est proposée comme modèle : elle apparaît désormais sur la page /modeles, où les abonnés Entreprise peuvent la cloner en un clic.",
  },
  "modele-retire": {
    ok: true,
    texte: "Ta liste n'est plus proposée comme modèle (la liste elle-même reste inchangée).",
  },
  duplique: {
    ok: true,
    texte:
      "Modèle cloné ! La copie est dans TES listes (privée) : tu peux la modifier librement sans toucher à l'original.",
  },
  cree: {
    ok: true,
    texte: "Clé d'API créée. Note-la maintenant : elle n'est affichée qu'une seule fois (2 minutes).",
  },
  revoquee: {
    ok: true,
    texte: "Clé révoquée : les appels qui l'utilisent reçoivent désormais 401.",
  },
  "email-invalide": {
    ok: false,
    texte: "Adresse e-mail invalide : vérifie le format (ex. prenom@domaine.com).",
  },
  "compte-introuvable": {
    ok: false,
    texte:
      "Aucun compte Webgiverse avec cette adresse e-mail. La personne doit d'abord créer un compte (gratuit), puis tu pourras l'inviter.",
  },
  "soi-meme": {
    ok: false,
    texte: "Impossible de t'inviter toi-même : tu es déjà propriétaire de la liste.",
  },
  limite: {
    ok: false,
    texte: "Cette liste a déjà 10 collaborateurs (maximum par liste).",
  },
  "cles-limite": {
    ok: false,
    texte: "Tu as déjà 5 clés actives. Révoque-en une avant d'en créer une nouvelle.",
  },
  "cles-nom-invalide": {
    ok: false,
    texte: "Donne un nom à ta clé (1 à 40 caractères), ex. « Site vitrine » ou « Tableau de bord interne ».",
  },
  "non-publique": {
    ok: false,
    texte:
      "Ta liste doit d'abord être partagée publiquement (bloc « Partager cette liste » du dashboard) pour devenir un modèle.",
  },
  "non-autorise": {
    ok: false,
    texte: "Cette action est réservée au plan Entreprise actif.",
  },
  introuvable: {
    ok: false,
    texte: "Cet élément n'existe plus (il a peut-être déjà été retiré).",
  },
  base: {
    ok: false,
    texte:
      "La base de données n'est pas encore à jour : exécute le fichier prisma/migration-niveau3.sql dans le SQL Editor de Neon (lot 57), puis recharge cette page.",
  },
};

const styleChamp =
  "min-h-11 w-full rounded-champ border border-bordure bg-white px-4 text-[14px] text-encre placeholder:text-encre/40 focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/30";
const styleBoutonRouge =
  "inline-flex min-h-11 items-center gap-2 rounded-[7px] -skew-x-[18deg] not-italic border border-red-300 bg-white px-4 text-[14px] font-semibold text-red-700 transition hover:bg-red-50";

export default async function PageEspaceEntreprise({ searchParams }: Props) {
  const { message } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?suite=/dashboard/entreprise");
  const userId = session.user.id;
  const maintenant = new Date();
  const alerte = message ? MESSAGES[message] : undefined;
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // ── 1) Abonnement personnel (titulaire Entreprise ?) ────────
  let abonnement: { plan: string; statut: string; expireLe: Date } | null = null;
  try {
    abonnement = await prisma.abonnement.findUnique({
      where: { utilisateurId: userId },
      select: { plan: true, statut: true, expireLe: true },
    });
  } catch {
    // table Abonnement absente → plan gratuit
  }
  const entreprisePerso = Boolean(
    abonnement &&
      abonnement.plan === "ENTREPRISE" &&
      abonnement.statut === "ACTIF" &&
      abonnement.expireLe > maintenant
  );

  // ── 2) Mes listes ───────────────────────────────────────────
  type MaListe = { id: string; nom: string; slug: string | null; estPublique: boolean };
  let mesListes: MaListe[] = [];
  try {
    mesListes = await prisma.list.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, nom: true, slug: true, estPublique: true },
    });
  } catch {
    // table List absente (base jamais initialisée) → page vide
  }
  const idsMesListes = mesListes.map((liste) => liste.id);

  // ── 3) Tables du lot 57 (collaborateurs, modèles, clés) ─────
  let baseOk = true;
  const prismaCompat = prisma as any;
  type LigneCollab = {
    listId: string;
    nomListe: string;
    collaborateurId: string;
    nom: string | null;
    email: string;
    role: string;
    depuis: Date;
  };
  let collaborations: LigneCollab[] = [];
  let idsModeles: string[] = [];
  type LigneCle = {
    id: string;
    nom: string;
    prefixe: string;
    creeLe: Date;
    derniereUtilisation: Date | null;
    revoqueeLe: Date | null;
  };
  // LOT 66 — typage explicite : prismaCompat est « any », sans ce
  // typage les paramètres des .map() sont « any » implicite et le
  // build strict échoue.
  type LienMembre = {
    listId: string;
    userId: string;
    role: string;
    creeLe: Date;
  };
  type ModeleLigne = { listId: string };
  let cles: LigneCle[] = [];
  try {
    const liens: LienMembre[] = idsMesListes.length
      ? await prismaCompat.membreListe.findMany({
          where: { listId: { in: idsMesListes } },
          orderBy: { creeLe: "asc" },
        })
      : [];
    const infos = liens.length
      ? await prisma.user.findMany({
          where: { id: { in: liens.map((l) => l.userId) } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const parListe = new Map(mesListes.map((liste) => [liste.id, liste.nom]));
    const parUser = new Map(infos.map((info) => [info.id, info]));
    collaborations = liens.map((lien) => ({
      listId: lien.listId,
      nomListe: parListe.get(lien.listId) ?? "(liste supprimée)",
      collaborateurId: lien.userId,
      nom: parUser.get(lien.userId)?.name ?? null,
      email: parUser.get(lien.userId)?.email ?? "(compte introuvable)",
      role: lien.role,
      depuis: lien.creeLe,
    }));

    const modeles: ModeleLigne[] = idsMesListes.length
      ? await prismaCompat.modeleListe.findMany({
          where: { listId: { in: idsMesListes } },
          select: { listId: true },
        })
      : [];
    idsModeles = modeles.map((modele) => modele.listId);

    cles = await prismaCompat.cleApi.findMany({
      where: { userId },
      orderBy: { creeLe: "desc" },
      select: {
        id: true,
        nom: true,
        prefixe: true,
        creeLe: true,
        derniereUtilisation: true,
        revoqueeLe: true,
      },
    });
  } catch {
    // migration lot 57 pas passée
    baseOk = false;
  }

  // ── 4) Clé à afficher une seule fois (cookie éphémère) ──────
  let cleNouvelle: string | null = null;
  try {
    const stockage = await cookies();
    cleNouvelle = stockage.get("nouvelle-cle-api")?.value ?? null;
  } catch {
    // pas grave : la clé ne sera simplement pas affichée
  }

  const listesPubliques = mesListes.filter((liste) => liste.estPublique);
  const clesActives = cles.filter((cle) => !cle.revoqueeLe);
  const exempleCurl = `curl -H "Authorization: Bearer wg_VOTRE_CLE" ${base}/api/v1/listes`;

  const titreSection =
    "flex items-center gap-2 text-[15px] font-semibold text-encre";

  // ── Vue non-Entreprise ──────────────────────────────────────
  if (!entreprisePerso) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 lg:py-10">
        <h1 className="flex items-center gap-2 text-h2 font-semibold">
          <Building2 className="size-7 text-violet" aria-hidden /> Espace
          Entreprise
        </h1>
        <Carte className="animate-apparition-haut mt-6 p-6 text-center">
          <p className="flex items-center justify-center gap-2 text-[15px] font-semibold text-encre">
            <Building2 className="size-5 text-violet" aria-hidden /> L&apos;Espace
            Entreprise est réservé au plan Entreprise
          </p>
          <p className="mx-auto mt-2 max-w-xl text-[14px] leading-5 text-encre/70">
            Listes d&apos;équipe, modèles de listes à cloner, widget à intégrer
            sur ton site et API de lecture : tout le Niveau 3 se trouve ici,
            avec l&apos;abonnement Entreprise ($7,99/mois).
          </p>
          <Bouton asChild taille="md" className="mt-4">
            <Link href="/tarifs">Découvrir le plan Entreprise</Link>
          </Bouton>
        </Carte>
      </div>
    );
  }

  // ── Vue titulaire ───────────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:py-10">
      <h1 className="flex items-center gap-2 text-h2 font-semibold">
        <Building2 className="size-7 text-violet" aria-hidden /> Espace
        Entreprise
      </h1>
      <p className="mt-1 text-[14px] leading-5 text-encre/70">
        Les fonctionnalités avancées de ton plan : collaboration sur les
        listes, modèles publics, widget pour ton site et API de lecture.
      </p>

      {alerte && (
        <Carte
          className={`animate-apparition-haut mt-4 flex items-start gap-3 p-4 text-[14px] leading-5 ${
            alerte.ok
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {alerte.ok ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
          ) : (
            <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
          )}
          <span>{alerte.texte}</span>
        </Carte>
      )}

      {cleNouvelle && (
        <Carte className="animate-apparition-haut mt-4 border-emerald-300 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-emerald-800">
            <CheckCircle2 className="size-5" aria-hidden /> Ta nouvelle clé —
            copie-la MAINTENANT (elle ne sera plus jamais affichée) :
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-champ border border-emerald-300 bg-white px-3 py-2 font-mono text-[13px] text-emerald-900">
              {cleNouvelle}
            </code>
            <BoutonCopierTexte texte={cleNouvelle} label="Copier la clé" />
          </div>
        </Carte>
      )}

      {!baseOk && (
        <Carte className="mt-4 flex items-start gap-3 border-red-300 bg-red-50 p-4 text-[14px] leading-5 text-red-800">
          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            La base de données n&apos;est pas encore à jour : exécute le
            fichier <strong>prisma/migration-niveau3.sql</strong> dans le SQL
            Editor de Neon (lot 57), puis recharge cette page. En attendant,
            aucune donnée n&apos;est perdue ni modifiée.
          </span>
        </Carte>
      )}

      {/* ── Section 1 : Collaborateurs (idée 19) ─────────────── */}
      <Carte className="mt-6 p-6">
        <p className={titreSection}>
          <Users className="size-5 text-violet" aria-hidden /> Collaborateurs
          de tes listes
        </p>
        <p className="mt-1 text-[13px] leading-5 text-encre/70">
          Invite un compte Webgiverse existant sur une de tes listes :
          <strong> LECTEUR</strong> la consulte dans son dashboard,
          <strong> EDITEUR</strong> peut en plus ajouter et retirer des outils
          ({collaborations.length} collaboration
          {collaborations.length > 1 ? "s" : ""} en cours).
        </p>
        {mesListes.length === 0 ? (
          <p className="mt-3 text-[14px] leading-5 text-encre/70">
            Tu n&apos;as pas encore de liste : crée ta première liste depuis
            le dashboard, puis reviens ici pour inviter ton équipe.
          </p>
        ) : (
          <form
            action={inviterCollaborateurFormulaire}
            className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]"
          >
            <select name="listId" required className={styleChamp} aria-label="Liste">
              {mesListes.map((liste) => (
                <option key={liste.id} value={liste.id}>
                  {liste.nom}
                </option>
              ))}
            </select>
            <input
              type="email"
              name="email"
              required
              placeholder="prenom@domaine.com"
              className={styleChamp}
            />
            <select name="role" className={styleChamp} aria-label="Droits">
              <option value="LECTEUR">Lecteur</option>
              <option value="EDITEUR">Éditeur</option>
            </select>
            <Bouton type="submit" taille="sm">
              <UserPlus aria-hidden /> Inviter
            </Bouton>
          </form>
        )}

        {collaborations.length > 0 && (
          <ul className="mt-4 space-y-3">
            {collaborations.map((collab) => (
              <li
                key={`${collab.listId}-${collab.collaborateurId}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-champ border border-bordure bg-gris p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-encre">
                    {collab.nom || collab.email}
                    <span className="ml-2 rounded-[7px] -skew-x-[18deg] not-italic bg-violet/10 px-2 py-0.5 text-[11px] font-bold text-violet">
                      {collab.role === "EDITEUR" ? "ÉDITEUR" : "LECTEUR"}
                    </span>
                  </p>
                  <p className="truncate text-[13px] text-encre/60">
                    liste « {collab.nomListe} » ·{" "}
                    {collab.nom ? `${collab.email} · ` : ""}depuis le{" "}
                    {formatteurDate.format(collab.depuis)}
                  </p>
                </div>
                <form action={retirerCollaborateurFormulaire}>
                  <input type="hidden" name="listId" value={collab.listId} />
                  <input
                    type="hidden"
                    name="collaborateurId"
                    value={collab.collaborateurId}
                  />
                  <BoutonConfirmer
                    type="submit"
                    message={`Retirer ${collab.nom || collab.email} de la liste « ${collab.nomListe} » ?`}
                    className={styleBoutonRouge}
                  >
                    Retirer
                  </BoutonConfirmer>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Carte>

      {/* ── Section 2 : Modèles (idée 22) ────────────────────── */}
      <Carte className="mt-6 p-6">
        <p className={titreSection}>
          <BookMarked className="size-5 text-violet" aria-hidden /> Modèles de
          listes
        </p>
        <p className="mt-1 text-[13px] leading-5 text-encre/70">
          Propose une liste <strong>publique</strong> comme modèle : les
          abonnés Entreprise peuvent la cloner en un clic depuis{" "}
          <Link href="/modeles" className="font-semibold text-violet underline">
            /modeles
          </Link>{" "}
          — ta liste originale reste intacte.
        </p>
        {mesListes.length === 0 ? (
          <p className="mt-3 text-[14px] leading-5 text-encre/70">
            Aucune liste pour le moment.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {mesListes.map((liste) => {
              const estModele = idsModeles.includes(liste.id);
              return (
                <li
                  key={liste.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-champ border border-bordure bg-gris p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-encre">
                      {liste.nom}
                      {estModele && (
                        <span className="ml-2 rounded-[7px] -skew-x-[18deg] not-italic bg-violet/10 px-2 py-0.5 text-[11px] font-bold text-violet">
                          MODÈLE
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[13px] text-encre/60">
                      {liste.estPublique
                        ? "partagée publiquement — éligible comme modèle"
                        : "privée — partage-la publiquement d'abord"}
                    </p>
                  </div>
                  {!estModele && liste.estPublique ? (
                    <form action={publierCommeModeleFormulaire}>
                      <input type="hidden" name="listId" value={liste.id} />
                      <Bouton type="submit" taille="sm">
                        Proposer comme modèle
                      </Bouton>
                    </form>
                  ) : estModele ? (
                    <form action={retirerModeleFormulaire}>
                      <input type="hidden" name="listId" value={liste.id} />
                      <BoutonConfirmer
                        type="submit"
                        message={`Retirer « ${liste.nom} » de la page /modeles ?`}
                        className={styleBoutonRouge}
                      >
                        Retirer
                      </BoutonConfirmer>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Carte>

      {/* ── Section 3 : Widget (idée 20) ─────────────────────── */}
      <Carte className="mt-6 p-6">
        <p className={titreSection}>
          <Code2 className="size-5 text-violet" aria-hidden /> Widget pour ton
          site
        </p>
        <p className="mt-1 text-[13px] leading-5 text-encre/70">
          Intègre une de tes listes publiques sur n&apos;importe quel site
          avec une simple balise. Copie le code, colle-le dans ta page : le
          widget se met à jour tout seul quand tu modifies la liste.
        </p>
        {listesPubliques.length === 0 ? (
          <p className="mt-3 text-[14px] leading-5 text-encre/70">
            Aucune liste publique : partage d&apos;abord une liste (bloc
            « Partager cette liste » du dashboard) pour obtenir son widget.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {listesPubliques.map((liste) => {
              const adresse = `${base}/api/embed/listes/${liste.slug ?? liste.id}`;
              const code = `<iframe src="${adresse}" width="100%" height="420" style="border:1px solid #e5e7eb;border-radius:12px" loading="lazy" title="${liste.nom}"></iframe>`;
              return (
                <li
                  key={liste.id}
                  className="rounded-champ border border-bordure bg-gris p-4"
                >
                  <p className="text-[14px] font-semibold text-encre">
                    {liste.nom}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="min-w-0 flex-1 break-all rounded-champ border border-bordure bg-white px-3 py-2 font-mono text-[12px] text-encre/80">
                      {code}
                    </code>
                    <BoutonCopierTexte texte={code} label="Copier le code" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Carte>

      {/* ── Section 4 : Clés API (idée 21) ───────────────────── */}
      <Carte className="mt-6 p-6">
        <p className={titreSection}>
          <KeyRound className="size-5 text-violet" aria-hidden /> Clés d&apos;API
          de lecture ({clesActives.length}/5 actives)
        </p>
        <p className="mt-1 text-[13px] leading-5 text-encre/70">
          Permet à un site ou un outil externe de lire tes listes publiques
          (30 appels/minute). La clé n&apos;est jamais stockée en clair :
          note-la juste après sa création.
        </p>
        <form
          action={creerCleApiFormulaire}
          className="mt-4 flex flex-wrap items-center gap-3"
        >
          <input
            type="text"
            name="nom"
            required
            maxLength={40}
            placeholder="Nom de la clé (ex. Site vitrine)"
            className={`min-h-11 flex-1 ${styleChamp}`}
          />
          <Bouton type="submit" taille="sm">
            <KeyRound aria-hidden /> Créer une clé
          </Bouton>
        </form>

        {cles.length > 0 && (
          <ul className="mt-4 space-y-3">
            {cles.map((cle) => (
              <li
                key={cle.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-champ border border-bordure bg-gris p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-encre">
                    {cle.nom}
                    {cle.revoqueeLe && (
                      <span className="ml-2 rounded-[7px] -skew-x-[18deg] not-italic bg-encre/10 px-2 py-0.5 text-[11px] font-bold text-encre/60">
                        RÉVOQUÉE
                      </span>
                    )}
                  </p>
                  <p className="truncate font-mono text-[12px] text-encre/60">
                    {cle.prefixe}… · créée le {formatteurDate.format(cle.creeLe)}
                    {!cle.revoqueeLe && (
                      <>
                        {" "}
                        · dernière utilisation :{" "}
                        {cle.derniereUtilisation
                          ? formatteurDateHeure.format(cle.derniereUtilisation)
                          : "jamais"}
                      </>
                    )}
                  </p>
                </div>
                {!cle.revoqueeLe && (
                  <form action={revoquerCleApiFormulaire}>
                    <input type="hidden" name="cleId" value={cle.id} />
                    <BoutonConfirmer
                      type="submit"
                      message={`Révoquer la clé « ${cle.nom} » ? Les sites qui l'utilisent perdront l'accès immédiatement.`}
                      className={styleBoutonRouge}
                    >
                      Révoquer
                    </BoutonConfirmer>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-5 text-[13px] font-semibold text-encre">
          Exemple d&apos;appel
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded-champ border border-bordure bg-gris px-3 py-2 font-mono text-[12px] text-encre/80">
            {exempleCurl}
          </code>
          <BoutonCopierTexte texte={exempleCurl} label="Copier" />
        </div>
      </Carte>
    </div>
  );
}