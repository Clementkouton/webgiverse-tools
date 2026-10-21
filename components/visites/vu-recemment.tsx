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

export default function VuRecemment() {
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