// app/skills/[slug]/page.tsx
// Lot 40 — fiche d'une skill. Fichier COMPLET (l'erreur Vercel
// « is not a module » venait d'un fichier vide) :
//   · CORRECTIF IMAGE : couverture ET images de l'article (JSONB
//     article[].images[]) rendues en vraies <img> avec légende.
//   · Compteur de vues conservé (lot 39) : after() de Next 15,
//     l'incrément se fait APRÈS l'envoi de la page, uniquement
//     pour les abonnés Premium.
//   · Verrou Premium conservé.
//   · « À découvrir aussi » : 4 autres skills.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  Github,
  Sparkles,
  Terminal,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { accesSkills } from "@/lib/acces-skills";
import { obtenirSkill, autresSkills } from "@/lib/queries-skills";
import { CarteSkill } from "@/components/skills/carte-skill";
import { BlocVerrouSkills } from "@/components/skills/bloc-verrou-skills";
import { CopierCode } from "@/components/skills/copier-code";

type Props = { params: Promise<{ slug: string }> };

/** Structure d'une section de l'article (JSONB Skill.article). */
type SectionArticle = {
  titre: string;
  paragraphes: string[];
  images: { src: string; alt: string }[];
};

/**
 * CORRECTIF IMAGE — parse défensif du champ JSONB « article » :
 * [{titre, paragraphes[], images[{src, alt}]}]. Seules les images
 * http(s) sont gardées ; toute erreur rend un article vide (jamais
 * de crash, jamais d'URL en texte).
 */
function parserArticle(brut: unknown): SectionArticle[] {
  if (!Array.isArray(brut)) return [];
  const sections: SectionArticle[] = [];
  for (const s of brut) {
    if (!s || typeof s !== "object") continue;
    const sec = s as Record<string, unknown>;
    const paragraphes = Array.isArray(sec.paragraphes)
      ? sec.paragraphes.filter((x): x is string => typeof x === "string")
      : [];
    const images = Array.isArray(sec.images)
      ? sec.images
          .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object")
          .map((x) => ({
            src: typeof x.src === "string" ? x.src : "",
            alt: typeof x.alt === "string" ? x.alt : "",
          }))
          .filter((x) => x.src.startsWith("http"))
      : [];
    sections.push({
      titre: typeof sec.titre === "string" ? sec.titre : "",
      paragraphes,
      images,
    });
  }
  return sections;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const skill = await obtenirSkill(slug);
  if (!skill) return { title: "Skill introuvable — Webgiverse" };
  return {
    title: `${skill.titre} — Skills IA Webgiverse`,
    description: skill.description.slice(0, 160),
  };
}

export default async function PageFicheSkill({ params }: Props) {
  const { slug } = await params;
  const skill = await obtenirSkill(slug);
  if (!skill) notFound();

  // Verrou Premium (source de vérité : lib/acces-skills.ts)
  const session = await auth();
  const acces = await accesSkills(session?.user?.id);

  // ── COMPTEUR DE VUES (lot 39, conservé) ─────────────────────────
  if (acces.peutAcceder) {
    after(async () => {
      try {
        await prisma.skill.update({
          where: { id: skill.id },
          data: { vues: { increment: 1 } },
        });
      } catch {
        /* table occupée ou absente : sans gravité */
      }
    });
  }

  const classeRetour =
    "inline-flex items-center gap-1.5 text-[14px] leading-5 font-medium text-encre transition hover:text-violet";

  // ── VERROU — visiteur non connecté ou membre sans abonnement ────
  if (!acces.peutAcceder) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link href="/skills" className={classeRetour}>
          <ArrowLeft className="size-4" aria-hidden /> Retour aux skills
        </Link>

        <div className="mt-4 overflow-hidden rounded-carte border border-bordure bg-white shadow-carte">
          {skill.image && (
            <img
              src={skill.image}
              alt=""
              aria-hidden="true"
              className="aspect-video max-h-[300px] w-full object-cover blur-[6px]"
            />
          )}
          <div className="p-6 text-center sm:p-8">
            <span className="inline-flex rounded-full bg-violet/10 px-3 py-1 text-[12px] leading-4 font-semibold text-violet">
              {skill.categorie}
            </span>
            <h1 className="font-titre mt-3 text-[24px] leading-8 font-bold text-bleu sm:text-[28px] sm:leading-9">
              {skill.titre}
            </h1>
            <p className="mesure mx-auto mt-2 text-[14px] leading-6 text-encre">
              {skill.description}
            </p>
            <div className="mt-6 flex justify-center">
              <BlocVerrouSkills connecte={acces.connecte} compact />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── FICHE COMPLÈTE (abonné Premium Pro / Entreprise) ────────────
  const article = parserArticle(skill.article);
  const autres = await autresSkills(skill.slug, 4);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 lg:py-12">
      <Link href="/skills" className={classeRetour}>
        <ArrowLeft className="size-4" aria-hidden /> Retour aux skills
      </Link>

      <article className="mt-4 overflow-hidden rounded-carte border border-bordure bg-white shadow-carte">
        {/* CORRECTIF IMAGE — couverture en <img> direct */}
        {skill.image && (
          <img
            src={skill.image}
            alt={skill.imageAlt || skill.titre}
            className="aspect-video max-h-[420px] w-full object-cover"
          />
        )}

        <div className="p-6 sm:p-8">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-violet/10 px-3 py-1 text-[12px] leading-4 font-semibold text-violet">
              {skill.categorie}
            </span>
            {skill.featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet px-3 py-1 text-[12px] leading-4 font-semibold text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)]">
                <Sparkles className="size-3" aria-hidden /> À la une
              </span>
            )}
            {skill.auteur && (
              <span className="rounded-full border border-bordure px-3 py-1 text-[12px] leading-4 font-medium text-encre/80">
                par {skill.auteur}
              </span>
            )}
          </div>

          <h1 className="font-titre mt-4 text-[26px] leading-9 font-bold tracking-tight text-bleu sm:text-[30px] sm:leading-10">
            {skill.titre}
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-encre">{skill.description}</p>

          {/* Métadonnées */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-bordure pt-4 text-[13px] leading-5 text-encre/70">
            <span className="inline-flex items-center gap-1.5">
              <Eye className="size-3.5" aria-hidden />
              {skill.vues.toLocaleString("fr-FR")} consultation{skill.vues > 1 ? "s" : ""}
            </span>
            {skill.lienSource && (
              <a
                href={skill.lienSource}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-violet hover:underline"
              >
                <ExternalLink className="size-3.5" aria-hidden /> Voir la fiche source
              </a>
            )}
            {skill.depotUrl && (
              <a
                href={skill.depotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-violet hover:underline"
              >
                <Github className="size-3.5" aria-hidden /> Dépôt GitHub
              </a>
            )}
          </div>

          {/* Tags */}
          {skill.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {skill.tags.map((t) => (
                <li
                  key={t}
                  className="rounded-full border border-bordure px-2.5 py-0.5 text-[12px] leading-4 text-encre/80"
                >
                  {t}
                </li>
              ))}
            </ul>
          )}

          {/* Article traduit */}
          {skill.articleTitre && (
            <h2 className="font-titre mt-10 text-[20px] leading-7 font-bold text-bleu">
              {skill.articleTitre}
            </h2>
          )}

          <div className="mt-4 space-y-8">
            {article.map((section, i) => (
              <section key={i}>
                {section.titre && (
                  <h3 className="font-titre text-[17px] leading-6 font-semibold text-bleu">
                    {section.titre}
                  </h3>
                )}
                <div className="mt-3 space-y-3">
                  {section.paragraphes.map((par, j) =>
                    par.startsWith("•") ? (
                      <p key={j} className="flex gap-2 text-[14.5px] leading-7 text-encre">
                        <span aria-hidden="true" className="shrink-0 text-violet">
                          •
                        </span>
                        <span>{par.replace(/^•\s*/, "")}</span>
                      </p>
                    ) : (
                      <p key={j} className="text-[14.5px] leading-7 text-encre">
                        {par}
                      </p>
                    ),
                  )}
                </div>

                {/* CORRECTIF IMAGE — images de la section en <img> + légende */}
                {section.images.length > 0 && (
                  <div className="mt-4 space-y-4">
                    {section.images.map((img, k) => (
                      <figure
                        key={k}
                        className="overflow-hidden rounded-carte border border-bordure bg-white"
                      >
                        <img
                          src={img.src}
                          alt={img.alt || skill.titre}
                          loading="lazy"
                          className="w-full object-cover"
                        />
                        {img.alt && (
                          <figcaption className="border-t border-bordure px-4 py-2 text-center text-[12px] leading-4 text-encre/70">
                            {img.alt}
                          </figcaption>
                        )}
                      </figure>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* Commande d'installation + bouton Copier */}
          {skill.demarrage && (
            <div className="mt-10">
              <h2 className="font-titre flex items-center gap-2 text-[16px] leading-5 font-semibold text-bleu">
                <Terminal className="size-4 text-violet" aria-hidden /> Installer cette skill
              </h2>
              <CopierCode commande={skill.demarrage} />
            </div>
          )}
        </div>
      </article>

      {/* À découvrir aussi */}
      {autres.length > 0 && (
        <section className="mt-12">
          <h2 className="font-titre text-[20px] leading-7 font-bold text-bleu">
            À découvrir aussi
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {autres.map((a) => (
              <CarteSkill key={a.id} skill={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}