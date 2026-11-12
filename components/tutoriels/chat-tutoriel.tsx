// components/tutoriels/chat-tutoriel.tsx
// Lot 36 — ASSISTANT IA DU TUTORIEL : résumé du tuto + questions/réponses
// à partir du contenu du tutoriel (titre, chapitres, ressources, extraits).
// Lot 64 — CORRECTIONS D'AFFICHE (aucun changement de comportement) :
//   1. La réponse de l'assistant est maintenant rendue AVEC LE COMPOSANT
//      RenduMarkdown : titres ##, **gras**, listes « - », `code` et liens
//      s'affichent en vrais éléments (avant : tout en texte brut).
//   2. Les 3 boutons de suggestions passent en whitespace-normal : le
//      libellé long (« Fais-moi un plan d'apprentissage… ») revient sur
//      2 lignes au lieu de déborder hors de la carte (le composant Bouton
//      a whitespace-nowrap en dur, ici on le dérompte via tailwind-merge).
//   3. Fil de discussion : overflow-x-hidden de sécurité + min-w-0 sur
//      les bulles — aucun élément ne peut plus pousser la carte en largeur.
// Lot 65 — HISTORIQUE PERSISTANT (aucun changement visuel) :
//   1. Nouvelle prop messagesInitiaux : la page du tutoriel relit la
//      conversation dans la table MessageChatTutoriel (comme la note
//      personnelle) et la transmet ici — le fil réapparaît après F5.
//   2. La requête n'envoie plus l'historique : la route relit elle-même
//      les 6 derniers messages en base (source de vérité unique).
// Style strictement identique à la charte (mêmes couleurs, mêmes arrondis).
"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Send, Sparkles, TriangleAlert } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { Champ } from "@/components/ui/champ";
import { RenduMarkdown } from "@/components/ui/rendu-markdown";

type MessageChat = { role: "user" | "assistant"; contenu: string };

const SUGGESTIONS = [
  "Résume-moi ce tutoriel en quelques points",
  "De quels outils ai-je besoin pour suivre ce tutoriel ?",
  "Fais-moi un plan d'apprentissage à partir de ce tutoriel",
];

export function ChatTutoriel({
  slug,
  titre,
  messagesInitiaux = [],
}: {
  slug: string;
  titre: string;
  messagesInitiaux?: MessageChat[];
}) {
  const [ouvert, setOuvert] = useState(true);
  // Lot 65 — le fil démarre avec l'historique relu en base par la page
  // (50 derniers messages) ; vide au premier passage sur ce tuto.
  const [messages, setMessages] = useState<MessageChat[]>(messagesInitiaux);
  const [champ, setChamp] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  // Reste collé au dernier message (comportement chat).
  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, enCours]);

  async function envoyer(texte: string) {
    const message = texte.trim();
    if (!message || enCours) return;
    setEchec(null);
    setChamp("");
    setEnCours(true);

    // Lot 65 — plus d'historique envoyé au serveur : la route le relit
    // dans la table MessageChatTutoriel (elle enregistrera elle-même
    // cet échange dès que la réponse aboutira).
    setMessages([...messages, { role: "user", contenu: message }]);

    try {
      const reponse = await fetch(`/api/tutoriels/${encodeURIComponent(slug)}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const donnees = (await reponse.json().catch(() => null)) as
        | { reponse?: string; erreur?: string }
        | null;

      if (!reponse.ok) {
        setEchec(
          donnees?.erreur ??
            `L'assistant est momentanément indisponible (erreur ${reponse.status}) — réessaie dans un instant.`,
        );
        setMessages(messages); // retire le message user resté sans réponse
      } else if (donnees?.reponse) {
        setMessages([
          ...messages,
          { role: "user", contenu: message },
          { role: "assistant", contenu: String(donnees.reponse) },
        ]);
      } else {
        setEchec("L'assistant a renvoyé une réponse vide — réessaie.");
        setMessages(messages);
      }
    } catch {
      setEchec("Impossible de contacter l'assistant — vérifie ta connexion puis réessaie.");
      setMessages(messages);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <section
      aria-label="Assistant IA du tutoriel"
      className="min-w-0 rounded-carte border border-bordure bg-white p-5 shadow-carte"
    >
      {/* ── En-tête (repliable) ───────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        className="flex w-full flex-wrap items-center gap-2.5 text-left"
      >
        <span className="grid size-8 place-items-center rounded-lg bg-violet/10 text-violet" aria-hidden>
          <Sparkles className="size-4" />
        </span>
        <span className="font-titre text-[15px] leading-5 font-bold text-bleu">
          Assistant IA du tutoriel
        </span>
        <span className="inline-flex items-center gap-1 rounded-[7px] -skew-x-[18deg] not-italic bg-violet/10 px-2 py-0.5 text-[10px] leading-3.5 font-bold text-violet">
          Premium
        </span>
        <ChevronDown
          className={`ml-auto size-4 shrink-0 text-encre transition-transform ${ouvert ? "" : "-rotate-90"}`}
          aria-hidden
        />
      </button>

      {ouvert && (
        <>
          <p className="mt-2 text-[13px] leading-5 text-encre">
            Pose tes questions sur « {titre} » : l&apos;assistant répond à partir
            du contenu du tutoriel. Il ne connaît que ce tuto — pas le reste du site.
          </p>

          {/* ── Fil de discussion ─────────────────────────────────── */}
          {messages.length > 0 && (
            <div className="mt-3 max-h-[420px] space-y-2.5 overflow-x-hidden overflow-y-auto rounded-carte bg-gris/40 p-3">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <p
                    key={i}
                    className="ml-auto w-fit min-w-0 max-w-[85%] rounded-2xl rounded-br-sm bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] px-3.5 py-2 text-[13px] leading-5 text-white break-words"
                  >
                    {m.contenu}
                  </p>
                ) : (
                  <div
                    key={i}
                    className="w-fit min-w-0 max-w-[92%] rounded-2xl rounded-bl-sm border border-bordure bg-white px-3.5 py-2.5 text-[13px] leading-5 text-bleu break-words"
                  >
                    {/* Lot 64 — réponse rendue en Markdown : titres, gras,
                        listes, code et liens s'affichent proprement. */}
                    <RenduMarkdown contenu={m.contenu} />
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

          {/* ── Suggestions (avant la 1re question) ────────────────── */}
          {messages.length === 0 && !enCours && (
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <Bouton
                  key={s}
                  variante="secondaire"
                  taille="sm"
                  // Lot 64 — whitespace-normal : le libellé long revient à
                  // la ligne au lieu de déborder hors de la carte.
                  className="min-h-9 whitespace-normal px-3 py-1.5 text-left text-[12px] leading-4"
                  onClick={() => void envoyer(s)}
                >
                  {s}
                </Bouton>
              ))}
            </div>
          )}

          {/* ── Saisie ────────────────────────────────────────────── */}
          <form
            className="mt-3 flex items-center gap-2"
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
              className="min-h-10 flex-1 bg-gris/40 text-[14px] leading-5"
            />
            <Bouton
              type="submit"
              taille="sm"
              disabled={enCours || champ.trim().length === 0}
              className="min-h-10 px-4"
            >
              {enCours ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
              Envoyer
            </Bouton>
          </form>

          {/* ── Échec ─────────────────────────────────────────────── */}
          {echec && (
            <p
              aria-live="polite"
              className="mt-2 flex items-start gap-1.5 rounded-carte border border-amber-300 bg-amber-50 p-2 text-[12px] leading-4 text-encre"
            >
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />
              <span>{echec}</span>
            </p>
          )}
        </>
      )}
    </section>
  );
}