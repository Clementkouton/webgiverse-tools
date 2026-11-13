// app/dashboard/listes-partagees/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 57 — idée 19 : côté COLLABORATEUR. Affiche les listes sur
// lesquelles un titulaire Entreprise m'a invité. LECTEUR : lecture.
// EDITEUR : peut ajouter des outils (par slug d'URL) et les retirer.
// Nouveau fichier : aucun autre fichier du site n'est modifié.
// Défensif si la migration SQL du lot 57 n'est pas passée.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ListChecks,
  Plus,
  Trash2,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import {
  ajouterOutilPartageFormulaire,
  quitterCollaborationFormulaire,
  retirerOutilPartageFormulaire,
} from "@/app/actions/collaborations";

export const metadata: Metadata = {
  title: "Listes partagées avec moi — Webgiverse Outils IA",
};
export const dynamic = "force-dynamic";

const formatteurDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

type Props = {
  searchParams: Promise<{ message?: string }>;
};

const MESSAGES: Record<string, { ok: boolean; texte: string }> = {
  ajoute: {
    ok: true,
    texte: "Outil ajouté à la liste.",
  },
  "deja-present": {
    ok: false,
    texte: "Cet outil est déjà dans cette liste.",
  },
  "outil-introuvable": {
    ok: false,
    texte:
      "Aucun outil publié avec ce slug. Le slug est la fin de son URL publique (ex. /outil/chatgpt → chatgpt).",
  },
  retire: {
    ok: true,
    texte: "Outil retiré de la liste.",
  },
  parti: {
    ok: true,
    texte: "Tu as quitté la liste. Tu ne la verras plus dans ton dashboard.",
  },
  introuvable: {
    ok: false,
    texte: "Cet élément n'existe plus (il a peut-être déjà été retiré).",
  },
  "non-autorise": {
    ok: false,
    texte:
      "Tu es LECTEUR sur cette liste : seul l'EDITEUR ou le propriétaire peut la modifier. Demande le rôle Éditeur au propriétaire.",
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
  "inline-flex min-h-11 items-center gap-2 rounded-[7px]  not-italic border border-red-300 bg-white px-4 text-[14px] font-semibold text-red-700 transition hover:bg-red-50";

export default async function PageListesPartagees({ searchParams }: Props) {
  const { message } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?suite=/dashboard/listes-partagees");
  const userId = session.user.id;
  const alerte = message ? MESSAGES[message] : undefined;

  // ── Mes collaborations ──────────────────────────────────────
  let baseOk = true;
  type Collaboration = { listId: string; role: string; depuis: Date };
  let collaborations: Collaboration[] = [];
  try {
    const liens = await prisma.membreListe.findMany({
      where: { userId },
      orderBy: { creeLe: "desc" },
    });
    collaborations = liens.map((lien) => ({
      listId: lien.listId,
      role: lien.role,
      depuis: lien.creeLe,
    }));
  } catch {
    baseOk = false;
  }

  // ── Détails des listes + propriétaires ──────────────────────
  type ListePartagee = {
    id: string;
    nom: string;
    slug: string | null;
    estPublique: boolean;
    proprietaireId: string;
    items: { id: string; tool: { nom: string; slug: string; tarif: string } }[];
  };
  let listes: ListePartagee[] = [];
  let nomsProprietaires = new Map<string, string | null>();
  if (baseOk && collaborations.length > 0) {
    try {
      const idsListes = collaborations.map((collab) => collab.listId);
      const listesBrutes = await prisma.list.findMany({
        where: { id: { in: idsListes } },
        select: {
          id: true,
          nom: true,
          slug: true,
          estPublique: true,
          userId: true,
          items: {
            orderBy: { createdAt: "asc" as const },
            select: {
              id: true,
              tool: { select: { nom: true, slug: true, tarif: true } },
            },
          },
        },
      });
      listes = listesBrutes.map((liste) => ({
        id: liste.id,
        nom: liste.nom,
        slug: liste.slug,
        estPublique: liste.estPublique,
        proprietaireId: liste.userId,
        items: liste.items.map((item) => ({
          id: item.id,
          tool: item.tool,
        })),
      }));
      const idsProprietaires = [...new Set(listes.map((liste) => liste.proprietaireId))];
      const proprietaires = await prisma.user.findMany({
        where: { id: { in: idsProprietaires } },
        select: { id: true, name: true, email: true },
      });
      nomsProprietaires = new Map(
        proprietaires.map((proprietaire) => [
          proprietaire.id,
          proprietaire.name ?? proprietaire.email,
        ])
      );
    } catch {
      baseOk = false;
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:py-10">
      <h1 className="flex items-center gap-2 text-h2 font-semibold">
        <ListChecks className="size-7 text-sky-500" aria-hidden /> Listes
        partagées avec moi
      </h1>
      <p className="mt-1 text-[14px] leading-5 text-encre/70">
        Les listes sur lesquelles un titulaire Entreprise t&apos;a invité. En
        lecture seule (LECTEUR) ou avec droits d&apos;édition (EDITEUR).
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

      {!baseOk && (
        <Carte className="mt-4 flex items-start gap-3 border-red-300 bg-red-50 p-4 text-[14px] leading-5 text-red-800">
          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            La base de données n&apos;est pas encore à jour : exécute le
            fichier <strong>prisma/migration-niveau3.sql</strong> dans le SQL
            Editor de Neon (lot 57), puis recharge cette page.
          </span>
        </Carte>
      )}

      {baseOk && listes.length === 0 && (
        <Carte className="animate-apparition-haut mt-6 p-6 text-center">
          <p className="text-[15px] font-semibold text-encre">
            Aucune liste partagée avec toi pour le moment
          </p>
          <p className="mx-auto mt-2 max-w-xl text-[14px] leading-5 text-encre/70">
            Quand un abonné Entreprise t&apos;invitera sur une de ses listes
            (par ton adresse e-mail), elle apparaîtra ici automatiquement.
          </p>
          <Bouton asChild taille="md" className="mt-4">
            <Link href="/tarifs">Découvrir le plan Entreprise</Link>
          </Bouton>
        </Carte>
      )}

      {listes.map((liste) => {
        const collaboration = collaborations.find((c) => c.listId === liste.id);
        const role = collaboration?.role ?? "LECTEUR";
        const editeur = role === "EDITEUR";
        const nomProprietaire =
          nomsProprietaires.get(liste.proprietaireId) ?? "le propriétaire";
        return (
          <Carte key={liste.id} className="animate-apparition-haut mt-6 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-encre">
                  {liste.nom}
                  <span
                    className={`ml-2 rounded-[7px]  not-italic px-2 py-0.5 text-[11px] font-bold ${
                      editeur
                      ? "bg-violet/10 text-sky-500"
                        : "bg-encre/10 text-encre/60"
                    }`}
                  >
                    {editeur ? "ÉDITEUR" : "LECTEUR"}
                  </span>
                </p>
                <p className="truncate text-[13px] text-encre/60">
                  partagée par {nomProprietaire} · depuis le{" "}
                  {collaboration ? formatteurDate.format(collaboration.depuis) : "—"}{" "}
                  · {liste.items.length} outil
                  {liste.items.length > 1 ? "s" : ""}
                </p>
              </div>
              {liste.slug && (
                <Link
                  href={`/listes/${liste.slug}`}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-[7px]  not-italic border border-bordure bg-white px-3 text-[12px] font-semibold text-encre transition hover:bg-gris"
                >
                  <ExternalLink className="size-3.5" aria-hidden /> Page publique
                </Link>
              )}
            </div>

            {editeur && (
              <form
                action={ajouterOutilPartageFormulaire}
                className="mt-4 flex flex-wrap items-center gap-3"
              >
                <input type="hidden" name="listId" value={liste.id} />
                <input
                  type="text"
                  name="slug"
                  required
                  placeholder="Slug de l'outil (ex. chatgpt)"
                  className={`min-h-11 flex-1 ${styleChamp}`}
                />
                <Bouton type="submit" taille="sm">
                  <Plus aria-hidden /> Ajouter l&apos;outil
                </Bouton>
              </form>
            )}

            {liste.items.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {liste.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-champ border border-bordure bg-gris p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-encre">
                        {item.tool.nom}
                      </p>
                      <p className="truncate text-[13px] text-encre/60">
                        {item.tool.tarif}
                      </p>
                    </div>
                    {editeur && (
                      <form action={retirerOutilPartageFormulaire}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <BoutonConfirmer
                          type="submit"
                          message={`Retirer « ${item.tool.nom} » de la liste ?`}
                          className={styleBoutonRouge}
                        >
                          <Trash2 className="size-4" aria-hidden /> Retirer
                        </BoutonConfirmer>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[14px] leading-5 text-encre/70">
                Cette liste est vide pour le moment.
              </p>
            )}

            <form action={quitterCollaborationFormulaire} className="mt-4">
              <input type="hidden" name="listId" value={liste.id} />
              <BoutonConfirmer
                type="submit"
                message={`Quitter la liste « ${liste.nom} » ? Tu perdras l'accès (le propriétaire pourra te réinviter).`}
                className={styleBoutonRouge}
              >
                <Trash2 className="size-4" aria-hidden /> Quitter cette liste
              </BoutonConfirmer>
            </form>
          </Carte>
        );
      })}
    </div>
  );
}
