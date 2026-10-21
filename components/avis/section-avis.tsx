"use client";

import { useCallback, useEffect, useState } from "react";
import PopupConnexion from "@/components/auth/popup-connexion";

type AvisItem = {
  id: string;
  note: number;
  contenu: string;
  creeLe: string;
  nom: string;
  image: string | null;
  aMoi: boolean;
};

type Donnees = {
  connecte: boolean;
  nombre: number;
  moyenne: number;
  monAvis: AvisItem | null;
  avis: AvisItem[];
};

function Etoiles({
  valeur,
  onChange,
  taille = "h-5 w-5",
}: {
  valeur: number;
  onChange?: (n: number) => void;
  taille?: string;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
          className={onChange ? "transition hover:scale-110" : "cursor-default"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={n <= valeur ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`${taille} ${n <= valeur ? "text-amber-400" : "text-encre/30"}`}
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function SectionAvis({ slug }: { slug: string }) {
  const [data, setData] = useState<Donnees | null>(null);
  const [note, setNote] = useState(0);
  const [contenu, setContenu] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [charge, setCharge] = useState(false);
  const [popupOuvert, setPopupOuvert] = useState(false);

  const charger = useCallback(async () => {
    try {
      const res = await fetch(`/api/avis?outil=${encodeURIComponent(slug)}`);
      if (res.ok) setData(await res.json());
    } catch {
      // erreur réseau ignorée
    }
  }, [slug]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function publier(e: React.FormEvent) {
    e.preventDefault();
    if (charge) return;

    if (note < 1) {
      setErreur("Choisis une note de 1 à 5 étoiles.");
      return;
    }
    if (contenu.trim().length < 10) {
      setErreur("Ton avis doit contenir au moins 10 caractères.");
      return;
    }

    setErreur(null);
    setCharge(true);

    try {
      const res = await fetch("/api/avis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outil: slug, note, contenu }),
      });

      if (res.status === 401) {
        setPopupOuvert(true);
        return;
      }

      const d = await res.json();
      if (!res.ok) {
        setErreur(d?.erreur ?? "Une erreur est survenue. Réessayez.");
        return;
      }

      setNote(0);
      setContenu("");
      charger();
    } catch {
      setErreur("Impossible de contacter le serveur. Réessayez.");
    } finally {
      setCharge(false);
    }
  }

  async function supprimer() {
    if (!window.confirm("Supprimer ton avis ?")) return;
    await fetch(`/api/avis?outil=${encodeURIComponent(slug)}`, { method: "DELETE" });
    setNote(0);
    setContenu("");
    charger();
  }

  const avisTries = data
    ? [...data.avis].sort((a, b) => Number(b.aMoi) - Number(a.aMoi))
    : [];

  return (
    <section className="mt-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-titre text-h2 text-encre">Avis des membres</h2>
        {data && data.nombre > 0 && (
          <div className="flex items-center gap-2">
            <Etoiles valeur={Math.round(data.moyenne)} taille="h-4 w-4" />
            <span className="text-sm font-semibold text-encre">
              {data.moyenne.toFixed(1)}/5
            </span>
            <span className="text-sm text-encre/60">
              ({data.nombre} avis)
            </span>
          </div>
        )}
      </div>

      {/* Formulaire */}
      {data && !data.connecte ? (
        <div className="mb-8 rounded-carte border border-bordure bg-gris p-5 text-center">
          <p className="text-sm text-encre/70">
            Connecte-toi pour donner ton avis sur cet outil.
          </p>
          <button
            type="button"
            onClick={() => setPopupOuvert(true)}
            className="mt-3 rounded-champ bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            Se connecter pour donner mon avis
          </button>
        </div>
      ) : (
        <form
          onSubmit={publier}
          className="mb-8 rounded-carte border border-bordure bg-white p-5 shadow-carte"
        >
          <p className="mb-3 text-sm font-semibold text-encre">
            {data?.monAvis ? "Modifier ton avis" : "Donner ton avis"}
          </p>
          <div className="mb-3">
            <Etoiles valeur={note} onChange={setNote} taille="h-7 w-7" />
          </div>
          <textarea
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            placeholder="Qu'as-tu pensé de cet outil ? Points forts, points faibles, ton expérience..."
            rows={4}
            maxLength={2000}
            className="w-full rounded-champ border border-bordure bg-gris px-3 py-2 text-sm text-encre outline-none transition focus:border-violet focus:bg-white"
          />
          {erreur && (
            <p className="mt-2 rounded-champ bg-red-50 px-3 py-2 text-sm text-red-600">
              {erreur}
            </p>
          )}
          <button
            type="submit"
            disabled={charge}
            className="mt-3 rounded-champ bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
          >
            {charge ? "Envoi..." : data?.monAvis ? "Mettre à jour mon avis" : "Publier mon avis"}
          </button>
          {data?.monAvis && (
            <button
              type="button"
              onClick={supprimer}
              className="ml-3 rounded-champ px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              Supprimer mon avis
            </button>
          )}
        </form>
      )}

      {/* Liste des avis */}
      {avisTries.length === 0 ? (
        <p className="rounded-carte border border-bordure bg-gris p-6 text-center text-sm text-encre/60">
          Aucun avis pour le moment. Sois le premier à partager ton expérience !
        </p>
      ) : (
        <div className="grid gap-4">
          {avisTries.map((a) => (
            <article
              key={a.id}
              className="rounded-carte border border-bordure bg-white p-5 shadow-carte"
            >
              <div className="mb-2 flex flex-wrap items-center gap-3">
                {a.image ? (
                  <img
                    src={a.image}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet/10 font-titre text-sm font-bold text-violet">
                    {a.nom.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-encre">
                    {a.nom}
                    {a.aMoi && (
                      <span className="ml-2 rounded-full bg-violet/10 px-2 py-0.5 text-xs font-medium text-violet">
                        Votre avis
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-encre/50">
                    {new Date(a.creeLe).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="ml-auto">
                  <Etoiles valeur={a.note} taille="h-4 w-4" />
                </div>
              </div>
              <p className="whitespace-pre-line text-sm leading-6 text-encre/80">
                {a.contenu}
              </p>
            </article>
          ))}
        </div>
      )}

      <PopupConnexion
        ouvert={popupOuvert}
        onFermer={() => setPopupOuvert(false)}
        message="Connectez-vous pour donner votre avis sur cet outil."
      />
    </section>
  );
}