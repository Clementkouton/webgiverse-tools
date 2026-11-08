// components/skills/carte-skill.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 38 (réécriture lot 39, épinglage lot 40) — CARTE d'une skill
// dans la grille de la bibliothèque /skills. Charte Webgiverse :
// rounded-carte, border-bordure, shadow-carte, accent violet, dégradé
// de marque (ciel → violet) en secours si l'image distante manque.
//
// ÉPINGLAGE (Lot 40) : quand `peutEpingler` est vrai (abonné Premium),
// la carte est recouverte d'un lien transparent (navigation vers la
// fiche inchangée) et une pastille « épingle » apparaît en haut à
// droite (composant client BoutonEpingleSkill). Quand `peutEpingler`
// est faux — aperçu flouté des non-abonnés — la carte reste LE MÊME
// <Link> qu'avant : rendu strictement identique, aucun changement visuel.
// ─────────────────────────────────────────────────────────────────
import Link from "next/link";
import { ArrowRight, Flame, Sparkles } from "lucide-react";
import { BoutonEpingleSkill } from "@/components/skills/bouton-epingle-skill";

/** Champs utilisés par la carte (sous-ensemble du modèle Skill). */
export type SkillCarte = {
  id: string; // requis pour l'épinglage (Lot 40)
  slug: string;
  titre: string;
  description: string;
  categorie: string;
  tags: string[];
  image: string;
  imageAlt: string;
  featured: boolean;
  popularite: number;
};

const NOMBRE = new Intl.NumberFormat("fr-FR");

type Props = {
  skill: SkillCarte;
  /** Lot 40 — épinglage Premium : pastille + carte recouverte d'un lien. */
  epingle?: boolean;
  peutEpingler?: boolean;
  /** Lien de connexion pour la pastille si le visiteur n'est pas connecté. */
  hrefConnexion?: string;
};

export function CarteSkill({ skill, epingle = false, peutEpingler = false, hrefConnexion = "/connexion" }: Props) {
  const couverture = (
    <>
      {/* Couverture 16:9 — URL distante affichée telle quelle */}
      <div className="relative aspect-video w-full overflow-hidden bg-[linear-gradient(120deg,#00d1ff_0%,#6a3bff_70%)]">
        {skill.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={skill.image}
            alt={skill.imageAlt || skill.titre}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center">
            <Sparkles className="size-10 text-white/80" aria-hidden />
          </span>
        )}
        {skill.featured && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] leading-3 font-semibold text-violet shadow-sm">
            <Sparkles className="size-3" aria-hidden /> À la une
          </span>
        )}
        <span className="absolute bottom-3 left-3 rounded-full bg-bleu/80 px-2.5 py-1 text-[11px] leading-3 font-semibold text-white backdrop-blur">
          {skill.categorie}
        </span>
      </div>
    </>
  );

  const corps = (
    <div className="flex flex-1 flex-col p-4">
      <h3 className="line-clamp-2 font-titre text-[16px] leading-6 font-semibold text-bleu transition group-hover:text-violet">
        {skill.titre}
      </h3>
      <p className="mt-2 line-clamp-3 flex-1 text-[13.5px] leading-6 text-encre">{skill.description}</p>

      {skill.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {skill.tags.slice(0, 3).map((t) => (
            <span key={t} className="rounded-full bg-gris px-2.5 py-1 text-[11px] leading-3 font-medium text-bleu">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-bordure pt-3">
        <span className="inline-flex items-center gap-1 text-[12.5px] leading-4 font-semibold text-encre">
          <Flame className="size-3.5 text-violet" aria-hidden />
          {NOMBRE.format(skill.popularite)} étoiles
        </span>
        <span className="inline-flex items-center gap-1 text-[12.5px] leading-4 font-semibold text-violet">
          Consulter
          <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </div>
  );

  // ── Mode d'origine (non-Premium / aperçu) : LE même <Link> qu'avant
  if (!peutEpingler) {
    return (
      <Link
        href={`/skills/${skill.slug}`}
        className="group flex flex-col overflow-hidden rounded-carte border border-bordure bg-white shadow-carte transition duration-300 hover:-translate-y-1 hover:border-violet/40 hover:shadow-[0_12px_32px_rgba(106,59,255,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
      >
        {couverture}
        {corps}
      </Link>
    );
  }

  // ── Mode épinglage (Premium) : lien transparent + pastille épingle
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-carte border border-bordure bg-white shadow-carte transition duration-300 hover:-translate-y-1 hover:border-violet/40 hover:shadow-[0_12px_32px_rgba(106,59,255,0.14)]">
      {/* Lien de navigation transparent (toute la surface de la carte) */}
      <Link
        href={`/skills/${skill.slug}`}
        aria-label={`Voir la fiche de ${skill.titre}`}
        className="absolute inset-0 z-10 rounded-carte focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
      />
      {couverture}
      {corps}
      {/* Pastille épingle — au-dessus du lien transparent */}
      <BoutonEpingleSkill
        skillId={skill.id}
        epingleInitial={epingle}
        connecte
        premium
        hrefConnexion={hrefConnexion}
        variante="carte"
      />
    </div>
  );
}