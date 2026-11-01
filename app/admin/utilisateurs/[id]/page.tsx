// app/admin/utilisateurs/[id]/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 23 — Fiche membre détaillée, style « TailwindAdmin » :
//   • identité (avatar, nom, e-mail, rôle, date d'inscription) et
//     action « Rendre admin » (sauf son propre compte) ;
//   • 5 tuiles d'activité sur pastilles pastel (favoris, avis,
//     votes, listes, conversations) ;
//   • abonnement Premium (plan, statut en pastille douce, dates),
//     paiements récents (5 derniers) et avis publiés récents.
// Les tableaux vides laissent la place à un état vide illustré.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Crown,
  FolderOpen,
  Heart,
  MessageSquare,
  MessagesSquare,
  ReceiptText,
  ThumbsUp,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { EtatVideAdmin } from "@/components/admin/etat-vide-admin";
import { PASTILLE_TUILE, type Ton } from "@/components/admin/carte-stat-admin";
import { basculerRoleFormulaire } from "@/app/actions/admin";
import { PLANS, formatePrix } from "@/lib/plans";
import { formatteDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Fiche membre — Administration" };
export const dynamic = "force-dynamic";

const formatteurDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Pastille d'état douce — mêmes teintes que Propositions/Abonnements. */
const PASTILLE_STATUT: Record<string, string> = {
  actif: "bg-adm-succes-doux text-[#0b8a78]",
  attente: "bg-adm-alerte-doux text-[#b26f00]",
  echoue: "bg-adm-erreur-doux text-[#c94f35]",
  neutre: "bg-gris text-encre",
};

function Pastille({ ton, children }: { ton: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[12px] leading-4 font-semibold", PASTILLE_STATUT[ton])}>
      {children}
    </span>
  );
}

export default async function PageDetailUtilisateur({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const utilisateur = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      _count: { select: { favorites: true, avis: true, lists: true, votes: true, conversations: true } },
      abonnement: true,
    },
  });
  if (!utilisateur) notFound();

  const [avis, paiements, session] = await Promise.all([
    prisma.avis.findMany({
      where: { utilisateurId: id },
      orderBy: { majLe: "desc" },
      take: 5,
      include: { outil: { select: { nom: true, slug: true } } },
    }),
    prisma.paiement.findMany({
      where: { utilisateurId: id },
      orderBy: { creeLe: "desc" },
      take: 5,
    }),
    auth(),
  ]);

  const estMoi = session?.user?.id === utilisateur.id;
  const initiale = (utilisateur.name ?? utilisateur.email ?? "?").charAt(0).toUpperCase();

  const abonnement = utilisateur.abonnement;
  const maintenant = new Date();
  const aboActif = abonnement && abonnement.statut === "ACTIF" && abonnement.expireLe > maintenant && !abonnement.annuleLe;

  const tuiles: { libelle: string; valeur: number; icone: typeof Heart; ton: Ton }[] = [
    { libelle: "Favoris", valeur: utilisateur._count.favorites, icone: Heart, ton: "succes" },
    { libelle: "Avis publiés", valeur: utilisateur._count.avis, icone: MessageSquare, ton: "primaire" },
    { libelle: "Votes", valeur: utilisateur._count.votes, icone: ThumbsUp, ton: "info" },
    { libelle: "Listes", valeur: utilisateur._count.lists, icone: FolderOpen, ton: "alerte" },
    { libelle: "Conversations", valeur: utilisateur._count.conversations, icone: MessagesSquare, ton: "primaire" },
  ];

  return (
    <div>
      <Link href="/admin/utilisateurs" className="animate-apparition-haut inline-flex items-center gap-1 text-[14px] font-semibold text-primaire-texte hover:underline">
        <ChevronLeft className="size-4" aria-hidden /> Retour aux utilisateurs
      </Link>

      {/* ── Identité ─────────────────────────────────────────────────── */}
      <Carte className="animate-apparition-haut mt-3 flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex min-w-0 items-center gap-4">
          {utilisateur.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={utilisateur.image} alt="" className="size-14 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primaire font-titre text-[22px] font-bold text-white">
              {initiale}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate font-titre text-[20px] leading-7 font-semibold text-adm-sombre">
              {utilisateur.name || "Sans nom"}
            </h1>
            <p className="truncate text-[14px] text-encre">{utilisateur.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] leading-4">
              {utilisateur.role === "ADMIN" ? (
                <span className="inline-flex rounded-full bg-primaire/10 px-2.5 py-0.5 font-semibold text-primaire-texte">Admin</span>
              ) : (
                <span className="inline-flex rounded-full bg-gris px-2.5 py-0.5 font-semibold text-encre">Utilisateur</span>
              )}
              {estMoi && <span className="font-semibold text-primaire-texte">C'est ton compte 👋</span>}
              <span className="text-adm-gris">Inscrit le {formatteDate(utilisateur.createdAt)}</span>
            </div>
          </div>
        </div>
        {!estMoi && utilisateur.role !== "ADMIN" && (
          <form action={basculerRoleFormulaire} className="shrink-0">
            <input type="hidden" name="utilisateurId" value={utilisateur.id} />
            <Bouton taille="sm" variante="indigoDoux" type="submit">Rendre admin</Bouton>
          </form>
        )}
      </Carte>

      {/* ── Activité ─────────────────────────────────────────────────── */}
      <div className="animate-apparition-haut mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {tuiles.map((t) => (
          <Carte key={t.libelle} className="flex items-center gap-4 p-5">
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", PASTILLE_TUILE[t.ton])}>
              <t.icone className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-titre text-[24px] leading-8 font-bold text-adm-sombre">{t.valeur}</span>
              <span className="block truncate text-[13px] leading-4 font-semibold text-adm-gris">{t.libelle}</span>
            </span>
          </Carte>
        ))}
      </div>

      {/* ── Abonnement ───────────────────────────────────────────────── */}
      <section className="animate-apparition-haut mt-10">
        <h2 className="font-titre text-[17px] leading-6 font-semibold text-adm-sombre">Abonnement Premium</h2>
        {abonnement ? (
          <Carte className="mt-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", PASTILLE_TUILE["alerte"])}>
                  <Crown className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-titre text-[16px] leading-6 font-semibold text-adm-sombre">
                    {PLANS[abonnement.plan as "PRO" | "ENTREPRISE"]?.nom ?? abonnement.plan}
                  </p>
                  <p className="text-[13px] text-encre">
                    Depuis le {formatteDate(abonnement.debutLe)} · expire le {formatteDate(abonnement.expireLe)}
                  </p>
                </div>
              </div>
              {aboActif ? (
                <Pastille ton="actif">Actif</Pastille>
              ) : abonnement.annuleLe ? (
                <Pastille ton="neutre">Arrêté</Pastille>
              ) : (
                <Pastille ton="attente">Expiré</Pastille>
              )}
            </div>
          </Carte>
        ) : (
          <Carte className="mt-4">
            <EtatVideAdmin
              icone={Crown}
              ton="alerte"
              titre="Aucun abonnement"
              description="Ce membre n'a pas souscrit à l'offre Premium (ou le schéma Abonnement n'est pas encore installé)."
            />
          </Carte>
        )}
      </section>

      {/* ── Paiements récents ────────────────────────────────────────── */}
      <section className="animate-apparition-haut mt-10">
        <h2 className="font-titre text-[17px] leading-6 font-semibold text-adm-sombre">
          Paiements récents <span className="font-normal text-encre">({paiements.length})</span>
        </h2>
        <Carte className="mt-4 overflow-x-auto p-0">
          {paiements.length === 0 ? (
            <EtatVideAdmin
              icone={ReceiptText}
              ton="info"
              titre="Aucun paiement"
              description="Les paiements de ce membre (simulation ou Moneroo) apparaîtront ici."
            />
          ) : (
            <table className="w-full min-w-150 text-left text-[14px] leading-5">
              <thead className="text-left text-legende text-encre">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-3 py-3">Plan</th>
                  <th className="px-3 py-3">Montant</th>
                  <th className="px-5 py-3 text-right">Statut</th>
                </tr>
              </thead>
              <tbody>
                {paiements.map((p) => (
                  <tr key={p.id} className="border-t border-bordure transition hover:bg-adm-fond/70">
                    <td className="px-5 py-3.5 text-encre">{formatteurDate.format(p.creeLe)}</td>
                    <td className="px-3 py-3.5 text-encre">{PLANS[p.plan as "PRO" | "ENTREPRISE"]?.nom ?? p.plan}</td>
                    <td className="px-3 py-3.5 font-semibold text-adm-sombre">{formatePrix(p.montant)}</td>
                    <td className="px-5 py-3.5 text-right">
                      {p.statut === "PAYE" ? (
                        <Pastille ton="actif">Payé</Pastille>
                      ) : p.statut === "ECHOUE" ? (
                        <Pastille ton="echoue">Échoué</Pastille>
                      ) : (
                        <Pastille ton="attente">En attente</Pastille>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Carte>
      </section>

      {/* ── Avis récents ─────────────────────────────────────────────── */}
      <section className="animate-apparition-haut mt-10">
        <h2 className="font-titre text-[17px] leading-6 font-semibold text-adm-sombre">
          Derniers avis publiés <span className="font-normal text-encre">(5 plus récents)</span>
        </h2>
        {avis.length === 0 ? (
          <Carte className="mt-4">
            <EtatVideAdmin
              icone={MessageSquare}
              ton="info"
              titre="Aucun avis publié"
              description="Ce membre n'a pas encore partagé d'avis sur un outil."
            />
          </Carte>
        ) : (
          <div className="mt-4 grid gap-3">
            {avis.map((a) => (
              <Carte key={a.id} className="p-5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link href={`/outil/${a.outil.slug}`} className="text-[15px] font-semibold text-primaire-texte hover:underline">
                    {a.outil.nom}
                  </Link>
                  <span className="text-[14px] font-semibold text-adm-alerte" aria-label={`Note ${a.note} sur 5`}>
                    {"★".repeat(a.note)}{"☆".repeat(5 - a.note)}
                  </span>
                  <span className="text-[13px] text-adm-gris">{formatteDate(a.majLe)}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-[14px] leading-6 whitespace-pre-line text-encre">{a.contenu}</p>
              </Carte>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
