// components/outil/bouton-favori.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { basculerFavori } from "@/app/actions/favoris";
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

/* ── Bulle « limite du plan » (ambre + bouton vers /tarifs) ─────────── */
/* Ce n'est pas une erreur : c'est une invitation à passer Premium.     */
function BulleLimite({ onFermer }: { onFermer: () => void }) {
  useEffect(() => {
    const delai = setTimeout(onFermer, 15000);
    return () => clearTimeout(delai);
  }, [onFermer]);

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[9999] w-80 rounded-carte border border-amber-200 bg-amber-50 p-4 shadow-carte">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-800">
            Limite du plan Découverte atteinte
          </p>
          <p className="mt-1 text-sm leading-5 text-amber-800/80">
            Vous avez enregistré vos 20 favoris. Passez Premium pour des favoris
            et des listes illimités.
          </p>
          <a
            href="/tarifs"
            className="mt-2.5 inline-flex items-center rounded-champ bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
          >
            Découvrir les plans
          </a>
        </div>
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          className="shrink-0 text-amber-500 transition hover:text-amber-700"
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

function BoutonFavori({ outilId, slug }: { outilId: string; slug: string }) {
  const [favori, setFavori] = useState(false);
  const [charge, setCharge] = useState(false);
  const [popupOuvert, setPopupOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [limite, setLimite] = useState(false);

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
    setErreur(null);
    setLimite(false);

    try {
      const data: any = await basculerFavori(outilId);

      if (data?.raison === "non-connecte") {
        setPopupOuvert(true);
        return;
      }

      // Plan Découverte : 20 favoris maximum (limite appliquée côté serveur)
      if (data?.raison === "limite") {
        setLimite(true);
        return;
      }

      if (typeof data?.favori === "boolean") {
        setFavori(data.favori);
      } else if (data?.ok !== false) {
        setFavori((v) => !v);
      }
    } catch (e) {
      console.error("[BoutonFavori] L'action serveur a échoué :", e);
      setErreur(
        "Favoris — l'opération a échoué côté serveur. Regardez le terminal du serveur."
      );
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

      {erreur && <BulleErreur message={erreur} onFermer={() => setErreur(null)} />}
      {limite && <BulleLimite onFermer={() => setLimite(false)} />}

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