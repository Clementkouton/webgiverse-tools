// app/modeles/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 57 — idée 22 : page publique des modèles de listes.
// Tout le monde peut consulter ; le clonage est réservé au plan
// Entreprise (bouton « Utiliser ce modèle »). Défensif : si la
// migration SQL du lot 57 n'est pas passée, page « bientôt
// disponible », jamais d'erreur 500.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  BookMarked,
  CheckCircle2,
  Eye,
  Users,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { entrepriseActif } from "@/lib/premium";
import { dupliquerModeleFormulaire } from "@/app/actions/collaborations";

export const metadata: Metadata = {
  title: "Modèles de listes — Webgiverse Outils IA",
  description:
    "Des sélections d'outils IA prêtes à cloner : Marketing, Contenu, Développeurs… Utilise un modèle en un clic avec le plan Entreprise.",
};
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ message?: string }>;
};

const MESSAGES: Record<string, { ok: boolean; texte: string }> = {
  "non-autorise": {
    ok: false,
    texte:
      "Le clonage de modèles est réservé au plan Entreprise. Passe Entreprise pour utiliser ce modèle en un clic.",
  },
  introuvable: {
    ok: false,
    texte: "Ce modèle n'existe plus (la liste a peut-être été retirée).",
  },
  base: {
    ok: false,
    texte:
      "La base de données n'est pas encore à jour : exécute le fichier prisma/migration-niveau3.sql dans le SQL Editor de Neon (lot 57), puis recharge cette page.",
  },
};

export default async function PageModeles({ searchParams }: Props) {
  const { message } = await searchParams;
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const alerte = message ? MESSAGES[message] : undefined;
  const connecte = Boolean(userId);
  const entreprise = userId ? await entrepriseActif(userId) : false;

  // ── Modèles publics ─────────────────────────────────────────
  let baseOk = true;
  type Modele = {
    id: string;
    nom: string;
    slug: string | null;
    proprietaire: string | null;
    nbOutils: number;
  };
  let modeles: Modele[] = [];
  try {
    const liens = await prisma.modeleListe.findMany({
      orderBy: { creeLe: "desc" },
      take: 24,
      select: { listId: true },
    });
    if (liens.length > 0) {
      const listes = await prisma.list.findMany({
        where: {
          id: { in: liens.map((lien) => lien.listId) },
          estPublique: true,
        },
        select: {
          id: true,
          nom: true,
          slug: true,
          user: { select: { name: true } },
          _count: { select: { items: true } },
        },
      });
      modeles = listes.map((liste) => ({
        id: liste.id,
        nom: liste.nom,
        slug: liste.slug,
        proprietaire: liste.user?.name ?? null,
        nbOutils: liste._count.items,
      }));
    }
  } catch {
    // migration lot 57 pas passée
    baseOk = false;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="flex items-center justify-center gap-2 text-h2 font-semibold">
          <BookMarked className="size-7 text-violet" aria-hidden /> Modèles de
          listes
        </h1>
        <p className="mt-2 text-[15px] leading-6 text-encre/70">
          Des sélections d&apos;outils IA construites par la communauté
          Entreprise, prêtes à cloner dans ton dashboard : tu récupères la
          liste complète chez toi, tu la modifies librement.
        </p>
      </div>

      {alerte && (
        <Carte
          className={`animate-apparition-haut mx-auto mt-6 flex max-w-3xl items-start gap-3 p-4 text-[14px] leading-5 ${
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

      {!baseOk && (
        <Carte className="mx-auto mt-6 max-w-3xl p-6 text-center">
          <p className="text-[15px] font-semibold text-encre">
            Les modèles arrivent bientôt
          </p>
          <p className="mx-auto mt-2 max-w-xl text-[14px] leading-5 text-encre/70">
            Cette section s&apos;activera dès que la migration du lot 57 sera
            exécutée sur la base (prisma/migration-niveau3.sql dans le SQL
            Editor de Neon).
          </p>
        </Carte>
      )}

      {baseOk && modeles.length === 0 && (
        <Carte className="mx-auto mt-8 max-w-3xl p-6 text-center">
          <p className="text-[15px] font-semibold text-encre">
            Aucun modèle pour le moment
          </p>
          <p className="mx-auto mt-2 max-w-xl text-[14px] leading-5 text-encre/70">
            Les abonnés Entreprise peuvent proposer leurs listes publiques
            comme modèles depuis l&apos;Espace Entreprise. Reviens bientôt !
          </p>
        </Carte>
      )}

      {modeles.length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modeles.map((modele) => (
            <Carte
              key={modele.id}
              className="animate-apparition-haut flex flex-col p-5"
            >
              <p className="text-[15px] font-semibold text-encre">
                {modele.nom}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-encre/60">
                <Users className="size-3.5" aria-hidden /> par{" "}
                {modele.proprietaire ?? "un abonné Entreprise"}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-encre/60">
                <Eye className="size-3.5" aria-hidden /> {modele.nbOutils} outil
                {modele.nbOutils > 1 ? "s" : ""} dans la liste
              </p>
              <div className="mt-4 flex flex-1 flex-col justify-end gap-2">
                {modele.slug && (
                  <Bouton asChild taille="sm" variante="secondaire" className="w-full">
                    <Link href={`/listes/${modele.slug}`}>Voir la liste</Link>
                  </Bouton>
                )}
                {!connecte ? (
                  <Bouton asChild taille="sm" className="w-full">
                    <Link href="/connexion?suite=/modeles">
                      Se connecter pour cloner
                    </Link>
                  </Bouton>
                ) : entreprise ? (
                  <form action={dupliquerModeleFormulaire}>
                    <input type="hidden" name="listId" value={modele.id} />
                    <Bouton type="submit" taille="sm" className="w-full">
                      Utiliser ce modèle
                    </Bouton>
                  </form>
                ) : (
                  <Bouton asChild taille="sm" className="w-full">
                    <Link href="/tarifs">Réservé au plan Entreprise</Link>
                  </Bouton>
                )}
              </div>
            </Carte>
          ))}
        </div>
      )}

      <Carte className="mx-auto mt-10 max-w-3xl p-6 text-center">
        <p className="text-[15px] font-semibold text-encre">
          Tu veux proposer TES listes comme modèles ?
        </p>
        <p className="mx-auto mt-2 max-w-xl text-[14px] leading-5 text-encre/70">
          Partage une liste publiquement, puis marque-la comme modèle depuis
          l&apos;Espace Entreprise : elle apparaîtra ici et pourra être clonée
          par les abonnés Entreprise.
        </p>
        <Bouton asChild taille="md" className="mt-4">
          <Link href="/dashboard/entreprise">Ouvrir l&apos;Espace Entreprise</Link>
        </Bouton>
      </Carte>
    </div>
  );
}
