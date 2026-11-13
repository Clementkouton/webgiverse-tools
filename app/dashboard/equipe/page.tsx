// app/dashboard/equipe/page.tsx
// ─────────────────────────────────────────────────────────────────
// Page « Mon équipe » — plan Entreprise (lot 54).
// Le titulaire d'un abonnement Entreprise actif attribue jusqu'à
// MAX_MEMBRES_EQUIPE sièges ; chaque membre invité bénéficie
// automatiquement des avantages Entreprise (voir lib/premium.ts).
// Trois affichages : titulaire (gestion des sièges), membre invité
// (statut + départ volontaire), ni l'un ni l'autre (invitation à
// passer Entreprise). Défensif si la migration SQL n'est pas passée.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Crown,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import { MAX_MEMBRES_EQUIPE } from "@/lib/premium";
import {
  ajouterMembreFormulaire,
  quitterEquipeFormulaire,
  retirerMembreFormulaire,
} from "@/app/actions/equipe";

export const metadata: Metadata = {
  title: "Mon équipe — Webgiverse Outils IA",
};
export const dynamic = "force-dynamic";

const formatteurDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

type Props = {
  searchParams: Promise<{ message?: string }>;
};

const MESSAGES: Record<string, { ok: boolean; texte: string }> = {
  ajoute: {
    ok: true,
    texte:
      "Siège attribué : la personne reçoit les avantages Entreprise dès sa prochaine visite (un e-mail de prévenance lui a été envoyé).",
  },
  retire: {
    ok: true,
    texte: "Le siège a été libéré. La personne repassera automatiquement au plan Découverte (ses données personnelles sont conservées).",
  },
  parti: {
    ok: true,
    texte: "Tu as quitté l'équipe. Tu peux rejoindre une autre équipe plus tard ou prendre ton propre abonnement.",
  },
  "email-invalide": {
    ok: false,
    texte: "Adresse e-mail invalide : vérifie le format (ex. prenom@domaine.com).",
  },
  "compte-introuvable": {
    ok: false,
    texte: "Aucun compte Webgiverse avec cette adresse e-mail. La personne doit d'abord créer un compte (gratuit), puis tu pourras lui attribuer un siège.",
  },
  "deja-siege": {
    ok: false,
    texte: "Ce compte occupe déjà un siège dans une autre équipe Entreprise.",
  },
  limite: {
    ok: false,
    texte: `Tous les sièges sont déjà utilisés (${MAX_MEMBRES_EQUIPE} maximum). Libère un siège avant d'en attribuer un nouveau.`,
  },
  "soi-meme": {
    ok: false,
    texte: "Impossible de t'inviter toi-même : ton abonnement Entreprise t'offre déjà tous les avantages.",
  },
  "non-autorise": {
    ok: false,
    texte: "Seul un abonné Entreprise actif peut gérer une équipe.",
  },
  introuvable: {
    ok: false,
    texte: "Ce siège n'existe plus (il a peut-être déjà été libéré).",
  },
  base: {
    ok: false,
    texte: "La base de données n'est pas encore à jour : exécute le fichier prisma/migration-sieges-equipe.sql dans le SQL Editor de Neon (lot 54), puis recharge cette page.",
  },
};

const AVANTAGES_EQUIPE = [
  "Favoris, listes et « Mes prompts » illimités",
  "Assistant IA illimité",
  "Lecture complète des tutoriels vidéo et des prompts",
  "Export PDF / CSV de leurs favoris et de leurs listes",
];

export default async function PageMonEquipe({ searchParams }: Props) {
  const { message } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?suite=/dashboard/equipe");
  const userId = session.user.id;

  const maintenant = new Date();
  const alerte = message ? MESSAGES[message] : undefined;

  // ── 1) Abonnement personnel ─────────────────────────────────
  let abonnement: {
    plan: string;
    statut: string;
    expireLe: Date;
  } | null = null;
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

  // ── 2) Sièges gérés (vue titulaire) ─────────────────────────
  const prismaEquipe = prisma as any;
  type LigneMembre = {
    membreId: string;
    nom: string | null;
    email: string;
    depuis: Date;
  };
  let membres: LigneMembre[] = [];
  let tableEquipeOk = true;
  try {
    const lignes = await prismaEquipe.membreEntreprise.findMany({
      where: { titulaireId: userId },
      orderBy: { creeLe: "asc" },
    });
    const infos = lignes.length
      ? await prisma.user.findMany({
          where: { id: { in: lignes.map((l: any) => l.membreId) } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const parId = new Map(infos.map((i: any) => [i.id, i]));
    membres = lignes.map((l: any) => ({
      membreId: l.membreId,
      nom: parId.get(l.membreId)?.name ?? null,
      email: parId.get(l.membreId)?.email ?? "(compte introuvable)",
      depuis: l.creeLe,
    }));
  } catch {
    // table MembreEntreprise absente → migration lot 54 pas passée
    tableEquipeOk = false;
  }

  // ── 3) Siège occupé (vue membre) ────────────────────────────
  let siegeActif: {
    nom: string | null;
    email: string | null;
    expireLe: Date;
  } | null = null;
  let siegeInactif = false;
  try {
    const lien = await prismaEquipe.membreEntreprise.findUnique({
      where: { membreId: userId },
      select: { titulaireId: true },
    });
    if (lien) {
      const [titulaire, aboTitulaire] = await Promise.all([
        prisma.user.findUnique({
          where: { id: lien.titulaireId },
          select: { name: true, email: true },
        }),
        prisma.abonnement.findUnique({
          where: { utilisateurId: lien.titulaireId },
          select: { plan: true, statut: true, expireLe: true },
        }),
      ]);
      const equipeActive = Boolean(
        aboTitulaire &&
          aboTitulaire.plan === "ENTREPRISE" &&
          aboTitulaire.statut === "ACTIF" &&
          aboTitulaire.expireLe > maintenant
      );
      if (equipeActive && aboTitulaire) {
        siegeActif = {
          nom: titulaire?.name ?? null,
          email: titulaire?.email ?? null,
          expireLe: aboTitulaire.expireLe,
        };
      } else {
        siegeInactif = true;
      }
    }
  } catch {
    // table absente → pas de siège connu
  }

  const stylesListeAvantages =
    "mt-3 space-y-2 text-[14px] leading-5 text-encre";
  const styleBoutonRouge =
    "inline-flex min-h-11 items-center gap-2 rounded-[7px]  not-italic border border-red-300 bg-white px-4 text-[14px] font-semibold text-red-700 transition hover:bg-red-50";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:py-10">
      <h1 className="flex items-center gap-2 text-h2 font-semibold">
        <Users className="size-7 text-sky-500" aria-hidden /> Mon équipe
      </h1>

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

      {!tableEquipeOk && (
        <Carte className="mt-4 flex items-start gap-3 border-red-300 bg-red-50 p-4 text-[14px] leading-5 text-red-800">
          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            La base de données n&apos;est pas encore à jour : exécute le fichier{" "}
            <strong>prisma/migration-sieges-equipe.sql</strong> dans le SQL
            Editor de Neon (lot 54), puis recharge cette page. En attendant,
            aucune donnée d&apos;équipe n&apos;est perdue ni modifiée.
          </span>
        </Carte>
      )}

      {entreprisePerso ? (
        <>
          {/* ── Vue titulaire ─────────────────────────────── */}
          <Carte className="animate-apparition-haut mt-6 border-violet/40 bg-violet/5 p-6">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-sky-500">
              <Crown className="size-5" aria-hidden /> Équipe Entreprise
            </p>
            <p className="mt-1.5 text-[14px] leading-5 text-encre">
              {abonnement && (
                <>
                  Ton abonnement est actif jusqu&apos;au{" "}
                  <strong>{formatteurDate.format(abonnement.expireLe)}</strong>.
                </>
              )}{" "}
              Offre jusqu&apos;à <strong>{MAX_MEMBRES_EQUIPE} sièges</strong> à
              ton équipe, ta famille ou tes clients : chaque membre profite des
              mêmes avantages que toi, avec son propre compte. Si ton
              abonnement expire, les sièges se désactivent automatiquement —
              rien à gérer.
            </p>
          </Carte>

          <Carte className="mt-6 p-6">
            <p className="text-[15px] font-semibold text-encre">
              <UserPlus className="mr-2 inline size-5 text-sky-500" aria-hidden />
              Attribuer un siège
            </p>
            <p className="mt-1 text-[13px] leading-5 text-encre/70">
              Saisis l&apos;adresse e-mail d&apos;un compte Webgiverse existant
              — {membres.length}/{MAX_MEMBRES_EQUIPE} sièges utilisés.
            </p>
            <form
              action={ajouterMembreFormulaire}
              className="mt-4 flex flex-wrap items-center gap-3"
            >
              <input
                type="email"
                name="email"
                required
                placeholder="prenom@domaine.com"
                className="min-h-11 flex-1 rounded-champ border border-bordure bg-white px-4 text-[14px] text-encre placeholder:text-encre/40 focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/30"
              />
              <Bouton type="submit" taille="sm">
                <UserPlus aria-hidden /> Inviter
              </Bouton>
            </form>
          </Carte>

          <Carte className="mt-6 p-6">
            <p className="text-[15px] font-semibold text-encre">
              <Users className="mr-2 inline size-5 text-sky-500" aria-hidden />
              Membres de ton équipe ({membres.length})
            </p>
            {membres.length === 0 ? (
              <p className="mt-3 text-[14px] leading-5 text-encre/70">
                Aucun siège attribué pour le moment. Chaque membre garde ses
                propres favoris et ses propres listes : seuls les avantages
                Premium s&apos;activent pour lui aussi.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {membres.map((m) => (
                  <li
                    key={m.membreId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-champ border border-bordure bg-gris p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-encre">
                        {m.nom || m.email}
                      </p>
                      <p className="truncate text-[13px] text-encre/60">
                        {m.nom ? `${m.email} · ` : ""}siège depuis le{" "}
                        {formatteurDate.format(m.depuis)}
                      </p>
                    </div>
                    <form action={retirerMembreFormulaire}>
                      <input type="hidden" name="membreId" value={m.membreId} />
                      <BoutonConfirmer
                        type="submit"
                        message={`Libérer le siège de ${m.nom || m.email} ? La personne repassera au plan Découverte.`}
                        className={styleBoutonRouge}
                      >
                        <Trash2 className="size-4" aria-hidden /> Libérer
                      </BoutonConfirmer>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Carte>

          <Carte className="mt-6 p-6">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-encre">
              <ShieldCheck className="size-5 text-sky-500" aria-hidden /> Ce que
              voient tes membres
            </p>
            <ul className={stylesListeAvantages}>
              {AVANTAGES_EQUIPE.map((avantage) => (
                <li key={avantage} className="flex items-start gap-2">
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-sky-500"
                    aria-hidden
                  />{" "}
                  {avantage}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] leading-5 text-encre/70">
              Chaque membre garde son compte et ses données personnelles : seuls
              les avantages Premium sont partagés. Un siège ne donne pas le
              droit de créer sa propre équipe.
            </p>
          </Carte>
        </>
      ) : siegeActif ? (
        <>
          {/* ── Vue membre invité ─────────────────────────── */}
          <Carte className="animate-apparition-haut mt-6 border-violet/40 bg-violet/5 p-6">
              <p className="flex items-center gap-2 text-[15px] font-semibold text-sky-500">
              <Crown className="size-5" aria-hidden /> Tu profites de Webgiverse
              Entreprise
            </p>
            <p className="mt-1.5 text-[14px] leading-5 text-encre">
              Ton siège a été attribué par
              {siegeActif.nom ? <strong> {siegeActif.nom}</strong> : " ton titulaire"}
              {siegeActif.email ? (
                <>
                  {" "}
                  <span className="text-encre/70">({siegeActif.email})</span>
                </>
              ) : null}
              . Avantages actifs jusqu&apos;au{" "}
              <strong>{formatteurDate.format(siegeActif.expireLe)}</strong>.
            </p>
          </Carte>

          <Carte className="mt-6 p-6">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-encre">
                <ShieldCheck className="size-5 text-sky-500" aria-hidden /> Tes
              avantages actuels
            </p>
            <ul className={stylesListeAvantages}>
              {AVANTAGES_EQUIPE.map((avantage) => (
                <li key={avantage} className="flex items-start gap-2">
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-sky-500"
                    aria-hidden
                  />{" "}
                  {avantage}
                </li>
              ))}
            </ul>
          </Carte>

          <Carte className="mt-6 p-6">
            <p className="text-[15px] font-semibold text-encre">
              Quitter l&apos;équipe
            </p>
            <p className="mt-1 text-[13px] leading-5 text-encre/70">
              Tu perdras les avantages Entreprise et repasseras au plan
              Découverte — tes favoris, tes listes et tes avis sont conservés.
            </p>
            <form action={quitterEquipeFormulaire} className="mt-4">
              <BoutonConfirmer
                type="submit"
                message="Quitter l'équipe ? Tu perdras les avantages Entreprise (tes données personnelles restent intactes)."
                className={styleBoutonRouge}
              >
                <Trash2 className="size-4" aria-hidden /> Quitter l&apos;équipe
              </BoutonConfirmer>
            </form>
          </Carte>
        </>
      ) : (
        <>
          {/* ── Vue non-Entreprise ────────────────────────── */}
          {siegeInactif && (
            <Carte className="mt-6 flex items-start gap-3 border-amber-300 bg-amber-50 p-4 text-[14px] leading-5 text-amber-800">
              <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
              <span>
                Ton siège d&apos;équipe existe toujours, mais l&apos;abonnement
                Entreprise du titulaire n&apos;est plus actif : les avantages
                sont suspendus tant qu&apos;il n&apos;est pas renouvelé.
              </span>
            </Carte>
          )}
          <Carte className="animate-apparition-haut mt-6 p-6 text-center">
            <p className="flex items-center justify-center gap-2 text-[15px] font-semibold text-encre">
                  <Crown className="size-5 text-sky-500" aria-hidden /> La gestion
              d&apos;équipe est réservée au plan Entreprise
            </p>
            <p className="mx-auto mt-2 max-w-xl text-[14px] leading-5 text-encre/70">
              Avec le plan Entreprise ($7,99/mois), tu offres jusqu&apos;à{" "}
              {MAX_MEMBRES_EQUIPE} sièges à ton équipe, ta famille ou tes
              clients : chaque membre profite des mêmes avantages que toi, avec
              son propre compte.
            </p>
            <Bouton asChild taille="md" className="mt-4">
              <Link href="/tarifs">Découvrir le plan Entreprise</Link>
            </Bouton>
          </Carte>
        </>
      )}
    </div>
  );
}