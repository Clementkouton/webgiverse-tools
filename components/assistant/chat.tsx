// components/assistant/chat.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, Sparkles } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { Carte } from "@/components/ui/carte";
import { schemaMessages } from "@/lib/schemas";
import { ModaleConnexion } from "@/components/auth/modale-connexion";

type Message = { role: "user" | "assistant"; contenu: string };
/** Rendu léger : **Nom** (slug : xxx) devient un lien vers la fiche */
function RenduTexte({ texte }: { texte: string }) {
  const morceaux = texte.split(/(\*\*[^*\n]+\*\*(?:\s*\(slug\s*:\s*[a-z0-9-]+\))?)/g);
  return (
    <>
      {morceaux.map((m, i) => {
        const correspond = m.match(/^\*\*([^*]+)\*\*(?:\s*\(slug\s*:\s*([a-z0-9-]+)\))?$/);
        if (correspond) {
          return correspond[2] ? (
            <Link key={i} href={`/outil/${correspond[2]}`} className="font-semibold text-violet underline-offset-2 hover:underline">
              {correspond[1]}
            </Link>
          ) : (
            <strong key={i}>{correspond[1]}</strong>
          );
        }
        return <span key={i}>{m}</span>;
      })}
    </>
  );
}

export function ChatAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [connecte, setConnecte] = useState<boolean | null>(null);
  const [enCours, setEnCours] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);
  const [modaleOuverte, setModaleOuverte] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json())
      .then((s) => {
        const c = Boolean(s?.user);
        setConnecte(c);
        if (!c) setModaleOuverte(true); // 🔒 la popup s'ouvre toute seule
      }).catch(() => setConnecte(false));
  }, []);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const question = texte.trim();
    if (!question || enCours) return;
    setTexte(""); setErreur(null); setEnCours(false);

    const nouvelles: Message[] = [...messages, { role: "user", contenu: question }];
    // Validation client du même schéma que le serveur
    const valide = schemaMessages.safeParse({ messages: nouvelles.map((m) => ({ role: m.role, contenu: m.contenu })) });
    if (!valide.success) { setErreur("Message invalide."); return; }

    setMessages([...nouvelles, { role: "assistant", contenu: "" }]);
    setEnCours(true);
    try {
      const reponse = await fetch("/api/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nouvelles }),
      });
      if (!reponse.ok) {
        const corps = await reponse.json().catch(() => ({}));
        setErreur(corps.erreur ?? "Une erreur est survenue. Réessaie.");
        setMessages(nouvelles); // retire la bulle vide
        return;
      }
      // Affichage au fil de l'eau
      const lecteur = reponse.body!.getReader();
      const decodeur = new TextDecoder();
      let accumule = "";
      for (;;) {
        const { done, value } = await lecteur.read();
        if (done) break;
        accumule += decodeur.decode(value, { stream: true });
        const snapshot = accumule;
        setMessages((m) => [...m.slice(0, -1), { role: "assistant", contenu: snapshot }]);
      }
    } catch {
      setErreur("Connexion interrompue. Réessaie.");
      setMessages(nouvelles);
    } finally {
      setEnCours(false);
    }
  }
  if (connecte === false) {
    return (
      <>
        <Carte className="p-8 text-center">
          <Sparkles className="mx-auto size-8 text-violet" aria-hidden />
          <h2 className="mt-3 text-h3 font-semibold">Le mode conversation est réservé aux membres</h2>
          <p className="mesure mx-auto mt-2 text-encre">
            Connecte-toi pour discuter avec l'assistant — 20 messages par jour inclus.
          </p>
          <Bouton className="mt-6" onClick={() => setModaleOuverte(true)}>Se connecter</Bouton>
        </Carte>
        <ModaleConnexion ouvert={modaleOuverte} onFermer={() => setModaleOuverte(false)} suite="/assistant" />
      </>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3" aria-live="polite">
        {messages.length === 0 && (
          <Carte className="p-5 text-[15px] leading-6 text-encre">
            Décris ton besoin en une phrase : « Je veux sous-titrer mes vidéos TikTok en français sans y passer mes soirées. »
            L'assistant pioche uniquement dans l'annuaire Webgiverse.
          </Carte>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`mesure max-w-[85%] rounded-carte px-4 py-3 text-[15px] leading-6 ${
              m.role === "user" ? "bg-bleu text-white" : "border border-bordure bg-white text-bleu shadow-carte"}`}>
              <RenduTexte texte={m.contenu || "…"} />
            </div>
          </div>
        ))}
        <div ref={finRef} />
      </div>

      {erreur && (
        <p role="alert" className="rounded-champ border border-red-200 bg-red-50 p-4 text-[14px] leading-5 text-red-700">{erreur}</p>
      )}

      <form onSubmit={envoyer} className="flex gap-2">
        <label htmlFor="chat-saisie" className="sr-only">Ton message</label>
        <input id="chat-saisie" value={texte} onChange={(e) => setTexte(e.target.value)}
          placeholder="Décris ton besoin…" maxLength={4000} disabled={enCours}
          className="min-h-12 flex-1 rounded-full border border-bordure bg-white px-5 text-[16px] leading-6 focus:border-violet focus:outline-none disabled:opacity-60" />
        <Bouton type="submit" disabled={enCours || !texte.trim()} aria-label="Envoyer">
          <ArrowUp aria-hidden />
        </Bouton>
      </form>
      <p className="text-[13px] leading-5 text-encre">Limite : 20 messages par jour. L'assistant ne recommande que des outils réellement référencés.</p>
    </div>
  );
}