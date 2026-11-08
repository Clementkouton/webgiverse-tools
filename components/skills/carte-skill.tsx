// components/skills/carte-skill.tsx
// Lot 38 — carte d'une skill : même vocabulaire visuel que les cartes
// tutoriels et outils (rounded-carte, bordure, shadow-carte, hover violet) :
// couverture 16:9 (URL distante affichée telle quelle), badge catégorie,
// titre, aperçu, tags #, auteur et popularité.
import Link from "next/link";
import { Crown, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Skill } from "@prisma/client";

const compacte = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function CarteSkill({ skill }: { skill: Skill }) {
  return (
    <Link
      href={`/skills/${skill.slug}`}
      className="group survol-eleve flex flex-col overflow-hidden rounded-carte border border-bordure bg-white shadow-carte transition hover:border-violet"
    >
      {/* ── Couverture 16:9 ────────────────────────────────────── */}
      <span className="relative block aspect-video w-full overflow-hidden bg-gris">
        {skill.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={skill.image}
            alt={skill.imageAlt || `Couverture de la skill ${skill.titre}`}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="grid size-full place-items-center bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)]">
            <Star className="size-8 text-white" aria-hidden />
          </span>
        )}
        {skill.featured && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] leading-3.5 font-bold text-violet shadow-sm">
            <Crown className="size-3" aria-hidden /> À la une
          </span>
        )}
      </span>

      {/* ── Contenu ────────────────────────────────────────────── */}
      <span className="flex flex-1 flex-col p-4">
        <span className="flex flex-wrap items-center gap-1.5">
          <Badge variante="source">{skill.categorie}</Badge>
          <span className="inline-flex items-center gap-1 text-[12px] leading-4 font-medium text-encre">
            <Star className="size-3.5 text-amber-500" aria-hidden />
            {compacte.format(skill.popularite)}
          </span>
        </span>
        <h3 className="mt-2 line-clamp-2 font-titre text-[15px] leading-6 font-semibold text-bleu transition group-hover:text-violet">
          {skill.titre}
        </h3>
        <span className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-encre">
          {skill.description}
        </span>
        <span className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
          {skill.tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[12px] leading-4 font-medium text-violet">
              #{t}
            </span>
          ))}
        </span>
        {skill.auteur && (
          <span className="mt-auto flex items-center gap-1.5 pt-3 text-[12px] leading-4 text-encre">
            <span className="font-mono">@{skill.auteur}</span>
          </span>
        )}
      </span>
    </Link>
  );
}