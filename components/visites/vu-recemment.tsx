// components/visites/vu-recemment.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OutilVu = {
  slug: string;
  nom: string;
  logo: string;
  description: string;
  tarif: string;
  gratuit: boolean;
  date: number;
};

const CLE = "webgiverse_vus";

// variante "page"     → section complète (page d'accueil)
// variante "compacte" → section compacte (dashboard)
export default function VuRecemment({
  variante = "page",
}: {
  variante?: "page" | "compacte";
}) {
  const [vus, setVus] = useState<OutilVu[] | null>(null);

  useEffect(() => {
    try {
      const brut = window.localStorage.getItem(CLE);
      setVus(brut ? JSON.parse(brut) : []);
    } catch {
      setVus([]);
    }
  }, []);

  if (!vus || vus.length === 0) return null;

  function effacer() {
    try {
      window.localStorage.removeItem(CLE);
    } catch {
      // localStorage indisponible
    }
    setVus([]);
  }

  const compacte = variante === "compacte";
  const liste = compacte ? vus.slice(0, 4) : vus;

  if (compacte) {
    return (
      <section className="mt-8" aria-label="Vu récemment">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-titre text-[17px] leading-6 font-semibold">Vu récemment</h2>
          <button
            type="button"
            onClick={effacer}
            className="text-[13px] leading-4 text-encre transition hover:text-violet"
          >
            Effacer
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {liste.map((o) => (
            <Link
              key={o.slug}
              href={`/outil/${o.slug}`}
              className="flex items-center gap-3 rounded-carte border border-bordure bg-white p-3.5 shadow-carte transition hover:border-violet"
            >
              {o.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={o.logo}
                  alt=""
                  className="size-10 shrink-0 rounded-champ border border-bordure object-contain p-1"
                />
              ) : (
                <div className="grid size-10 shrink-0 place-items-center rounded-champ bg-gris font-titre text-sm font-bold text-encre">
                  {o.nom.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-[14px] leading-5 font-semibold">{o.nom}</p>
                <p className="truncate text-[12px] leading-4 text-encre">
                  {o.gratuit ? "Gratuit" : o.tarif || "Voir la fiche"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-titre text-h2 text-encre">Vu récemment</h2>
        <button
          type="button"
          onClick={effacer}
          className="text-sm text-encre/50 transition hover:text-encre"
        >
          Effacer l&apos;historique
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {vus.map((o) => (
          <Link
            key={o.slug}
            href={`/outil/${o.slug}`}
            className="flex items-center gap-3 rounded-carte border border-bordure bg-white p-4 shadow-carte transition hover:-translate-y-0.5"
          >
            {o.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={o.logo}
                alt=""
                className="h-10 w-10 shrink-0 rounded-lg border border-bordure object-contain p-1"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gris font-titre text-sm font-bold text-encre">
                {o.nom.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-encre">{o.nom}</p>
              <p className="text-xs text-encre/60">
                {o.gratuit ? "Gratuit" : o.tarif || "Voir le site"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}