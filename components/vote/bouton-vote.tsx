// components/outil/coeur-favori.tsx

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PopupConnexion from "@/components/auth/popup-connexion";

/* ── Bulle d'erreur visible (portail vers <body>) ───────────────────── */
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
    <div className="fixed bottom-4 right-4 z-9999 w-80 rounded-carte border border-red-200 bg-white p-4 shadow-carte">
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

export default function CoeurFavori({ slug }: { slug: string }) {
  const [favori, setFavori] = useState(false);
  const [charge, setCharge] = useState(false);
  const [popupOuvert, setPopupOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;

    fetch(`/api/favoris?outil=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (actif && data?.connecte && data?.favori) setFavori(true);
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
      const res = await fetch("/api/favoris", {
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
        console.error("[CoeurFavori] Réponse inattendue :", res.status, data);
        setErreur(
          data?.erreur
            ? `Favoris — ${data.erreur}`
            : `Favoris — le serveur a répondu ${res.status}. Regardez le terminal du serveur.`
        );
        return;
      }

      setFavori(Boolean(data.favori));
    } catch (e) {
      console.error("[CoeurFavori] Erreur réseau :", e);
      setErreur("Favoris — impossible de contacter le serveur.");
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
        aria-label={favori ? "Retirer des favoris" : "Ajouter aux favoris"}
        title={favori ? "Retirer des favoris" : "Ajouter aux favoris"}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-bordure bg-white shadow-sm transition hover:scale-105 disabled:opacity-60"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={favori ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 ${favori ? "text-violet" : "text-encre/40"}`}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </button>

      {erreur && <BulleErreur message={erreur} onFermer={() => setErreur(null)} />}

      <PopupConnexion
        ouvert={popupOuvert}
        onFermer={() => setPopupOuvert(false)}
        message="Connectez-vous pour enregistrer cet outil dans vos favoris."
      />
    </>
  );
}