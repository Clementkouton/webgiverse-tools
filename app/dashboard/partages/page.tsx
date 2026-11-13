// app/dashboard/partages/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 57 — idée 19 + 20 : « Partage des listes » (vue TITULAIRE).
// Le titulaire Entreprise invite un membre de SON équipe sur une de
// SES listes, choisit son droit (LECTEUR consulte / EDITEUR peut
// ajouter-retirer des outils), change le droit ou retire le partage.
// Le collaborateur voit la liste depuis « Listes partagées avec moi »
// (/dashboard/listes-partagees).
// Style identique au reste du dashboard (Carte / Badge / Bouton /
// BoutonConfirmer — aucun changement visuel, convention ③).
// Défensif : si la table MembreListe n'existe pas encore (migration
// du lot 58 pas passée), une carte rouge l'explique — jamais de crash.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import {
  Crown,
  Inbox,
  Info,
  ListChecks,
  Share2,
  Users,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PortailConnexion } from "@/components/auth/portail-connexion";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/badge";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import {
  changerRolePartageFormulaire,
  partagerListeFormulaire,
  retirerPartageFormulaire,
} from "@/app/actions/partage-listes";

export const metadata: Metadata = { title: "Partage des listes" };

const STYLE_SELECT =
  "min-h-11 w-full rounded-champ border border-bordure bg-white px-3 text-[15px] leading-5 focus:border-sky-500 focus:outline-none";

const formateurDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

const MESSAGES: Record<string, { texte: string; type: "succes" | "erreur" }> = {
  partage: { texte: "Liste partagée : le collaborateur en a été informé par e-mail.", type: "succes" },
  role: { texte: "Droit du collaborateur mis à jour.", type: "succes" },
  retire: { texte: "Partage retiré : la liste a quitté son tableau de bord.", type: "succes" },
  "email-invalide": { texte: "Adresse e-mail invalide — vérifie la saisie.", type: "erreur" },
  "liste-introuvable": { texte: "Liste introuvable (ou elle ne t'appartient plus).", type: "erreur" },
  "compte-introuvable": {
    texte: "Aucun compte Webgiverse avec cet e-mail : ton collaborateur doit d'abord créer un compte.",
    type: "erreur",
  },
  "soi-meme": { texte: "Tu ne peux pas partager une liste avec toi-même.", type: "erreur" },
  "pas-membre": {
    texte: "Ce compte n'occupe pas de siège dans ton équipe : invite-le d'abord depuis « Mon équipe ».",
    type: "erreur",
  },
  "deja-partage": { texte: "Ce compte a déjà accès à cette liste — passe plutôt son droit à EDITEUR si besoin.", type: "erreur" },
  "non-autorise": { texte: "Le partage de listes est réservé au titulaire du plan Entreprise.", type: "erreur" },
  introuvable: { texte: "Partage introuvable (il a peut-être déjà été retiré).", type: "erreur" },
  base: {
    texte: "La base n'est pas à jour : la table MembreListe doit être créée (migration du lot 58, voir le LISEZ-MOI).",
    type: "erreur",
  },
};

export default async function PartagesPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return <PortailConnexion />;
  const { message } = await searchParams;
  const messageActif = message ? MESSAGES[message] : undefined;
  const userId = session.user.id;
  const prenom = (session.user.name ?? "toi").split(" ")[0];

  // Titulaire valide = abonnement ENTREPRISE personnel actif.
  let estTitulaire = false;
  try {
    const abonnement = await prisma.abonnement.findUnique({
      where: { utilisateurId: userId },
      select: { plan: true, statut: true, expireLe: true },
    });
    estTitulaire = Boolean(
      abonnement &&
        abonnement.plan === "ENTREPRISE" &&
        abonnement.statut === "ACTIF" &&
        abonnement.expireLe > new Date()
    );
  } catch {
    estTitulaire = false;
  }

  // ── Vue non-Entreprise : porte vers le plan + vers ses partages reçus ──
  if (!estTitulaire) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <Carte className="p-8 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-[7px]  not-italic bg-gris">
            <Crown className="size-7 text-sky-500" aria-hidden />
          </div>
          <h1 className="text-h3 mt-4 font-semibold">Le partage de listes est réservé au plan Entreprise</h1>
          <p className="mesure mx-auto mt-2 max-w-md text-[14px] leading-6 text-encre">
            Avec le plan Entreprise, tu partages tes listes avec ton équipe : chaque
            collaborateur invite consulte tes listes (LECTEUR) ou y ajoute des outils
            (EDITEUR) depuis son propre tableau de bord.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Bouton asChild>
              <Link href="/tarifs">Découvrir le plan Entreprise</Link>
            </Bouton>
            <Bouton variante="secondaire" asChild>
              <Link href="/dashboard/listes-partagees">Mes listes partagées avec moi</Link>
            </Bouton>
          </div>
        </Carte>
      </div>
    );
  }

  // ── Vue titulaire : chargement défensif (table absente → carte rouge) ──
  let accesBase = true;
  let mesListes: { id: string; nom: string; nbOutils: number }[] = [];
  let partages: {
    id: string;
    listId: string;
    role: string;
    creeLe: Date;
    email: string;
    nom: string | null;
    listeNom: string;
  }[] = [];
  let membresEquipe: { id: string; email: string; nom: string | null }[] = [];

  // La table MembreListe n'existe pas encore tant que la migration du lot 58
  // n'a pas été appliquée. On contourne le typage Prisma pour rester défensif
  // et afficher la carte rouge au lieu de planter à la compilation / exécution.
  const prismaDefensif = prisma as any;

  try {
    const listes = await prisma.list.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, nom: true, _count: { select: { items: true } } },
    });
    mesListes = listes.map((l) => ({ id: l.id, nom: l.nom, nbOutils: l._count.items }));

    const idsListes = mesListes.map((l) => l.id);
    const lignesPartage =
      idsListes.length > 0
        ? await prismaDefensif.membreListe.findMany({
            where: { listId: { in: idsListes } },
            orderBy: { creeLe: "desc" },
          })
        : [];

    // Tables liées en SQL pur (sans relation Prisma) : on charge les
    // noms des utilisateurs et des listes séparément, puis on assemble.
    const idsUsers = [...new Set(lignesPartage.map((p: { userId: string }) => p.userId))] as string[];
    const utilisateurs = await prisma.user.findMany({
      where: { id: { in: idsUsers } },
      select: { id: true, name: true, email: true },
    });
    const utilisateurParId = new Map(utilisateurs.map((u) => [u.id, u]));
    const listeParId = new Map(mesListes.map((l) => [l.id, l]));

    partages = lignesPartage.flatMap(
      (p: { id: string; userId: string; listId: string; role: string; creeLe: Date }) => {
        const utilisateur = utilisateurParId.get(p.userId);
        const liste = listeParId.get(p.listId);
        if (!utilisateur || !liste) return [];
        return [
          {
            id: p.id,
            listId: p.listId,
            role: p.role,
            creeLe: p.creeLe,
            email: utilisateur.email,
            nom: utilisateur.name,
            listeNom: liste.nom,
          },
        ];
      }
    );

    const sieges = await prismaDefensif.membreEntreprise.findMany({
      where: { titulaireId: userId },
      select: { membreId: true },
    });
    const idsMembres = sieges.map((s: { membreId: string }) => s.membreId);
    const comptesMembres =
      idsMembres.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: idsMembres } },
            select: { id: true, name: true, email: true },
          })
        : [];
    membresEquipe = comptesMembres.map((m) => ({ id: m.id, email: m.email, nom: m.name }));
  } catch (erreur) {
    console.error("Partages (chargement) :", erreur);
    accesBase = false;
  }

  return (
    <div className="mx-auto max-w-3xl py-10">
      {/* ── En-tête de la page ───────────────────────────────────── */}
      <header>
        <p className="text-legende text-encre">Bonjour {prenom} 👋</p>
        <h1 className="text-h2 mt-1 font-semibold">Partage des listes</h1>
        <p className="mesure mt-2 text-[14px] leading-6 text-encre">
          Invites un membre de ton équipe sur une de tes listes. Il la retrouve
          dans « Listes partagées avec moi » : LECTEUR la consulte, EDITEUR peut
          y ajouter et retirer des outils.
        </p>
      </header>

      {/* ── Carte de message (retour des actions ?message=…) ──────── */}
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

      {accesBase ? (
        <>
          {/* ── Formulaire d'invitation ──────────────────────────── */}
          <Carte className="mt-6 p-6">
            <div className="flex items-center gap-2">
              <Share2 className="size-5 text-sky-500" aria-hidden />
              <h2 className="text-h3 font-semibold">Partager une liste</h2>
            </div>
            {mesListes.length === 0 ? (
              <div className="mt-4 rounded-champ border border-bordure bg-gris/40 p-4 text-center">
                <p className="text-[14px] leading-6 text-encre">
                  Tu n&apos;as pas encore de liste à partager. Crée ta première liste
                  depuis l&apos;onglet « Mes listes » de ton tableau de bord.
                </p>
                <Bouton variante="secondaire" taille="sm" className="mt-3" asChild>
                  <Link href="/dashboard?onglet=listes">Aller à Mes listes</Link>
                </Bouton>
              </div>
            ) : membresEquipe.length === 0 ? (
              <div className="mt-4 rounded-champ border border-bordure bg-gris/40 p-4 text-center">
                <p className="text-[14px] leading-6 text-encre">
                  Aucun siège n&apos;est occupé dans ton équipe : invite d&apos;abord un
                  collaborateur depuis « Mon équipe », il pourra ensuite être
                  invité sur tes listes.
                </p>
                <Bouton variante="secondaire" taille="sm" className="mt-3" asChild>
                  <Link href="/dashboard/equipe">Aller à Mon équipe</Link>
                </Bouton>
              </div>
            ) : (
              <form action={partagerListeFormulaire} className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="liste-partage"
                      className="mb-1 block text-[13px] leading-4 font-semibold text-encre"
                    >
                      Liste à partager
                    </label>
                    <select id="liste-partage" name="listeId" required className={STYLE_SELECT}>
                      {mesListes.map((liste) => (
                        <option key={liste.id} value={liste.id}>
                          {liste.nom} ({liste.nbOutils} outil{liste.nbOutils > 1 ? "s" : ""})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="role-partage"
                      className="mb-1 block text-[13px] leading-4 font-semibold text-encre"
                    >
                      Droit accordé
                    </label>
                    <select id="role-partage" name="role" defaultValue="LECTEUR" className={STYLE_SELECT}>
                      <option value="LECTEUR">LECTEUR — consulter la liste</option>
                      <option value="EDITEUR">EDITEUR — consulter + modifier</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="email-partage"
                    className="mb-1 block text-[13px] leading-4 font-semibold text-encre"
                  >
                    E-mail du collaborateur (doit occuper un siège de ton équipe)
                  </label>
                  <input
                    id="email-partage"
                    name="email"
                    type="email"
                    required
                    maxLength={160}
                    placeholder="collaborateur@entreprise.com"
                    className={STYLE_SELECT}
                  />
                </div>
                <Bouton type="submit">Partager la liste</Bouton>
              </form>
            )}
          </Carte>

          {/* ── Partages en cours ────────────────────────────────── */}
          <Carte className="mt-6 p-6">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-sky-500" aria-hidden />
              <h2 className="text-h3 font-semibold">
                Partages en cours ({partages.length})
              </h2>
            </div>
            {partages.length === 0 ? (
              <div className="mt-4 rounded-champ border border-bordure bg-gris/40 p-6 text-center">
                <Inbox className="mx-auto size-8 text-encre/40" aria-hidden />
                <p className="mt-2 text-[14px] leading-6 text-encre">
                  Aucune liste partagée pour l&apos;instant. Invite ton premier
                  collaborateur avec le formulaire ci-dessus.
                </p>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-bordure">
                {partages.map((partage) => (
                  <li key={partage.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-titre text-[15px] leading-5 font-semibold">
                          {partage.listeNom}
                        </span>
                        <Badge variante={partage.role === "EDITEUR" ? "agent" : "defaut"}>
                          {partage.role}
                        </Badge>
                      </div>
                      <p className="text-legende mt-0.5 text-encre">
                        {partage.nom ?? "Collaborateur"} · {partage.email} · partagé le{" "}
                        {formateurDate.format(partage.creeLe)}
                      </p>
                    </div>
                    <form
                      action={changerRolePartageFormulaire}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="partageId" value={partage.id} />
                      <select
                        name="role"
                        defaultValue={partage.role}
                        aria-label={`Droit de ${partage.email} sur ${partage.listeNom}`}
                        className="min-h-9 rounded-champ border border-bordure bg-white px-2 text-[13px] leading-5 focus:border-sky-500 focus:outline-none"
                      >
                        <option value="LECTEUR">LECTEUR</option>
                        <option value="EDITEUR">EDITEUR</option>
                      </select>
                      <Bouton type="submit" variante="secondaire" taille="sm">
                        Appliquer
                      </Bouton>
                    </form>
                    <form action={retirerPartageFormulaire}>
                      <input type="hidden" name="partageId" value={partage.id} />
                      <BoutonConfirmer
                        type="submit"
                        message={`Retirer le partage de « ${partage.listeNom} » avec ${partage.email} ?`}
                        aria-label={`Retirer le partage avec ${partage.email}`}
                        className="rounded-[7px]  not-italic px-3 py-1.5 text-[13px] font-semibold text-encre hover:bg-gris hover:text-red-600"
                      >
                        Retirer
                      </BoutonConfirmer>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Carte>

          {/* ── Rappel des membres de l'équipe ───────────────────── */}
          <Carte className="mt-6 p-6">
            <div className="flex items-center gap-2">
              <Info className="size-5 text-sky-500" aria-hidden />
              <h2 className="text-h3 font-semibold">
                Ton équipe ({membresEquipe.length} siège{membresEquipe.length > 1 ? "s" : ""} occupé
                {membresEquipe.length > 1 ? "s" : ""})
              </h2>
            </div>
            <p className="mesure mt-2 text-[14px] leading-6 text-encre">
              Les partages vont uniquement aux comptes qui occupent un siège de
              ton équipe. Les e-mails à inviter :
            </p>
            {membresEquipe.length === 0 ? (
              <p className="mt-3 text-[14px] leading-6 text-encre">
                Aucun siège occupé — invite tes collaborateurs depuis « Mon équipe ».
              </p>
            ) : (
              <ul className="mt-3 space-y-1">
                {membresEquipe.map((membre) => (
                  <li key={membre.id} className="text-[14px] leading-6 text-encre">
                    · {membre.nom ?? "Collaborateur"} — {membre.email}
                  </li>
                ))}
              </ul>
            )}
            <Bouton variante="secondaire" taille="sm" className="mt-4" asChild>
              <Link href="/dashboard/equipe">Gérer mon équipe</Link>
            </Bouton>
          </Carte>
        </>
      ) : (
        // ── Table absente : même carte rouge que la page « Mon équipe » ──
        <Carte className="mt-6 border-red-300 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <ListChecks className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden />
            <div>
              <p className="text-[15px] leading-6 font-semibold text-red-800">
                La base n&apos;est pas encore à jour
              </p>
              <p className="mt-1 text-[14px] leading-6 text-red-700">
                La table « MembreListe » n&apos;existe pas encore : ouvre le
                SQL Editor de Neon et exécute le fichier
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