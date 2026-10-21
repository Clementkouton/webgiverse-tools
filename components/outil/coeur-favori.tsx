// components/outil/coeur-favori.tsx

"use client";

import { useEffect, useState } from "react";
import PopupConnexion from "@/components/auth/popup-connexion";

export default function CoeurFavori({ slug }: { slug: string }) {
  const [favori, setFavori] = useState(false);
  const [charge, setCharge] = useState(false);
  const [popupOuvert, setPopupOuvert] = useState(false);

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

    try {
      const res = await fetch("/api/favoris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outil: slug }),
      });

      if (res.status === 401) {
        setPopupOuvert(true);
        return;
      }

      const data = await res.json();
      if (res.ok) setFavori(Boolean(data.favori));
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

      <PopupConnexion
        ouvert={popupOuvert}
        onFermer={() => setPopupOuvert(false)}
        message="Connectez-vous pour enregistrer cet outil dans vos favoris."
      />
    </>
  );
}