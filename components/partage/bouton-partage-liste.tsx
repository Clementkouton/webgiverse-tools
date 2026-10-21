"use client";

import { useState } from "react";

const stylePill =
  "inline-flex items-center rounded-full border border-bordure bg-white px-3 py-1.5 text-xs font-medium text-encre transition hover:border-violet hover:text-violet";

export function LienPartage({ url, texte }: { url: string; texte: string }) {
  const [copie, setCopie] = useState(false);

  const urlX = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    texte
  )}&url=${encodeURIComponent(url)}`;
  const urlWa = `https://wa.me/?text=${encodeURIComponent(`${texte} ${url}`)}`;
  const urlLi = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    url
  )}`;

  async function copier() {
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      // clipboard indisponible
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => window.open(urlX, "_blank")}
        className={stylePill}
      >
        Partager sur X
      </button>
      <button
        type="button"
        onClick={() => window.open(urlWa, "_blank")}
        className={stylePill}
      >
        WhatsApp
      </button>
      <button
        type="button"
        onClick={() => window.open(urlLi, "_blank")}
        className={stylePill}
      >
        LinkedIn
      </button>
      <button
        type="button"
        onClick={copier}
        className="inline-flex items-center rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700"
      >
        {copie ? "Lien copié !" : "Copier le lien"}
      </button>
    </div>
  );
}

export default function BoutonPartageListe({ listeId }: { listeId: string }) {
  const [charge, setCharge] = useState(false);
  const [publique, setPublique] = useState<boolean | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function basculer() {
    if (charge) return;
    setCharge(true);
    setErreur(null);

    try {
      const res = await fetch("/api/listes/partage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listeId }),
      });

      const d = await res.json();
      if (!res.ok) {
        setErreur(d?.erreur ?? "Une erreur est survenue.");
        return;
      }

      setPublique(Boolean(d.publique));
      setSlug(d.slug ?? null);
    } catch {
      setErreur("Impossible de contacter le serveur.");
    } finally {
      setCharge(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={basculer}
        disabled={charge}
        className={`text-xs font-medium transition disabled:opacity-60 ${
          publique ? "text-red-600 hover:underline" : "text-violet hover:underline"
        }`}
      >
        {charge
          ? "Chargement..."
          : publique
            ? "Arrêter le partage public"
            : "Partager cette liste publiquement"}
      </button>

      {publique && slug && (
        <div className="mt-2 rounded-champ border border-bordure bg-gris p-3">
          <p className="mb-2 break-all text-xs text-encre/60">
            Lien public : {window.location.origin}/listes/{slug}
          </p>
          <LienPartage
            url={`${window.location.origin}/listes/${slug}`}
            texte="Découvrez ma sélection d'outils IA sur Webgiverse"
          />
        </div>
      )}

      {erreur && <p className="mt-1 text-xs text-red-600">{erreur}</p>}
    </div>
  );
}