// components/vote/bouton-vote.tsx
"use client";

import { useEffect, useState } from "react";
import PopupConnexion from "@/components/auth/popup-connexion";

export default function BoutonVote({
  slug,
  compact = false,
}: {
  slug: string;
  compact?: boolean;
}) {
  const [vote, setVote] = useState(false);
  const [nombre, setNombre] = useState(0);
  const [charge, setCharge] = useState(false);
  const [popupOuvert, setPopupOuvert] = useState(false);

  useEffect(() => {
    let actif = true;
    fetch(`/api/votes?outil=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (actif && d) {
          setVote(Boolean(d.vote));
          setNombre(Number(d.nombre ?? 0));
        }
      })
      .catch(() => {});
    return () => {
      actif = false;
    };
  }, [slug]);

  async function basculer() {
    if (charge) return;
    setCharge(true);
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outil: slug }),
      });

      if (res.status === 401) {
        setPopupOuvert(true);
        return;
      }

      const d = await res.json();
      if (res.ok) {
        setVote(Boolean(d.vote));
        setNombre(Number(d.nombre ?? 0));
      }
    } catch {
      // erreur réseau ignorée
    } finally {
      setCharge(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={basculer}
        disabled={charge}
        aria-pressed={vote}
        title={vote ? "Retirer ma recommandation" : "Je recommande cet outil"}
        className={
          compact
            ? `inline-flex h-9 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition disabled:opacity-60 ${
                vote
                  ? "border-violet bg-violet/10 text-violet"
                  : "border-bordure bg-white text-encre/60 hover:text-violet"
              }`
            : `inline-flex items-center gap-2 rounded-champ border px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${
                vote
                  ? "border-violet bg-violet/10 text-violet"
                  : "border-bordure bg-white text-encre hover:border-violet hover:text-violet"
              }`
        }
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={vote ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
        >
          <path d="M7 10v12" />
          <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
        </svg>
        {!compact && <span>{vote ? "Recommandé" : "Je recommande"}</span>}
        {nombre > 0 && <span>{nombre}</span>}
      </button>

      <PopupConnexion
        ouvert={popupOuvert}
        onFermer={() => setPopupOuvert(false)}
        message="Connectez-vous pour recommander cet outil."
      />
    </>
  );
}