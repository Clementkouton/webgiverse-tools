// app/dashboard/modeles-listes/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 57 — idée 22 : « Modèles de listes ».
// Deux usages sur une même page :
//   · Le CATALOGUE : les listes publiées comme modèles par la
//     communauté. Un compte avec l'avantage Entreprise clone le
//     modèle en un clic — la copie arrive dans son propre dashboard
//     (liste privée, mêmes outils).
//   · MES LISTES PUBLIQUES : publier / retirer ses propres listes
//     publiques comme modèles (le clonage des autres ne touche
//     jamais la liste source).
// Style identique au reste du dashboard (convention ③).
// Défensif : si la table ModeleListe n'existe pas encore (migration
// du lot 58 pas passée), une carte rouge l'explique — jamais de crash.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { BookCopy, Crown, Library, ListChecks, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PortailConnexion } from "@/components/auth/portail-connexion";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/badge";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import {
  clonerModeleFormulaire,
  publierModeleFormulaire,
  retirerModeleFormulaire,
} from "@/app/actions/modeles-listes";

export const metadata: Metadata = { title: "Modèles de listes" };

const formateurDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

const MESSAGES: Record<string, { texte: string; type: "succes" | "erreur" }> = {
  publie: { texte: "Modèle publié : ta liste rejoint le catalogue.", type: "succes" },
  retire: { texte: "Modèle retiré : ta liste reste intacte et publique.", type: "succes" },
  clone: {
    texte: "Modèle cloné : la copie est dans ton dashboard (onglet « Mes listes »), avec tous ses outils.",
    type: "succes",
  },
  "deja-publie": { texte: "Cette liste est déjà dans le catalogue des modèles.", type: "erreur" },
  "liste-privee": {
    texte: "Seules les listes PUBLIQUES peuvent être publiées comme modèles.",
    type: "erreur",
  },
  introuvable: { texte: "Liste ou modèle introuvable (il a peut-être été retiré).", type: "erreur" },
  indisponible: {
    texte: "Ce modèle n'est plus disponible : la liste source n'est plus publique.",
    type: "erreur",
  },
  "non-autorise": {
    texte: "Le clonage des modèles est réservé au plan Entreprise.",
    type: "erreur",
  },
  base: {
    texte: "La base n'est pas à jour : la table ModeleListe doit être créée (migration du lot 58, voir le LISEZ-MOI).",
    type: "erreur",
  },
};

export default async function ModelesListesPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return <PortailConnexion />;
  const { message } = await searchParams;
  const messageActif = message ? MESSAGES[message] : undefined;
  const userId = session.user.id;

  // Avantage Entreprise = titulaire ENTREPRISE actif OU membre d'équipe.
  let avantage = false;
  try {
    const abonnement = await prisma.abonnement.findUnique({
      where: { utilisateurId: userId },
      select: { plan: true, statut: true, expireLe: true },
    });
    if (
      abonnement &&
      abonnement.plan === "ENTREPRISE" &&
      abonnement.statut === "ACTIF" &&
      abonnement.expireLe > new Date()
    ) {
      avantage = true;
    } else {
      const siege = await prisma.membreEntreprise.findFirst({
        where: { membreId: userId },
        select: { id: true },
      });
      avantage = Boolean(siege);
    }
  } catch {
    avantage = false;
  }

  // ── Chargement défensif (catalogue + mes listes publiques) ──
  let accesBase = true;
  let catalogue: {
    modeleId: string;
    nom: string;
    auteur: string | null;
    nbOutils: number;
    publieLe: Date;
  }[] = [];
  let mesListesPubliques: {
    id: string;
    nom: string;
    nbOutils: number;
    estModele: boolean;
  }[] = [];
  try {
    // Tables liées en SQL pur (sans relation Prisma) : on charge les
    // modèles, puis les listes publiques correspondantes, puis on assemble.
    const modeles: Array<{
        creeLe: any;
        id: any; listId: string 
}> = await prisma.modeleListe.findMany({
      orderBy: { creeLe: "desc" },
    });
    const idsModeles = modeles.map((m: { listId: string }) => m.listId);
    const listesModeles =
      idsModeles.length > 0
        ? await prisma.list.findMany({
            where: { id: { in: idsModeles }, estPublique: true },
            select: {
              id: true,
              nom: true,
              userId: true,
              _count: { select: { items: true } },
              user: { select: { name: true } },
            },
          })
        : [];
    const listeParId = new Map(listesModeles.map((l) => [l.id, l]));
    catalogue = modeles.flatMap((m) => {
      const liste = listeParId.get(m.listId);
      if (!liste) return []; // liste supprimée ou redevenue privée → ignorée
      return [
        {
          modeleId: m.id,
          nom: liste.nom,
          auteur: liste.user?.name ?? null,
          nbOutils: liste._count.items,
          publieLe: m.creeLe,
        },
      ];
    });

    const publiques = await prisma.list.findMany({
      where: { userId, estPublique: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, nom: true, _count: { select: { items: true } } },
    });
    const idsModelesPerso = new Set(modeles.map((m) => m.listId));
    mesListesPubliques = publiques.map((l) => ({
      id: l.id,
      nom: l.nom,
      nbOutils: l._count.items,
      estModele: idsModelesPerso.has(l.id),
    }));
  } catch (erreur) {
    console.error("Modèles (chargement) :", erreur);
    accesBase = false;
  }

  return (
    <div className="mx-auto max-w-3xl py-10">
      {/* ── En-tête ──────────────────────────────────────────────── */}
      <header>
        <h1 className="text-h2 font-semibold">Modèles de listes</h1>
        <p className="mesure mt-2 text-[14px] leading-6 text-encre">
          Des listes prêtes à l&apos;emploi publiées par la communauté : clone un
          modèle en un clic, la copie arrive dans ton dashboard avec tous ses
          outils — tu peux ensuite la modifier librement.
        </p>
      </header>

      {/* ── Carte de message ─────────────────────────────────────── */}
      {messageActif && (
        <Carte
          className={`mt-6 p-4 ${
            messageActif.type === "succes"
              ? "border-emerald-300 bg-emerald-50"
              : "border-red-300 bg-red-50"
          }`}
        >
          <p
            className={`text-[14px] leading-6 ${
              messageActif.type === "succes" ? "text-emerald-800" : "text-red-700"
            }`}
          >
            {messageActif.texte}
          </p>
        </Carte>
      )}

      {/* ── Bandeau Entreprise (si l'utilisateur ne clone pas encore) ── */}
      {!avantage && accesBase && (
        <Carte className="mt-6 p-6">
          <div className="flex items-start gap-3">
            <Crown className="mt-0.5 size-5 shrink-0 text-sky-500" aria-hidden />
            <div className="flex-1">
              <p className="text-[15px] leading-6 font-semibold">
                Le clonage des modèles est réservé au plan Entreprise
              </p>
              <p className="mt-1 text-[14px] leading-6 text-encre">
                Tu peux parcourir le catalogue librement. Passe au plan
                Entreprise (ou occupe un siège dans une équipe Entreprise) pour
                cloner ces listes en un clic.
              </p>
              <Bouton taille="sm" className="mt-3" asChild>
                <Link href="/tarifs">Découvrir le plan Entreprise</Link>
              </Bouton>
            </div>
          </div>
        </Carte>
      )}

      {accesBase ? (
        <>
          {/* ── Catalogue ────────────────────────────────────────── */}
          <Carte className="mt-6 p-6">
            <div className="flex items-center gap-2">
              <Library className="size-5 text-sky-500" aria-hidden />
              <h2 className="text-h3 font-semibold">
                Catalogue ({catalogue.length})
              </h2>
            </div>
            {catalogue.length === 0 ? (
              <div className="mt-4 rounded-champ border border-bordure bg-gris/40 p-6 text-center">
                <Sparkles className="mx-auto size-8 text-encre/40" aria-hidden />
                <p className="mt-2 text-[14px] leading-6 text-encre">
                  Le catalogue est encore vide : publie ta première liste
                  publique comme modèle avec la section ci-dessous.
                </p>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-bordure">
                {catalogue.map((modele) => (
                  <li key={modele.modeleId} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-titre text-[15px] leading-5 font-semibold">
                          {modele.nom}
                        </span>
                        <Badge variante="source">Modèle</Badge>
                      </div>
                      <p className="text-legende mt-0.5 text-encre">
                        {modele.nbOutils} outil{modele.nbOutils > 1 ? "s" : ""}
                        {modele.auteur ? ` · par ${modele.auteur}` : ""}
                        {` · publié le ${formateurDate.format(modele.publieLe)}`}
                      </p>
                    </div>
                    {avantage ? (
                      <form action={clonerModeleFormulaire}>
                        <input type="hidden" name="modeleId" value={modele.modeleId} />
                        <Bouton type="submit" variante="secondaire" taille="sm">
                          <BookCopy className="size-4" aria-hidden />
                          Utiliser ce modèle
                        </Bouton>
                      </form>
                    ) : (
                      <Badge variante="defaut">Entreprise</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Carte>

          {/* ── Mes listes publiques ─────────────────────────────── */}
          <Carte className="mt-6 p-6">
            <div className="flex items-center gap-2">
              <ListChecks className="size-5 text-sky-500" aria-hidden />
              <h2 className="text-h3 font-semibold">
                Publier tes listes publiques ({mesListesPubliques.length})
              </h2>
            </div>
            <p className="mesure mt-2 text-[14px] leading-6 text-encre">
              Une liste publique partagée via son lien peut devenir un modèle :
              les comptes Entreprise la cloneront depuis ce catalogue. Ta liste
              reste intacte — retirer le modèle ne change rien à la liste.
            </p>
            {mesListesPubliques.length === 0 ? (
              <p className="mt-4 text-[14px] leading-6 text-encre">
                Tu n&apos;as pas de liste publique. Rends publique une de tes listes
                (depuis l&apos;onglet « Mes listes » du dashboard, via le partage
                par lien) pour la proposer comme modèle.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-bordure">
                {mesListesPubliques.map((liste) => (
                  <li key={liste.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-titre text-[15px] leading-5 font-semibold">
                          {liste.nom}
                        </span>
                        {liste.estModele && <Badge variante="source">Modèle</Badge>}
                      </div>
                      <p className="text-legende mt-0.5 text-encre">
                        {liste.nbOutils} outil{liste.nbOutils > 1 ? "s" : ""}
                      </p>
                    </div>
                    {liste.estModele ? (
                      <form action={retirerModeleFormulaire}>
                        <input type="hidden" name="listeId" value={liste.id} />
                        <BoutonConfirmer
                          type="submit"
                          message={`Retirer « ${liste.nom} » du catalogue des modèles ?`}
                          aria-label={`Retirer le modèle ${liste.nom}`}
                          className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-encre hover:bg-gris hover:text-red-600"
                        >
                          Retirer du catalogue
                        </BoutonConfirmer>
                      </form>
                    ) : (
                      <form action={publierModeleFormulaire}>
                        <input type="hidden" name="listeId" value={liste.id} />
                        <Bouton type="submit" variante="secondaire" taille="sm">
                          <Sparkles className="size-4" aria-hidden />
                          Publier comme modèle
                        </Bouton>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Carte>
        </>
      ) : (
        // ── Table absente : carte rouge (même patron que « Mon équipe ») ──
        <Carte className="mt-6 border-red-300 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <Library className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden />
            <div>
              <p className="text-[15px] leading-6 font-semibold text-red-800">
                La base n&apos;est pas encore à jour
              </p>
              <p className="mt-1 text-[14px] leading-6 text-red-700">
                La table « ModeleListe » n&apos;existe pas encore : ouvre le SQL
                Editor de Neon et exécute le fichier
                prisma/migration-sieges-equipe.sql du lot 58 (100 % idempotent,
                aucune donnée n&apos;est touchée). Cette carte disparaîtra d&apos;elle-même.
              </p>
            </div>
          </div>
        </Carte>
      )}
    </div>
  );
}