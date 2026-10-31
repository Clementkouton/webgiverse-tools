// app/dashboard/assistant/page.tsx
// Lot 19 — « Mes conversations » : l'historique des échanges avec
// l'assistant IA. Chaque conversation s'ouvre directement dans
// /assistant?c=<id> (rechargée dans le chat). Suppression possible.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bot,
  ChevronLeft,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { premiumActif, quotaAssistant } from "@/lib/premium";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/badge";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import { supprimerConversationFormulaire } from "@/app/actions/apprentissage";

export const metadata: Metadata = { title: "Mes conversations — Webgiverse" };
export const dynamic = "force-dynamic";

const formatteurDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

type ConversationResume = {
  id: string;
  titre: string;
  majLe: Date;
  _count: { messages: number };
  dernierMessage: string | null;
};

export default async function PageMesConversations() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?suite=/dashboard/assistant");
  const userId = session.user.id;

  const [premium, quota] = await Promise.all([premiumActif(userId), quotaAssistant(userId)]);

  // Lecture défensive : la table Conversation existe déjà (Lot assistant),
  // mais on garde la même robustesse que les autres pages du dashboard.
  let conversations: ConversationResume[] = [];
  try {
    const brutes = await prisma.conversation.findMany({
      where: { utilisateurId: userId },
      orderBy: { majLe: "desc" },
      select: {
        id: true,
        titre: true,
        majLe: true,
        _count: { select: { messages: true } },
        messages: { orderBy: { creeLe: "desc" }, take: 1, select: { contenu: true } },
      },
    });
    conversations = brutes.map((c) => ({
      id: c.id,
      titre: c.titre,
      majLe: c.majLe,
      _count: c._count,
      dernierMessage: c.messages[0]?.contenu ?? null,
    }));
  } catch {
    conversations = [];
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:py-10">
      <Link
        href="/dashboard"
        className="inline-flex min-h-9 items-center gap-1 text-[13px] leading-4 font-semibold text-encre transition hover:text-violet"
      >
        <ChevronLeft className="size-4" aria-hidden /> Tableau de bord
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-h2 font-semibold">
          <Bot className="size-7 text-violet" aria-hidden /> Mes conversations
          <Badge variante="defaut">{conversations.length}</Badge>
        </h1>
        <Bouton asChild>
          <Link href="/assistant">
            <Plus className="size-4" aria-hidden /> Nouvelle conversation
          </Link>
        </Bouton>
      </div>
      <p className="mt-1 text-encre">
        {premium
          ? "L'historique complet de tes échanges avec l'assistant IA, rouvrable en un clic."
          : `L'historique de tes échanges avec l'assistant. Plan Découverte : ${quota.restantes ?? 0} question${(quota.restantes ?? 0) > 1 ? "s" : ""} restante${(quota.restantes ?? 0) > 1 ? "s" : ""} ce mois-ci.`}
      </p>

      {/* ── État vide ─────────────────────────────────────────────── */}
      {conversations.length === 0 && (
        <Carte className="mt-8 p-10 text-center">
          <Bot className="mx-auto size-10 text-violet" aria-hidden />
          <h2 className="mt-3 font-titre text-[18px] leading-6 font-semibold text-bleu">
            Aucune conversation pour l&apos;instant
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-encre">
            Décris ton besoin à l&apos;assistant Webgiverse : il te recommande
            des outils de l&apos;annuaire adaptés à ton objectif, ton niveau et ton budget.
          </p>
          <Bouton asChild className="mt-5">
            <Link href="/assistant">Discuter avec l&apos;assistant</Link>
          </Bouton>
        </Carte>
      )}

      {/* ── Liste des conversations ───────────────────────────────── */}
      {conversations.length > 0 && (
        <ul className="mt-8 grid gap-3">
          {conversations.map((conversation) => (
            <li
              key={conversation.id}
              className="survol-carte flex flex-wrap items-center gap-4 rounded-carte border border-bordure bg-white p-4 shadow-carte"
            >
              <span
                aria-hidden
                className="grid size-11 shrink-0 place-items-center rounded-carte bg-ciel/15 text-[#00648a]"
              >
                <MessageSquare className="size-5" aria-hidden />
              </span>

              <div className="min-w-0 flex-1 basis-64">
                <h2 className="truncate font-titre text-[15px] leading-5 font-semibold text-bleu">
                  {conversation.titre}
                </h2>
                <p className="mt-0.5 line-clamp-1 text-[13px] leading-5 text-encre">
                  {conversation.dernierMessage ?? "Conversation vide"}
                </p>
                <p className="mt-0.5 text-[12px] leading-4 text-encre">
                  {conversation._count.messages} message
                  {conversation._count.messages > 1 ? "s" : ""} · dernière activité le{" "}
                  {formatteurDate.format(conversation.majLe)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Bouton asChild taille="sm" variante="secondaire">
                  <Link href={`/assistant?c=${conversation.id}`}>Ouvrir</Link>
                </Bouton>
                <form action={supprimerConversationFormulaire}>
                  <input type="hidden" name="conversationId" value={conversation.id} />
                  <BoutonConfirmer
                    message={`Supprimer définitivement « ${conversation.titre} » et ses messages ?`}
                    aria-label={`Supprimer la conversation ${conversation.titre}`}
                    className="grid size-9 place-items-center rounded-full border border-bordure bg-white text-encre transition hover:border-red-300 hover:text-red-500 active:scale-95"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </BoutonConfirmer>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
