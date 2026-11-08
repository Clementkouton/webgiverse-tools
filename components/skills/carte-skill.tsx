// components/skills/carte-skill.tsx
// Lot 40 — CORRECTIF IMAGE : couverture toujours rendue en vraie
// balise <img> (URL distante affichée telle quelle). Si l'URL manque,
// dégradé de marque + icône : la carte ne montre JAMAIS une URL en texte.
import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { Skill } from "@prisma/client";

export function CarteSkill({ skill }: { skill: Skill }) {
  return (
    <Link
      href={`/skills/${skill.slug}`}
      className="group flex flex-col overflow-hidden rounded-carte border border-bordure bg-white shadow-carte transition hover:shadow-lg"
    >
      {/* Couverture : <img> direct sur fond dégradé (secours si l'URL casse) */}
      <div className="relative aspect-video w-full overflow-hidden bg-[linear-gradient(120deg,rgba(0,209,255,0.14),rgba(106,59,255,0.20))]">
        {skill.image ? (
          <img
            src={skill.image}
            alt={skill.imageAlt || skill.titre}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="grid h-full w-full place-items-center">
            <Sparkles className="size-8 text-violet/40" aria-hidden />
          </span>
        )}
        {skill.featured && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] leading-4 font-semibold text-violet shadow-sm">
            <Sparkles className="size-3" aria-hidden /> À la une
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <span className="w-fit rounded-full bg-violet/10 px-2.5 py-0.5 text-[11px] leading-4 font-semibold text-violet">
          {skill.categorie}
        </span>
        <h2 className="font-titre mt-2 text-[16px] leading-6 font-semibold text-bleu transition group-hover:text-violet">
          {skill.titre}
        </h2>
        <p className="mt-1.5 line-clamp-3 text-[13.5px] leading-5 text-encre">
          {skill.description}
        </p>
        {skill.tags.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {skill.tags.slice(0, 3).map((t) => (
              <li
                key={t}
                className="rounded-full border border-bordure px-2 py-0.5 text-[11px] leading-4 text-encre/80"
              >
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}