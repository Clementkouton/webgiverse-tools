// components/skills/carte-skill.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 41 — Carte d'une skill dans la grille de la bibliothèque /skills.
//   · Couverture : l'URL distante est TOUJOURS rendue en vraie balise
//     <img> posée sur un fond dégradé de marque ; si l'URL manque ou
//     casse (onError), le dégradé + l'icône restent — jamais l'URL
//     affichée en texte (correctif du bug image).
//   · Badge catégorie, badge « À la une », titre, aperçu, tags,
//     popularité (étoiles du site source).
// Composant CLIENT (repli d'image onError) — lien unique vers la fiche.
// ─────────────────────────────────────────────────────────────────
"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles, Star, Terminal } from "lucide-react";
import type { Skill } from "@prisma/client";

/** Popularité lisible : 242500 → « 242,5k », 500 → « 500 ». */
function etoiles(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}k`;
  }
  return n > 0 ? String(n) : "";
}

export function CarteSkill({ skill }: { skill: Skill }) {
  const [imageOk, setImageOk] = useState(true);
  const montrerImage = Boolean(skill.image) && imageOk;

  return (
    <Link
      href={`/skills/${skill.slug}`}
      className="group flex min-w-0 flex-col overflow-hidden rounded-carte border border-bordure bg-white shadow-carte transition duration-200 hover:-translate-y-0.5 hover:border-violet/40 hover:shadow-[0_10px_30px_rgba(106,59,255,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
    >
      {/* Couverture 16:9 — dégradé de marque + <img> par-dessus */}
      <div className="relative aspect-video w-full overflow-hidden bg-[linear-gradient(120deg,#efe9ff,#e6f7ff)]">
        {montrerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={skill.image}
            alt={skill.imageAlt || skill.titre}
            loading="lazy"
            onError={() => setImageOk(false)}
            className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="grid size-full place-items-center text-violet/50" aria-hidden>
            <Terminal className="size-8" />
          </span>
        )}
        <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] leading-3.5 font-bold text-violet backdrop-blur">
          {skill.categorie}
        </span>
        {skill.featured && (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-violet px-2.5 py-1 text-[11px] leading-3.5 font-bold text-white shadow">
            <Sparkles className="size-3" aria-hidden /> À la une
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <h3 className="font-titre text-[16px] leading-5 font-bold text-bleu group-hover:text-violet">
          {skill.titre}
        </h3>
        <p className="mt-1.5 line-clamp-3 text-[13px] leading-5 text-encre">{skill.description}</p>
        <div className="mt-auto flex min-h-7 flex-wrap items-center gap-1.5 pt-3">
          {skill.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-full bg-gris px-2.5 py-1 text-[11px] leading-3.5 font-medium text-encre"
            >
              {t}
            </span>
          ))}
          {etoiles(skill.popularite) && (
            <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[12px] leading-4 font-semibold text-encre">
              <Star className="size-3.5 text-amber-400" aria-hidden />
              {etoiles(skill.popularite)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}