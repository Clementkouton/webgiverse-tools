// app/admin/moderation/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 25 — MODÉRATION CENTRALISÉE : tout ce qui attend une décision
// humaine sur une seule page :
//   1. propositions d'outils en attente (approuver → publie la fiche,
//      ou refuser) — réutilise les actions de app/actions/admin.ts ;
//   2. messages de contact non traités (répondre par e-mail / marquer
//      traité / supprimer) — actions de app/actions/moderation.ts.
// Chaque section indique son compteur ; style TailwindAdmin, aucune
// librairie externe.
//
// LOT 71 — RÉPONDRE AUX MESSAGES AVEC LE LIEN DE PAIEMENT :
//   chaque message de contact gagne un panneau « Répondre »
//   (components/admin/panneau-reponse-message.tsx) : réponse par
//   e-mail avec les liens de paiement Chariow des annonceurs
//   (CHARIOW_URL_SEMAINE / CHARIOW_URL_MOIS) et brouillon rédigé par
//   l'assistant (/api/admin/messages/reponse-ia). Aucune migration.
//
// LOT 72 — CORRECTIFS :
//   1. DÉBORDEMENT RÉPARÉ : le panneau « Répondre » est sorti de la
//      rangée d'actions (flex shrink-0) — enfant direct de la carte,
//      pleine largeur, il ne peut plus la pousser hors de l'écran ;
//   2. NOUVELLE SECTION « HISTORIQUE DES MODÉRATIONS » : les 12
//      dernières traces du journal liées à la modération (messages
//      répondus / traités / supprimés, brouillons de l'assistant,
//      propositions approuvées / refusées, avis supprimés), avec le
//      même code couleur que la page /admin/journal.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  History,
  Inbox,
  MailOpen,
  Trash2,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { Bouton } from "@/components/ui/bouton";
import { EtatVideAdmin } from "@/components/admin/etat-vide-admin";
import { PanneauReponseMessage } from "@/components/admin/panneau-reponse-message";
import {
  approuverPropositionFormulaire,
  refuserPropositionFormulaire,
  supprimerAvisAdminFormulaire,
} from "@/app/actions/admin";
import {
  marquerMessageTraiteFormulaire,
  supprimerMessageContactFormulaire,
} from "@/app/actions/moderation";
import { formatteDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Modération — Administration" };
export const dynamic = "force-dynamic";

/** Pastille de compteur (ambre s'il y a du travail, menthe sinon). */
function Puce({ nb, libelle }: { nb: number; libelle: string }) {
  return (
    <Badge
      className={
        nb > 0
          ? "border-transparent bg-adm-alerte-doux text-[#b26f00]"
          : "border-transparent bg-adm-succes-doux text-[#0b8a78]"
      }
    >
      {nb > 0 ? `${nb} ${libelle}` : "À jour"}
    </Badge>
  );
}

/** Couleur douce de la pastille d'action (identique à /admin/journal). */
function pastilleAction(action: string): string {
  if (action.startsWith("EXPORT")) return "bg-adm-info-doux text-[#2b6be0]";
  if (/SUPPRIME|REFUSE/.test(action)) return "bg-adm-erreur-doux text-[#c94f35]";
  if (/CREE|APPROUVE|PUBLIE|REPONDU/.test(action))
    return "bg-adm-succes-doux text-[#0b8a78]";
  return "bg-adm-alerte-doux text-[#b26f00]";
}

/** Actions du journal qui concernent la modération (LOT 72). */
const ACTIONS_MODERATION = [
  "CONTACT_REPONDU",
  "CONTACT_REPONSE_IA",
  "CONTACT_TRAITE",
  "CONTACT_SUPPRIME",
  "PROPOSITION_APPROUVEE",
  "PROPOSITION_REFUSEE",
  "AVIS_SUPPRIME",
] as const;

export default async function PageModerationAdmin() {
  // LOT 71 — liens de paiement Chariow des formules annonceurs
  // (lus côté serveur, jamais exposés avant l'envoi de la réponse).
  const lienSemaine = process.env.CHARIOW_URL_SEMAINE?.trim() || null;
  const lienMois = process.env.CHARIOW_URL_MOIS?.trim() || null;

  const [propositions, messages, avis, nbPropositions, nbMessages, tracesModeration] =
    await Promise.all([
      prisma.toolSubmission.findMany({
        where: { statut: "EN_ATTENTE" },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { category: true },
      }),
      prisma.messageContact.findMany({
        where: { traite: false },
        orderBy: { creeLe: "desc" },
        take: 20,
      }),
      prisma.avis.findMany({
        orderBy: { creeLe: "desc" },
        take: 8,
        include: { outil: { select: { nom: true, slug: true } }, utilisateur: { select: { name: true, email: true } } },
      }),
      prisma.toolSubmission.count({ where: { statut: "EN_ATTENTE" } }),
      prisma.messageContact.count({ where: { traite: false } }),
      // LOT 72 — historique des modérations (journal d'audit filtré).
      prisma.journalAdmin.findMany({
        where: { action: { in: [...ACTIONS_MODERATION] } },
        orderBy: { creeLe: "desc" },
        take: 12,
      }),
    ]);

  const totalATraiter = nbPropositions + nbMessages;

  return (
    <div className="mx-auto px-4 pb-10 sm:px-6 lg:px-8">
      <div className="animate-apparition-haut flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h3 font-semibold">Modération</h1>
          <p className="mt-1 text-[14px] leading-6 text-encre">
            Tout ce qui attend une décision, réuni sur une seule page : propositions, contacts, avis.
          </p>
        </div>
        {totalATraiter > 0 ? (
          <Badge className="border-transparent bg-adm-alerte-doux text-[#b26f00]">
            {totalATraiter} à traiter
          </Badge>
        ) : (
          <Badge className="border-transparent bg-adm-succes-doux text-[#0b8a78]">Tout est à jour</Badge>
        )}
      </div>

      {/* ══ 1. Propositions d'outils en attente ══════════════════════ */}
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-titre text-[17px] leading-6 font-semibold text-adm-sombre">
            <Inbox className="size-4.5 text-primaire" aria-hidden /> Propositions d'outils
          </h2>
          <Puce nb={nbPropositions} libelle="en attente" />
        </div>

        <div className="mt-3 grid gap-3">
          {propositions.length === 0 ? (
            <Carte className="p-5">
              <p className="text-[14px] text-encre">Aucune proposition en attente — les nouvelles arrivées s'afficheront ici (et sur la cloche 🔔).</p>
            </Carte>
          ) : (
            propositions.map((p) => (
              <Carte key={p.id} className="animate-apparition-haut p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-titre text-[16px] leading-6 font-semibold">{p.nom}</h3>
                      {p.category && <Badge variante="source">{p.category.nom}</Badge>}
                      <span className="text-[12px] text-adm-gris-clair">{formatteDate(p.createdAt)}</span>
                    </div>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 text-[13px] text-primaire-texte hover:underline"
                    >
                      {p.url} <ArrowUpRight className="size-3.5" aria-hidden />
                    </a>
                    <p className="mt-1.5 max-w-2xl text-[14px] leading-6 text-encre">{p.description}</p>
                    {p.tarif && <p className="mt-1 text-[12px] text-adm-gris">Tarif déclaré : {p.tarif}</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <form action={approuverPropositionFormulaire}>
                      <input type="hidden" name="propositionId" value={p.id} />
                      <Bouton type="submit" variante="indigo">Approuver et publier</Bouton>
                    </form>
                    <form action={refuserPropositionFormulaire}>
                      <input type="hidden" name="propositionId" value={p.id} />
                      <Bouton type="submit" variante="secondaire">Refuser</Bouton>
                    </form>
                  </div>
                </div>
              </Carte>
            ))
          )}
          {nbPropositions > propositions.length && (
            <Link href="/admin/propositions" className="text-[13px] font-semibold text-primaire-texte hover:underline">
              Voir toutes les propositions →
            </Link>
          )}
        </div>
      </section>

      {/* ══ 2. Messages de contact non traités ═══════════════════════ */}
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-titre text-[17px] leading-6 font-semibold text-adm-sombre">
            <MailOpen className="size-4.5 text-primaire" aria-hidden /> Messages de contact
          </h2>
          <Puce nb={nbMessages} libelle="non traités" />
        </div>

        <div className="mt-3 grid gap-3">
          {messages.length === 0 ? (
            <Carte className="p-5">
              <p className="text-[14px] text-encre">Aucun message de contact en attente de réponse.</p>
            </Carte>
          ) : (
            messages.map((m) => (
              <Carte key={m.id} className="animate-apparition-haut p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-titre text-[16px] leading-6 font-semibold">{m.sujet}</h3>
                      <span className="text-[12px] text-adm-gris-clair">{formatteDate(m.creeLe)}</span>
                    </div>
                    <p className="mt-0.5 text-[13px] text-encre">
                      <span className="font-semibold">{m.nom}</span> · <a href={`mailto:${m.email}`} className="text-primaire-texte hover:underline">{m.email}</a>
                    </p>
                    <p className="mt-1.5 max-w-2xl whitespace-pre-line text-[14px] leading-6 text-encre">{m.message}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <form action={marquerMessageTraiteFormulaire}>
                      <input type="hidden" name="messageId" value={m.id} />
                      <Bouton type="submit" variante="indigoDoux">Marquer traité</Bouton>
                    </form>
                    <form action={supprimerMessageContactFormulaire}>
                      <input type="hidden" name="messageId" value={m.id} />
                      <Bouton type="submit" variante="secondaire" aria-label="Supprimer ce message">
                        <Trash2 className="size-4" aria-hidden /> Supprimer
                      </Bouton>
                    </form>
                  </div>
                </div>

                {/* LOT 72 — le panneau « Répondre » est un enfant direct
                    de la carte (et non plus un élément de la rangée
                    d'actions « shrink-0 ») : pleine largeur, il ne peut
                    plus faire déborder la carte hors de l'écran. */}
                <PanneauReponseMessage
                  message={{ id: m.id, nom: m.nom, email: m.email, sujet: m.sujet, texte: m.message }}
                  lienSemaine={lienSemaine}
                  lienMois={lienMois}
                />
              </Carte>
            ))
          )}
        </div>
      </section>

      {/* ══ 3. Historique des modérations (LOT 72) ═══════════════════ */}
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-titre text-[17px] leading-6 font-semibold text-adm-sombre">
            <History className="size-4.5 text-primaire" aria-hidden /> Historique des modérations
          </h2>
          {tracesModeration.length > 0 && (
            <Badge className="border-transparent bg-adm-info-doux text-[#2b6be0]">
              {tracesModeration.length} dernière{tracesModeration.length > 1 ? "s" : ""} action{tracesModeration.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        <div className="mt-3 grid gap-3">
          {tracesModeration.length === 0 ? (
            <Carte className="p-5">
              <p className="text-[14px] text-encre">
                Aucune action de modération enregistrée pour l'instant. Chaque réponse envoyée, message
                traité ou supprimé, proposition approuvée ou refusée et avis modéré sera tracé ici
                automatiquement.
              </p>
            </Carte>
          ) : (
            <Carte className="animate-apparition-haut p-0">
              <ul className="divide-y divide-bordure">
                {tracesModeration.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-start gap-x-3 gap-y-1.5 px-4 py-3 sm:px-5">
                    <span
                      className={cn(
                        "inline-block shrink-0 whitespace-nowrap rounded-[7px] px-2.5 py-1 text-[11px] font-bold",
                        pastilleAction(t.action)
                      )}
                    >
                      {t.action}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[13.5px] font-medium text-adm-sombre">{t.cible}</p>
                      {t.details && (
                        <p className="mt-0.5 break-words text-[12.5px] text-encre">{t.details}</p>
                      )}
                    </div>
                    <p className="shrink-0 text-[12px] text-adm-gris">
                      {formatteDate(t.creeLe)}
                      <span className="block text-[11px] text-adm-gris-clair">
                        {t.adminNom ?? "Admin"} ·{" "}
                        {t.creeLe.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </Carte>
          )}
          <Link href="/admin/journal" className="text-[13px] font-semibold text-primaire-texte hover:underline">
            Voir tout le journal d'audit →
          </Link>
        </div>
      </section>

    </div>
  );
}