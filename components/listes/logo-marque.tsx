"use client";

// components/listes/logo-marque.tsx
// Lot 62 — logo d'une liste partagée (page « en-marque », plan
// Entreprise) avec filet complet :
//   • referrerPolicy="no-referrer" : beaucoup de sites (CDN, hébergeurs
//     d'images) bloquent l'affichage externe dès qu'un « referer » est
//     envoyé — c'est la cause n°1 des logos invisibles ;
//   • onError : si l'image échoue quand même (lien mort, http bloqué
//     en https…), on affiche les INITIALES de la liste sur le dégradé
//     de marque — plus jamais d'espace vide ou d'icône cassée.
// Signature : <LogoMarque nom={liste.nom} logo={liste.logoUrl} />
import { useState } from "react";

export default function LogoMarque({
  nom,
  logo,
}: {
  nom: string;
  logo?: string | null;
}) {
  const [echec, setEchec] = useState(false);

  const initiales = nom
    .split(/[\s:.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0])
    .join("")
    .toUpperCase();

  if (!logo || echec) {
    return (
      <div
        aria-hidden
        className="grid size-16 shrink-0 place-items-center rounded-carte bg-[linear-gradient(135deg,#00d1ff,#6a3bff)] font-titre text-[20px] font-bold text-white shadow-carte"
      >
        {initiales}
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={logo}
      alt={`Logo de la liste ${nom}`}
      referrerPolicy="no-referrer"
      onError={() => setEchec(true)}
      className="size-16 shrink-0 rounded-carte border border-bordure bg-white object-contain p-1 shadow-carte"
    />
  );
}