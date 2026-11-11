// components/tutoriels/chat-tutoriel.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Send, Sparkles, TriangleAlert } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { Champ } from "@/components/ui/champ";

type MessageChat = { role: "user" | "assistant"; contenu: string };

const SUGGESTIONS = [
  "Résume-moi ce tutoriel en quelques points",
  "De quels outils ai-je besoin pour suivre ce tutoriel ?",
  "Fais-moi un plan d'apprentissage à partir de ce tutoriel",
];

function formaterContenuAssistant(texte: string) {
  const lignes = texte.split("\n");
  return lignes.map((ligne, index) => {
    if (ligne.trim().startsWith("- ") || ligne.trim().startsWith("* ")) {
      return (
        <li key={index} className="ml-4 list-disc pl-1 my-1 leading-snug">
          {ligne.trim().substring(2)}
        </li>
      );
    }
    return (
      <p key={index} className="my-1 leading-relaxed break-words">
        {ligne}
      </p>
    );
  });
}

export function ChatTutoriel({ slug, titre }: { slug: string; titre: string }) {
  const [ouvert, setOuvert] = useState(true);
  const [messages, setMessages] = useState<MessageChat[]>([]);
  const [champ, setChamp] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  // Charger l'historique depuis la base de données (API) au montage
  useEffect(() => {
    async function chargerHistorique() {
      try {
        const res = await fetch(`/api/tutoriels/${encodeURIComponent(slug)}/assistant`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages) {
            setMessages(
              data.messages.map((m: { role: string; contenu: string }) => ({
                role: m.role,
                contenu: m.contenu,
              }))
            );
          }
        }
      } catch {
        // Ignorer en cas d'erreur réseau
      }
    }
    chargerHistorique();
  }, [slug]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, enCours]);

  async function envoyer(texte: string) {
    const message = texte.trim();
    if (!message || enCours) return;
    setEchec(null);
    setChamp("");
    setEnCours(true);

    const historique = messages.slice(-6);
    const nouveauxMessages: MessageChat[] = [...messages, { role: "user", contenu: message }];
    setMessages(nouveauxMessages);

    try {
      const reponse = await fetch(`/api/tutoriels/${encodeURIComponent(slug)}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, historique }),
      });
      const donnees = await reponse.json().catch(() => null);

      if (!reponse.ok) {
        setEchec(donnees?.erreur ?? `Erreur ${reponse.status} — réessaie.`);
        setMessages(messages); // Annule si échec
      } else if (donnees?.reponse) {
        setMessages([
          ...nouveauxMessages,
          { role: "assistant", contenu: String(donnees.reponse) },
        ]);
      } else {
        setEchec("Réponse vide de l'assistant.");
        setMessages(messages);
      }
    } catch {
      setEchec("Impossible de contacter l'assistant.");
      setMessages(messages);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <section
      aria-label="Assistant IA du tutoriel"
      className="w-full min-w-0 max-w-full rounded-carte border border-bordure bg-white p-5 shadow-carte overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        className="flex w-full min-w-0 flex-wrap items-center gap-2.5 text-left"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet/10 text-violet" aria-hidden>
          <Sparkles className="size-4" />
        </span>
        <span className="font-titre text-[15px] leading-5 font-bold text-bleu truncate">
          Assistant IA du tutoriel
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet/10 px-2 py-0.5 text-[10px] leading-3.5 font-bold text-violet">
          Premium
        </span>
        <ChevronDown
          className={`ml-auto size-4 shrink-0 text-encre transition-transform ${ouvert ? "" : "-rotate-90"}`}
          aria-hidden
        />
      </button>

      {ouvert && (
        <div className="min-w-0">
          <p className="mt-2 text-[13px] leading-5 text-encre break-words">
            Pose tes questions sur « {titre} » : l&apos;assistant répond à partir
            du contenu du tutoriel.
          </p>

          {messages.length > 0 && (
            <div className="mt-3 max-h-[420px] space-y-2.5 overflow-y-auto rounded-carte bg-gris/40 p-3 min-w-0">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end min-w-0">
                    <p className="w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] px-3.5 py-2 text-[13px] leading-5 text-white break-words">
                      {m.contenu}
                    </p>
                  </div>
                ) : (
                  <div key={i} className="flex justify-start min-w-0">
                    <div className="w-full max-w-[95%] rounded-2xl rounded-bl-sm border border-bordure bg-white px-3.5 py-2.5 text-[13px] leading-5 text-bleu break-words min-w-0 overflow-hidden">
                      {formaterContenuAssistant(m.contenu)}
                    </div>
                  </div>
                ),
              )}
              {enCours && (
                <p className="flex items-center gap-2 text-[12px] leading-4 text-encre">
                  <Loader2 className="size-3.5 animate-spin text-violet" aria-hidden />
                  L&apos;assistant rédige sa réponse…
                </p>
              )}
              <div ref={finRef} />
            </div>
          )}

          {messages.length === 0 && !enCours && (
            <div className="mt-3 flex flex-wrap gap-2 min-w-0">
              {SUGGESTIONS.map((s) => (
                <Bouton
                  key={s}
                  variante="secondaire"
                  taille="sm"
                  className="min-h-9 px-3 text-[12px] whitespace-normal text-left h-auto py-2"
                  onClick={() => void envoyer(s)}
                >
                  {s}
                </Bouton>
              ))}
            </div>
          )}

          <form
            className="mt-3 flex items-center gap-2 min-w-0"
            onSubmit={(e) => {
              e.preventDefault();
              void envoyer(champ);
            }}
          >
            <Champ
              value={champ}
              onChange={(e) => setChamp(e.target.value)}
              placeholder="Ta question sur ce tutoriel…"
              aria-label="Ta question pour l'assistant du tutoriel"
              maxLength={1000}
              className="min-h-10 flex-1 bg-gris/40 text-[14px] leading-5 min-w-0"
            />
            <Bouton
              type="submit"
              taille="sm"
              disabled={enCours || champ.trim().length === 0}
              className="min-h-10 px-4 shrink-0"
            >
              {enCours ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
              Envoyer
            </Bouton>
          </form>

          {echec && (
            <p
              aria-live="polite"
              className="mt-2 flex items-start gap-1.5 rounded-carte border border-amber-300 bg-amber-50 p-2 text-[12px] leading-4 text-encre break-words"
            >
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />
              <span>{echec}</span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}