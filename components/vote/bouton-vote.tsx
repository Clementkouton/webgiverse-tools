// components/vote/bouton-vote.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PopupConnexion from "@/components/auth/popup-connexion";

/* ── Icône pouce vers le haut ─────────────────────────────────────── */
function Pouce({ actif, className }: { actif: boolean; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={actif ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

/* ── Bulle d'erreur visible (portail vers <body>) ─────────────────── */
function BulleErreur({
  message,
  onFermer,
}: {
  message: string;
  onFermer: () => void;
}) {
  useEffect(() => {
    const delai = setTimeout(onFermer, 8000);
    return () => clearTimeout(delai);
  }, [message, onFermer]);

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[9999] w-80 rounded-carte border border-red-200 bg-white p-4 shadow-carte">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-600">
            Oups, une erreur est survenue
          </p>
          <p className="mt-1 text-sm leading-5 text-red-600/80">{message}</p>
        </div>
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          className="shrink-0 text-red-400 transition hover:text-red-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>,
    document.body
  );
}

/* ── Bouton « Je recommande » 👍 ──────────────────────────────────── */
function BoutonVote({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const [vote, setVote] = useState(false);
  const [nombre, setNombre] = useState(0);
  const [charge, setCharge] = useState(false);
  const [popupOuvert, setPopupOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Charge l'état actuel du vote au chargement de la page
  useEffect(() => {
    let actif = true;

    fetch(`/api/votes?outil=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!actif || !d) return;
        setNombre(Number(d.nombre ?? 0));
        if (d.vote) setVote(true);
      })
      .catch(() => {});

    return () => {
      actif = false;
    };
  }, [slug]);

  async function basculer() {
    if (charge) return;
    setCharge(true);
    setErreur(null);

    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outil: slug }),
      });

      // Non connecté → popup de connexion (comportement normal)
      if (res.status === 401) {
        setPopupOuvert(true);
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        // ⚠️ Désormais VISIBLE : plus aucun échec silencieux
        console.error("[BoutonVote] Réponse inattendue :", res.status, data);
        setErreur(
          data?.erreur
            ? `Recommandation — ${data.erreur}`
            : `Recommandation — le serveur a répondu ${res.status}. Regardez le terminal du serveur.`
        );
        return;
      }

      setVote(Boolean(data.vote));
      setNombre(Number(data.nombre ?? 0));
    } catch (e) {
      console.error("[BoutonVote] Erreur réseau :", e);
      setErreur("Recommandation — impossible de contacter le serveur.");
    } finally {
      setCharge(false);
    }
  }

  return (
    <>
      {compact ? (
        /* Version compacte pour les cartes d'outils */
        <button
          type="button"
          onClick={basculer}
          disabled={charge}
          aria-pressed={vote}
          aria-label={vote ? "Retirer ma recommandation" : "Recommander cet outil"}
          title={vote ? "Retirer ma recommandation" : "Recommander cet outil"}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition disabled:opacity-60 ${
            vote
              ? "border-violet bg-violet/10 text-violet"
              : "border-bordure bg-white text-encre/70 hover:border-violet hover:text-violet"
          }`}
        >
          <Pouce actif={vote} className="h-4 w-4" />
          {nombre > 0 && <span>{nombre}</span>}
        </button>
      ) : (
        /* Version grande pour la page de l'outil */
        <button
          type="button"
          onClick={basculer}
          disabled={charge}
          aria-pressed={vote}
          className={`inline-flex items-center gap-2 rounded-champ border px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${
            vote
              ? "border-violet bg-violet/10 text-violet"
              : "border-bordure bg-white text-encre hover:border-violet hover:text-violet"
          }`}
        >
          <Pouce actif={vote} className="h-4 w-4" />
          {vote ? "Recommandé" : "Je recommande"}
          {nombre > 0 && <span className="text-encre/50">({nombre})</span>}
        </button>
      )}

      {erreur && <BulleErreur message={erreur} onFermer={() => setErreur(null)} />}

      <PopupConnexion
        ouvert={popupOuvert}
        onFermer={() => setPopupOuvert(false)}
        message="Connectez-vous pour recommander cet outil."
      />
    </>
  );
}

export default BoutonVote;
export { BoutonVote };