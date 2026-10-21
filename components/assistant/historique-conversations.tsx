"use client";

import { useCallback, useEffect, useState } from "react";

interface ConversationResume {
  id: string;
  titre: string;
  majLe: string;
  _count: { messages: number };
}

interface Props {
  conversationActive: string | null;
  signal: number; // incrémenté par le parent après chaque réponse → recharge la liste
  onSelectionner: (id: string) => void;
  onNouvelle: () => void;
}

export function HistoriqueConversations({
  conversationActive,
  signal,
  onSelectionner,
  onNouvelle,
}: Props) {
  const [conversations, setConversations] = useState<ConversationResume[]>([]);
  const [chargement, setChargement] = useState(true);

  const recharger = useCallback(async () => {
    try {
      const reponse = await fetch("/api/conversations");
      if (!reponse.ok) {
        setConversations([]);
        return;
      }
      const donnees = await reponse.json();
      setConversations(donnees.conversations ?? []);
    } catch {
      setConversations([]);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    recharger();
  }, [recharger, conversationActive, signal]);

  async function supprimer(id: string) {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (id === conversationActive) onNouvelle();
    else recharger();
  }

  return (
    <aside className="rounded-carte border bg-blanc p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gris">
          Mes conversations
        </h2>
        <button
          type="button"
          onClick={onNouvelle}
          className="rounded-md bg-bleu px-3 py-1.5 text-xs font-medium text-blanc transition hover:bg-bleu-fonce"
        >
          + Nouvelle
        </button>
      </div>

      {chargement ? (
        <p className="py-4 text-center text-sm text-gris">Chargement…</p>
      ) : conversations.length === 0 ? (
        <p className="py-4 text-center text-sm text-gris">
          Aucune conversation pour le moment.
        </p>
      ) : (
        <ul className="grid max-h-96 gap-1 overflow-y-auto">
          {conversations.map((c) => (
            <li key={c.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelectionner(c.id)}
                className={`flex-1 truncate rounded-md px-3 py-2 text-left text-sm transition ${
                  c.id === conversationActive
                    ? "bg-bleu/10 font-medium text-bleu"
                    : "hover:bg-gris-clair"
                }`}
                title={c.titre}
              >
                {c.titre}
                <span className="ml-2 text-xs text-gris">
                  ({c._count.messages} msg)
                </span>
              </button>
              <button
                type="button"
                onClick={() => supprimer(c.id)}
                aria-label={`Supprimer ${c.titre}`}
                className="rounded-md px-2 py-2 text-xs text-gris transition hover:bg-rouge/10 hover:text-rouge"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}