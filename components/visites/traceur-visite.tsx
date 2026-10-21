"use client";

import { useEffect } from "react";

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

export default function TraceurVisite({ slug }: { slug: string }) {
  useEffect(() => {
    let actif = true;

    fetch(`/api/outils/info?outil=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!actif || !d?.slug) return;

        try {
          const brut = window.localStorage.getItem(CLE);
          const liste: OutilVu[] = brut ? JSON.parse(brut) : [];
          const reste = liste.filter((o) => o.slug !== d.slug);
          const maj = [
            {
              slug: d.slug,
              nom: d.nom ?? "",
              logo: d.logo ?? "",
              description: d.description ?? "",
              tarif: d.tarif ?? "",
              gratuit: Boolean(d.gratuit),
              date: Date.now(),
            },
            ...reste,
          ].slice(0, 8);

          window.localStorage.setItem(CLE, JSON.stringify(maj));
        } catch {
          // localStorage indisponible
        }
      })
      .catch(() => {});

    return () => {
      actif = false;
    };
  }, [slug]);

  return null;
}