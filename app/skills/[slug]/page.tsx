// app/skills/[slug]/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 38 (réécriture lot 39) — FICHE D'UNE SKILL IA.
// ⚠ CORRECTIF BUILD : le fichier livré lors du lot 38 était resté
//   VIDE sur le dépôt (0 octet) → erreur Vercel
//   « File 'app/skills/[slug]/page.tsx' is not a module ».
//   Cette version complète et autonome remplace l'ancienne.
//
// Contenu de la fiche :
//   · fil d'Ariane, couverture 16:9 (URL distante affichée telle
//     quelle, dégradé de marque en secours si l'image manque) ;
//   · badges catégorie / À la une, auteur, popularité, VUES ;
//   · COMPTEUR DE VUES : chaque consultation d'un abonné Premium
//     incrémente Skill.vues en base (via after() → ne ralentit pas
//     l'affichage, fonctionne sur Vercel) ;
//   · article traduit en français (sections + images en URL) ;
//   · commande d'installation avec bouton « Copier » (client) ;
//   · liens dépôt GitHub + fiche source ;
//   · section « À découvrir aussi » ;
//   · NON Premium : aucun contenu d'article dans le HTML (le verrou
//     est côté serveur, rien ne fuit), bloc Passer Premium.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import {
  ChevronRight,
  Crown,
  ExternalLink,
  Eye,
  Flame,
  Sparkles,
  Terminal,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { accesSkills } from "@/lib/acces-skills";
import { obtenirSkill, autresSkills } from "@/lib/queries-skills";
import { BlocVerrouSkills } from "@/components/skills/bloc-verrou-skills";
import { CopierCode } from "@/components/skills/copier-code";
import { ReactElement, JSXElementConstructor, ReactNode, ReactPortal } from "react";

type Params = Promise<{ slug: string }>;

/** Forme d'une section de l'article stocké en JSONB. */
type SectionArticle = {
  titre?: string;
  paragraphes?: string[];
  images?: { src: string; alt: string }[];
};

/** Parse défensif du champ article (Json?) : jamais de crash. */
function parserArticle(brut: unknown): SectionArticle[] {
  if (!Array.isArray(brut)) return [];
  return brut.map((bloc): SectionArticle => {
    if (!bloc || typeof bloc !== "object") return {};
    const s = bloc as Record<string, unknown>;
    return {
      titre: typeof s.titre === "string" ? s.titre : undefined,
      paragraphes: Array.isArray(s.paragraphes)
        ? s.paragraphes.filter((x): x is string => typeof x === "string")
        : [],
      images: Array.isArray(s.images)
        ? s.images
            .filter((i): i is Record<string, unknown> => Boolean(i) && typeof i === "object")
            .map((i) => ({
              src: typeof i.src === "string" ? i.src : "",
              alt: typeof i.alt === "string" ? i.alt : "",
            }))
            .filter((i) => i.src)
        : [],
    };
  });
}

const NOMBRE = new Intl.NumberFormat("fr-FR");
const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const skill = await obtenirSkill(slug);
  return {
    title: skill ? `${skill.titre} — Skills IA Webgiverse` : "Skill introuvable",
    description: skill ? skill.description : undefined,
  };
}

export default async function PageSkill({ params }: { params: Params }) {
  const { slug } = await params;
  const skill = await obtenirSkill(slug);
  if (!skill) notFound();

  // ── Accès (verrou côté serveur, même règle que les tutoriels) ────
  const session = await auth();
  const acces = await accesSkills(session?.user?.id ?? null);

  // ── COMPTEUR DE VUES ─────────────────────────────────────────────
  // Une seule incrémentation par consultation d'un abonné Premium.
  // after() s'exécute APRÈS l'envoi de la page : zéro latence ajoutée.
  // Défensif : table absente / erreur → on ignore silencieusement.
  if (acces.peutAcceder) {
    after(async () => {
      try {
        await (prisma as any).skill.update({
          where: { id: skill.id },
          data: { vues: { increment: 1 } },
        });
      } catch {
        /* compteur best-effort */
      }
    });
  }

  const article = parserArticle(skill.article);
  const suggestions = await autresSkills(skill.slug, 4);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-16">
      {/* ── Fil d'Ariane ─────────────────────────────────────────── */}
      <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1 pt-6 text-[13px] leading-5 text-encre">
        <Link href="/" className="transition hover:text-violet">Accueil</Link>
        <ChevronRight className="size-3.5 text-encre/50" aria-hidden />
        <Link href="/skills" className="transition hover:text-violet">Skills</Link>
        <ChevronRight className="size-3.5 text-encre/50" aria-hidden />
        <li className="line-clamp-1 font-medium text-bleu">{skill.titre}</li>
      </nav>

      {/* ── Couverture ───────────────────────────────────────────── */}
      <div className="relative mt-5 aspect-video w-full overflow-hidden rounded-carte border border-bordure bg-[linear-gradient(120deg,#00d1ff_0%,#6a3bff_70%)] shadow-carte">
        {skill.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={skill.image}
            alt={skill.imageAlt || skill.titre}
            referrerPolicy="no-referrer"
            className={`h-full w-full object-cover ${acces.peutAcceder ? "" : "blur-[6px]"}`}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center">
            <Sparkles className="size-12 text-white/80" aria-hidden />
          </span>
        )}
        {skill.featured && acces.peutAcceder && (
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[12px] leading-4 font-semibold text-violet shadow-sm">
            <Sparkles className="size-3.5" aria-hidden /> À la une
          </span>
        )}
      </div>

      {/* ── Titre + métadonnées ──────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link
          href={`/skills?categorie=${encodeURIComponent(skill.categorie)}`}
          className="rounded-full bg-gris px-3 py-1.5 text-[12px] leading-4 font-semibold text-bleu transition hover:text-violet"
        >
          {skill.categorie}
        </Link>
        {skill.tags.slice(0, 4).map((tag: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined, index: any) =>
          typeof tag === "string" ? (
            <span key={`${tag}-${index}`} className="rounded-full border border-bordure bg-white px-3 py-1.5 text-[12px] leading-4 font-medium text-encre">
              {tag}
            </span>
          ) : null
        )}
      </div>
      <h1 className="mt-3 text-h2 font-bold tracking-tight text-bleu">{skill.titre}</h1>
      <p className="mesure mt-2 text-[16px] leading-7 text-encre">{skill.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] leading-5 font-medium text-encre">
        {skill.auteur && (
          <span className="inline-flex items-center gap-1.5">
            <span className="grid size-6 place-items-center rounded-full bg-violet/10 text-[11px] font-bold text-violet">
              {skill.auteur.slice(0, 1).toUpperCase()}
            </span>
            {skill.auteur}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <Flame className="size-4 text-violet" aria-hidden />
          {NOMBRE.format(skill.popularite)} étoiles
        </span>
        {/* COMPTEUR DE VUES — affiché sur la fiche */}
        <span className="inline-flex items-center gap-1.5">
          <Eye className="size-4 text-violet" aria-hidden />
          {NOMBRE.format(skill.vues)} consultation{skill.vues > 1 ? "s" : ""}
        </span>
        <span>Ajoutée le {DATE.format(skill.creeLe)}</span>
      </div>

      {/* ══ NON PREMIUM : verrou, aucun contenu de l'article ═══════ */}
      {!acces.peutAcceder && (
        <div className="mt-8">
          <BlocVerrouSkills connecte={acces.connecte} />
        </div>
      )}

      {/* ══ PREMIUM : contenu complet ══════════════════════════════ */}
      {acces.peutAcceder && (
        <>
          {/* Commande d'installation, prête à copier */}
          {skill.demarrage && (
            <div className="mt-8 overflow-hidden rounded-carte border border-bordure bg-bleu shadow-carte">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
                <span className="inline-flex items-center gap-2 text-[12.5px] leading-4 font-semibold text-white/80">
                  <Terminal className="size-4" aria-hidden /> Installation
                </span>
                <CopierCode commande={skill.demarrage} />
              </div>
              <pre className="overflow-x-auto px-4 py-3.5 text-[13px] leading-6 text-white/90">
                <code>{skill.demarrage}</code>
              </pre>
            </div>
          )}

          {/* Liens externes */}
          {(skill.depotUrl || skill.lienSource) && (
            <div className="mt-4 flex flex-wrap gap-3">
              {skill.depotUrl && (
                <a
                  href={skill.depotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-bordure bg-white px-4 text-[13px] leading-5 font-semibold text-bleu transition hover:border-violet hover:text-violet"
                >
                  <ExternalLink className="size-4" aria-hidden /> Dépôt GitHub
                </a>
              )}
              {skill.lienSource && (
                <a
                  href={skill.lienSource}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-bordure bg-white px-4 text-[13px] leading-5 font-semibold text-bleu transition hover:border-violet hover:text-violet"
                >
                  <ExternalLink className="size-4" aria-hidden /> Fiche source
                </a>
              )}
            </div>
          )}

          {/* Article traduit en français */}
          {article.length > 0 && (
            <article className="mt-10 space-y-8">
              {article.map((section, i) => (
                <section key={i}>
                  {section.titre && (
                    <h2 className="font-titre text-[22px] leading-8 font-bold text-bleu">{section.titre}</h2>
                  )}
                  {section.paragraphes?.map((p, j) => (
                    <p key={j} className="mesure mt-3 text-[15px] leading-7 text-encre">
                      {p}
                    </p>
                  ))}
                  {section.images?.map((img, j) => (
                    <figure key={j} className="mt-5">
                      <div className="overflow-hidden rounded-carte border border-bordure bg-gris">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.src}
                          alt={img.alt || skill.titre}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-auto w-full object-cover"
                        />
                      </div>
                      {img.alt && (
                        <figcaption className="mt-2 text-center text-[12.5px] leading-5 text-encre/70">
                          {img.alt}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </section>
              ))}
            </article>
          )}

          {/* ── À découvrir aussi ──────────────────────────────────── */}
          {suggestions.length > 0 && (
            <section className="mt-12">
              <h2 className="font-titre text-[20px] leading-7 font-bold text-bleu">À découvrir aussi</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {suggestions.map((autre) => (
                  <Link
                    key={autre.id}
                    href={`/skills/${autre.slug}`}
                    className="group flex items-center gap-3 overflow-hidden rounded-carte border border-bordure bg-white p-3 shadow-carte transition hover:border-violet/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
                  >
                    <span className="relative block size-16 shrink-0 overflow-hidden rounded-xl bg-[linear-gradient(120deg,#00d1ff_0%,#6a3bff_70%)]">
                      {autre.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={autre.image}
                          alt={autre.imageAlt || autre.titre}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="absolute inset-0 grid place-items-center">
                          <Sparkles className="size-5 text-white/80" aria-hidden />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11.5px] leading-4 font-semibold text-violet">{autre.categorie}</span>
                      <span className="line-clamp-2 block font-titre text-[14px] leading-5 font-semibold text-bleu transition group-hover:text-violet">
                        {autre.titre}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Passer à l'action */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 rounded-carte border border-violet/20 bg-violet/5 p-6 text-center">
            <Crown className="size-5 text-violet" aria-hidden />
            <p className="text-[14px] leading-6 text-encre">
              Envie d&apos;aller plus loin ? Les <strong className="font-semibold text-bleu">tutoriels vidéo</strong> et
              l&apos;assistant IA sont aussi inclus dans ton abonnement.
            </p>
            <Link
              href="/tutoriels"
              className="inline-flex min-h-10 items-center rounded-full bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] px-5 text-[13.5px] leading-5 font-semibold text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)] transition hover:opacity-90"
            >
              Voir les tutoriels
            </Link>
          </div>
        </>
      )}
    </div>
  );
}