"use client";

import { useEffect, useState } from "react";

export default function BadgeNote({ slug }: { slug: string }) {
  const [moyenne, setMoyenne] = useState<number | null>(null);
  const [nombre, setNombre] = useState(0);

  useEffect(() => {
    let actif = true;
    fetch(`/api/notes?outil=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (actif && d) {
          setMoyenne(d.moyenne ?? null);
          setNombre(Number(d.nombre ?? 0));
        }
      })
      .catch(() => {});
    return () => {
      actif = false;
    };
  }, [slug]);

  if (!moyenne || nombre === 0) return null;

  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-encre/70"
      title={`Note moyenne de ${moyenne}/5 sur ${nombre} avis`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5 text-amber-400"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
      {moyenne.toFixed(1)}
      <span className="text-encre/50">({nombre})</span>
    </span>
  );
}