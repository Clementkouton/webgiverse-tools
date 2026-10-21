"use client";

import { useEffect, useState } from "react";
import { basculerFavori } from "@/app/actions/favoris";
import PopupConnexion from "@/components/auth/popup-connexion";

function BoutonFavori({ outilId, slug }: { outilId: string; slug: string }) {
  const [favori, setFavori] = useState(false);
  const [charge, setCharge] = useState(false);
  const [popupOuvert, setPopupOuvert] = useState(false);

  useEffect(() => {
    fetch(`/api/favoris?outil=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.connecte && data?.favori) setFavori(true);
      })
      .catch(() => {});
  }, [slug]);

  async function cliquer() {
    if (charge) return;
    setCharge(true);

    try {
      const data: any = await basculerFavori(outilId);

      if (data?.raison === "non-connecte") {
        setPopupOuvert(true);
        return;
      }

      if (typeof data?.favori === "boolean") {
        setFavori(data.favori);
      } else if (data?.ok !== false) {
        setFavori((v) => !v);
      }
    } finally {
      setCharge(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={cliquer}
        disabled={charge}
        className={`inline-flex items-center gap-2 rounded-champ border px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${
          favori
            ? "border-violet bg-violet/10 text-violet"
            : "border-bordure bg-white text-encre hover:border-violet hover:text-violet"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={favori ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        {favori ? "Dans vos favoris" : "Ajouter aux favoris"}
      </button>

      <PopupConnexion
        ouvert={popupOuvert}
        onFermer={() => setPopupOuvert(false)}
        suite={`/outil/${slug}`}
        message="Connectez-vous pour enregistrer cet outil dans vos favoris."
      />
    </>
  );
}

export default BoutonFavori;
export { BoutonFavori };