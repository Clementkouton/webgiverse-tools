// components/assistant/assistant-client.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, User, Sparkles, Mail, Image as ImageIcon, Presentation, Mic, AlertTriangle, Crown } from "lucide-react";
import { ModeGuide } from "@/components/assistant/mode-guide";
import { HistoriqueConversations } from "@/components/assistant/historique-conversations";

interface MessageChat {
  role: "user" | "assistant";
  contenu: string;
}

type Onglet = "guide" | "libre";

/** Quota calculé côté serveur (page /assistant) et passé en prop. */
type QuotaProp = {
  premium: boolean;
  utilisees: number;
  restantes: number | null; // null = illimité (Premium)
} | null;

const SUGGESTIONS = [
  { icone: Mail, texte: "Le meilleur assistant IA pour rédiger des e-mails" },
  { icone: ImageIcon, texte: "Un outil IA pour générer des images à partir de texte" },
  { icone: Presentation, texte: "Un outil gratuit pour créer des présentations" },
  { icone: Mic, texte: "Un outil pour transcrire des réunions en texte" },
];

export function AssistantOnglets({ quota }: { quota?: QuotaProp }) {
  const [onglet, setOnglet] = useState<Onglet>("guide");
  const [messages, setMessages] = useState<MessageChat[]>([]);
  const [saisie, setSaisie] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [raisonErreur, setRaisonErreur] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [signal, setSignal] = useState(0);
  // Quota du plan (le serveur fait autorité, l'affichage est juste informatif)
  const [premium] = useState<boolean>(quota?.premium ?? false);
  const [restantes, setRestantes] = useState<number | null>(quota?.restantes ?? null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, envoi]);

  async function envoyer() {
    const texte = saisie.trim();
    if (!texte || envoi) return;
    // Si le quota est déjà à 0, inutile d'appeler le serveur
    if (!premium && restantes !== null && restantes <= 0) {
      setErreur(
        "Vous avez utilisé vos 10 questions de ce mois-ci avec le plan Découverte. Passez au plan Pro pour des questions illimitées."
      );
      setRaisonErreur("limite");
      return;
    }

    const nouveaux: MessageChat[] = [...messages, { role: "user", contenu: texte }];
    setMessages(nouveaux);
    setSaisie("");
    setErreur(null);
    setRaisonErreur(null);
    setEnvoi(true);

    try {
      const reponse = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nouveaux, conversationId }),
      });
      const donnees = await reponse.json();

      if (donnees?.raison === "limite") {
        // Quota atteint (réponse 429 du serveur)
        setErreur(donnees.erreur ?? "Votre quota mensuel est atteint.");
        setRaisonErreur("limite");
        setRestantes(0);
      } else if (!reponse.ok || donnees.erreur) {
        setErreur(donnees.erreur ?? "Une erreur est survenue.");
        setRaisonErreur(donnees?.raison ?? null);
      } else {
        setMessages([...nouveaux, { role: "assistant", contenu: donnees.reponse }]);
        if (donnees.conversationId) setConversationId(donnees.conversationId);
        if (typeof donnees.restantes === "number") setRestantes(donnees.restantes);
        setErreur(null);
        setRaisonErreur(null);
        setSignal((s) => s + 1);
      }
    } catch {
      setErreur("Impossible de contacter l'assistant. Vérifiez votre connexion.");
      setRaisonErreur(null);
    } finally {
      setEnvoi(false);
    }
  }

  async function chargerConversation(id: string) {
    setErreur(null);
    setRaisonErreur(null);
    try {
      const reponse = await fetch(`/api/conversations/${id}`);
      const donnees = await reponse.json();
      if (!reponse.ok) {
        setErreur(donnees.erreur ?? "Conversation introuvable.");
        return;
      }
      setMessages(
        (donnees.conversation?.messages ?? []).map(
          (m: { role: string; contenu: string }) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            contenu: m.contenu,
          })
        )
      );
      setConversationId(id);
      setOnglet("libre");
    } catch {
      setErreur("Impossible de charger la conversation.");
    }
  }

  function nouvelleConversation() {
    setMessages([]);
    setConversationId(null);
    setErreur(null);
    setRaisonErreur(null);
    setSignal((s) => s + 1);
  }

  function toucheEntree(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      envoyer();
    }
  }

  const quotaEpuise = !premium && restantes !== null && restantes <= 0;

  return (
    <div className="mt-8">
      {/* Animations CSS locales */}
      <style>{`
        @keyframes fondu { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes pointe { 0%, 80%, 100% { transform: translateY(0); opacity: .4; } 40% { transform: translateY(-4px); opacity: 1; } }
      `}</style>

      {/* ── Onglets ─────────────────────────────────────────────── */}
      <div role="tablist" aria-label="Mode de l'assistant" className="inline-flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-200">
        {(["guide", "libre"] as Onglet[]).map((o) => (
          <button
            key={o}
            type="button"
            role="tab"
            aria-selected={onglet === o}
            onClick={() => setOnglet(o)}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
              onglet === o
                ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow"
                : "text-gray-600 hover:text-indigo-600"
            }`}
          >
            {o === "guide" ? "Mode guidé" : "Chat libre"}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <HistoriqueConversations
          conversationActive={conversationId}
          signal={signal}
          onSelectionner={chargerConversation}
          onNouvelle={nouvelleConversation}
        />

        <section className="min-w-0">
          {onglet === "guide" ? (
            <ModeGuide />
          ) : (
            <div className="flex h-160 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {/* ── En-tête du chat ─────────────────────────────── */}
              <div className="flex items-center gap-3 border-b bg-linear-to-r from-indigo-600 to-violet-600 px-5 py-4 text-white">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30">
                  <Bot className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold">Assistant Webgiverse</p>
                  <p className="flex items-center gap-1.5 text-xs text-white/80">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    En ligne — recommande uniquement des outils de l'annuaire
                  </p>
                </div>
                <Sparkles className="h-5 w-5 text-white/60" />
              </div>

              {/* ── Bandeau quota (plan Découverte) ou Premium ──── */}
              {(premium || restantes !== null) && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-white px-5 py-2 text-xs">
                  {premium ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-violet">
                      <Crown className="h-3.5 w-3.5" aria-hidden />
                      Questions illimitées · merci pour votre abonnement
                    </span>
                  ) : (
                    <>
                      <span className={restantes !== null && restantes <= 3 ? "font-semibold text-amber-600" : "text-gray-500"}>
                        {quotaEpuise
                          ? "Quota mensuel atteint · plan Découverte"
                          : `${restantes} question${restantes !== 1 ? "s" : ""} restante${restantes !== 1 ? "s" : ""} ce mois-ci · plan Découverte`}
                      </span>
                      <a href="/tarifs" className="font-semibold text-violet hover:underline">
                        Passer Premium
                      </a>
                    </>
                  )}
                </div>
              )}

              {/* ── Zone des messages ───────────────────────────── */}
              <div className="flex-1 space-y-5 overflow-y-auto bg-gray-50 p-5">
                {messages.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-lg">
                      <Sparkles className="h-8 w-8" />
                    </span>
                    <div>
                      <p className="text-lg font-semibold text-gray-800">
                        Décrivez votre besoin, je vous propose les outils IA adaptés
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Connectez-vous pour discuter — 10 questions offertes chaque mois.
                      </p>
                    </div>
                    <div className="grid w-full max-w-md gap-2 sm:grid-cols-2">
                      {SUGGESTIONS.map(({ icone: Icone, texte }) => (
                        <button
                          key={texte}
                          type="button"
                          onClick={() => setSaisie(texte)}
                          className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-left text-xs text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                            <Icone className="h-4 w-4" />
                          </span>
                          {texte}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, index) => (
                  <div
                    key={index}
                    style={{ animation: "fondu .3s ease" }}
                    className={`flex items-end gap-2.5 ${
                      m.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {m.role === "assistant" && (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow">
                        <Bot className="h-4 w-4" />
                      </span>
                    )}
                    <div
                      className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        m.role === "user"
                          ? "rounded-br-md bg-linear-to-r from-indigo-600 to-violet-600 text-white"
                          : "rounded-bl-md border border-gray-100 bg-white text-gray-800"
                      }`}
                    >
                      {m.contenu}
                    </div>
                    {m.role === "user" && (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                        <User className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                ))}

                {envoi && (
                  <div className="flex items-end gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow">
                      <Bot className="h-4 w-4" />
                    </span>
                    <div className="flex gap-1.5 rounded-2xl rounded-bl-md border border-gray-100 bg-white px-4 py-4 shadow-sm">
                      {[0, 150, 300].map((delai) => (
                        <span
                          key={delai}
                          style={{ animation: "pointe 1.2s infinite", animationDelay: `${delai}ms` }}
                          className="h-2 w-2 rounded-full bg-indigo-400"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Erreur classique (rouge) — avec lien connexion si besoin */}
                {erreur && raisonErreur !== "limite" && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p>{erreur}</p>
                      {raisonErreur === "non-connecte" && (
                        <a
                          href="/connexion?suite=/assistant"
                          className="mt-2 inline-flex items-center rounded-champ bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                        >
                          Se connecter
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Quota atteint (ambre) — ce n'est pas une erreur, c'est un upsell */}
                {erreur && raisonErreur === "limite" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-800">
                    <p className="font-semibold">Quota mensuel atteint</p>
                    <p className="mt-1 leading-5">{erreur}</p>
                    <a
                      href="/tarifs"
                      className="mt-2.5 inline-flex items-center rounded-champ bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                    >
                      Découvrir les plans Premium
                    </a>
                  </div>
                )}

                <div ref={finRef} />
              </div>

              {/* ── Zone de saisie ──────────────────────────────── */}
              <div className="border-t bg-white p-3.5">
                <div className="flex items-end gap-2">
                  <textarea
                    value={saisie}
                    onChange={(e) => setSaisie(e.target.value)}
                    onKeyDown={toucheEntree}
                    rows={1}
                    placeholder="Ex : un outil gratuit pour le montage vidéo…"
                    className="max-h-32 flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    type="button"
                    onClick={envoyer}
                    disabled={envoi || !saisie.trim() || quotaEpuise}
                    aria-label="Envoyer"
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Send className="h-4.5 w-4.5" />
                  </button>
                </div>
                <p className="mt-2 text-center text-[11px] text-gray-400">
                  Entrée pour envoyer • Maj+Entrée pour une nouvelle ligne
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// Alias : marche avec `import { AssistantClient }` ou `{ AssistantOnglets }`
export { AssistantOnglets as AssistantClient };