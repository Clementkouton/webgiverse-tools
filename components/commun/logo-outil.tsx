// components/commun/logo-outil.tsx
"use client";
import { useState } from "react";

export function LogoOutil({ nom, logo }: { nom: string; logo?: string | null }) {
  const [echec, setEchec] = useState(false);
  const initiales = nom.split(/[\s:.-]+/).filter(Boolean).slice(0, 2)
    .map((m) => m[0]).join("").toUpperCase();

  if (!logo || echec) {
    return (
      <div aria-hidden className="grid size-11 shrink-0 place-items-center rounded-champ bg-[linear-gradient(135deg,#00d1ff,#6a3bff)] font-titre text-[15px] font-bold text-white">
        {initiales}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img src={logo} alt="" width={44} height={44} loading="lazy"
      onError={() => setEchec(true)}
      className="size-11 shrink-0 rounded-champ border border-bordure bg-white object-contain p-1" />
  );
}