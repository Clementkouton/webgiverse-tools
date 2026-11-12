// app/skills/[slug]/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 43 — FICHE D'UNE SKILL IA — fichier COMPLET.
//   · La LISTE /skills est en libre parcours ; le DÉTAIL (cette fiche)
//     reste RÉSERVÉ AUX ABONNÉS PREMIUM : sans abonnement actif, le
//     visiteur voit l'en-tête (couverture, description, méta) puis le
//     bloc verrou — JAMAIS l'article, la commande d'installation ni
//     les retours d'usage.
//   · Images (couverture + article) TOUJOURS rendues en vraies <img>
//     avec légende et repli dégradé : plus jamais une URL en texte brut.
//   · Champ JSONB « article » parsé de façon défensive : une image
//     markdown ![alt](URL) ou une URL d'image seule devient
//     automatiquement une vraie image.
//   · Commande d'installation avec bouton « Copier » (composant client).
//   · NOUVEAU Lot 43 (Premium) :
//       – bouton « Épingler » → « Mes skills favoris » du dashboard ;
//       – formulaire « Ton retour d'usage » (contexte + résultat + note
//         facultative) — un seul retour par membre et par skill ;
//       – « Retours de la communauté » : les retours publiés.
//   · Compteur de vues : +1 par consultation Premium, via after()
//     (Next 15) → exécuté après l'envoi de la page, zéro latence.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  Eye,
  MessageSquareQuote,
  Sparkles,
  Star,
  Terminal,
  Trash2,
  User,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { accesSkills } from "@/lib/acces-skills";
import { obtenirSkill, autresSkills } from "@/lib/queries-skills";
import {
  estEpingleSkill,
  listerRetoursSkill,
  monRetourSkill,
} from "@/lib/skills-favoris";
import { supprimerRetourFormulaire } from "@/app/actions/skills-favoris";
import { BlocVerrouSkills } from "@/components/skills/bloc-verrou-skills";
import { CarteSkill } from "@/components/skills/carte-skill";
import { CopierCode } from "@/components/skills/copier-code";
import { BoutonEpingle } from "@/components/skills/bouton-epingle";
import { FormulaireRetour } from "@/components/skills/formulaire-retour";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import { Bouton } from "@/components/ui/bouton";

type Params = Promise<{ slug: string }>;

type ImageArticle = { src: string; alt: string };
type SectionArticle = { titre: string; paragraphes: string[]; images: ImageArticle[] };

/** Texte sûr : une valeur non-string devient une chaîne vide. */
function texte(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Vrai si la chaîne ressemble à une URL d'image directe. */
function estUrlImage(v: string): boolean {
  if (!/^https?:\/\//i.test(v)) return false;
  if (/\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(v)) return true;
  return v.includes("pic.openagentskills.dev"); // CDN d'images de la source
}

/** Image markdown ![alt](URL) — repérée puis retirée du paragraphe. */
const REGEX_IMAGE_MD = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;

/**
 * Parse défensif du champ JSONB « article » :
 * [{ titre, paragraphes: string[], images: [{ src, alt }] }]
 */
function parserArticle(brut: unknown): SectionArticle[] {
  let donnees: unknown = brut;
  if (typeof donnees === "string") {
    try {
      donnees = JSON.parse(donnees);
    } catch {
      return [];
    }
  }
  if (
    donnees &&
    typeof donnees === "object" &&
    !Array.isArray(donnees) &&
    Array.isArray((donnees as { sections?: unknown }).sections)
  ) {
    donnees = (donnees as { sections: unknown }).sections;
  }
  if (!Array.isArray(donnees)) return [];

  const sections: SectionArticle[] = [];
  for (const brutSection of donnees) {
    if (!brutSection || typeof brutSection !== "object") continue;
    const s = brutSection as Record<string, unknown>;

    const images: ImageArticle[] = [];
    const paragraphes: string[] = [];

    for (const brutParagraphe of Array.isArray(s.paragraphes) ? s.paragraphes : []) {
      let paragraphe = texte(brutParagraphe);
      if (!paragraphe) continue;

      // 1) images markdown ![alt](URL) → sorties du paragraphe
      const imagesMarkdown = [...paragraphe.matchAll(REGEX_IMAGE_MD)];
      for (const m of imagesMarkdown) {
        images.push({ src: m[2], alt: m[1] });
      }
      paragraphe = paragraphe.replace(REGEX_IMAGE_MD, "").trim();

      // 2) une URL d'image seule → une image (jamais un texte d'URL)
      if (estUrlImage(paragraphe)) {
        images.push({ src: paragraphe, alt: "" });
        continue;
      }
      if (paragraphe) paragraphes.push(paragraphe);
    }

    // 3) images déjà structurées du JSONB (src http uniquement)
    for (const brutImage of Array.isArray(s.images) ? s.images : []) {
      if (!brutImage || typeof brutImage !== "object") continue;
      const src = texte((brutImage as Record<string, unknown>).src);
      if (!src.startsWith("http")) continue;
      images.push({ src, alt: texte((brutImage as Record<string, unknown>).alt) });
    }

    const titre = texte(s.titre);
    if (!titre && paragraphes.length === 0 && images.length === 0) continue;
    sections.push({ titre, paragraphes, images });
  }
  return sections;
}

/** Popularité lisible : 242500 → « 242,5k », 500 → « 500 », 0 → « — ». */
function etoiles(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}k`;
  }
  return n > 0 ? String(n) : "—";
}

const formatteurDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

/** Rangée de 5 étoiles (note d'un retour d'usage). */
function Etoiles({ note }: { note: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Note : ${note} sur 5`}>
      {[1, 2, 3, 4, 5].map((v) => (
        <Star
          key={v}
          className={
            v <= note ? "size-3.5 fill-amber-400 text-amber-400" : "size-3.5 text-encre/25"
          }
          aria-hidden
        />
      ))}
    </span>
  );
}

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

  const session = await auth();
  const acces = await accesSkills(session?.user?.id);
  const premium = acces.peutAcceder;
  const userId = session?.user?.id;

  // ── COMPTEUR DE VUES ─────────────────────────────────────────────
  if (premium) {
    after(async () => {
      try {
        await prisma.skill.update({
          where: { id: skill.id },
          data: { vues: { increment: 1 } },
        });
      } catch {
        // table ou champ pas encore à jour → on ignore volontairement
      }
    });
  }

  // ── Lot 43 — épinglage + retours d'usage (Premium uniquement) ────
  const epingle = premium ? await estEpingleSkill(userId, skill.id) : false;
  const monRetour = premium ? await monRetourSkill(userId, skill.id) : null;
  const retours = premium ? await listerRetoursSkill(skill.id, 8) : [];

  const sections = premium ? parserArticle(skill.article) : [];
  const autres = premium ? await autresSkills(skill.slug, 4) : [];
  const dateAjout = formatteurDate.format(skill.creeLe);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
      {/* ── Fil d'Ariane ───────────────────────────────────────────── */}
      <nav
        aria-label="Fil d'Ariane"
        className="mb-5 flex min-w-0 items-center gap-1.5 text-[13px] leading-5 text-encre"
      >
        <Link
          href="/skills"
          className="inline-flex shrink-0 items-center gap-1 font-semibold text-violet hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Skills
        </Link>
        <span aria-hidden>/</span>
        <span className="min-w-0 truncate">{skill.titre}</span>
      </nav>

      {/* ── En-tête de la fiche ────────────────────────────────────── */}
      <header className="overflow-hidden rounded-carte border border-bordure bg-white shadow-carte">
        {/* Couverture : URL distante rendue en <img> sur fond dégradé. */}
        <div className="aspect-video w-full bg-[linear-gradient(120deg,#efe9ff,#e6f7ff)]">
          {skill.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={skill.image}
              alt={skill.imageAlt || skill.titre}
              className="size-full object-cover"
            />
          ) : (
            <span className="grid size-full place-items-center text-violet/50" aria-hidden>
              <Terminal className="size-10" />
            </span>
          )}
        </div>

        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-[7px] -skew-x-[18deg] bg-violet/10 px-3 py-1 text-[12px] leading-4 font-bold text-violet">
              {skill.categorie}
            </span>
            {skill.featured && (
              <span className="inline-flex items-center gap-1 rounded-[7px] -skew-x-[18deg] bg-violet px-3 py-1 text-[12px] leading-4 font-bold text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)]">
                <Sparkles className="size-3" aria-hidden /> À la une
              </span>
            )}
            {!premium && (
              <span className="inline-flex items-center gap-1 rounded-[7px] -skew-x-[18deg] border border-violet/30 px-3 py-1 text-[12px] leading-4 font-bold text-violet">
                Premium
              </span>
            )}
            {/* Lot 43 — épingler dans « Mes skills favoris » (Premium) */}
            {premium && (
              <span className="ml-auto">
                <BoutonEpingle skillId={skill.id} epingleInitial={epingle} />
              </span>
            )}
          </div>

          <h1 className="mt-3 font-titre text-[26px] leading-8 font-bold tracking-tight text-bleu sm:text-[30px] sm:leading-9">
            {skill.titre}
          </h1>
          <p className="mt-2 text-[15px] leading-7 text-encre">{skill.description}</p>

          {/* Méta : auteur, popularité, consultations, date */}
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-carte border border-bordure p-3">
              <dt className="flex items-center gap-1.5 text-[11px] leading-4 font-bold uppercase tracking-wide text-encre">
                <User className="size-3.5" aria-hidden /> Auteur
              </dt>
              <dd className="mt-1 truncate text-[14px] leading-5 font-semibold text-bleu">
                {skill.auteur || "Communauté"}
              </dd>
            </div>
            <div className="rounded-carte border border-bordure p-3">
              <dt className="flex items-center gap-1.5 text-[11px] leading-4 font-bold uppercase tracking-wide text-encre">
                <Star className="size-3.5" aria-hidden /> Popularité
              </dt>
              <dd className="mt-1 text-[14px] leading-5 font-semibold text-bleu">
                {etoiles(skill.popularite)}
              </dd>
            </div>
            <div className="rounded-carte border border-bordure p-3">
              <dt className="flex items-center gap-1.5 text-[11px] leading-4 font-bold uppercase tracking-wide text-encre">
                <Eye className="size-3.5" aria-hidden /> Consultations
              </dt>
              <dd className="mt-1 text-[14px] leading-5 font-semibold text-bleu">
                {skill.vues.toLocaleString("fr-FR")}
              </dd>
            </div>
            <div className="rounded-carte border border-bordure p-3">
              <dt className="flex items-center gap-1.5 text-[11px] leading-4 font-bold uppercase tracking-wide text-encre">
                <CalendarDays className="size-3.5" aria-hidden /> Ajouté le
              </dt>
              <dd className="mt-1 text-[14px] leading-5 font-semibold text-bleu">{dateAjout}</dd>
            </div>
          </dl>

          {skill.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {skill.tags.map((t) => (
                <li
                  key={t}
                  className="rounded-[7px] -skew-x-[18deg] bg-gris px-2.5 py-1 text-[12px] leading-4 font-medium text-encre"
                >
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      {/* ── VERROU — visiteur sans abonnement Premium : le DÉTAIL
          (article, installation, retours) n'est jamais rendu ─────── */}
      {!premium && (
        <div className="mt-6">
          <BlocVerrouSkills connecte={acces.connecte} />
        </div>
      )}

      {/* ── PREMIUM : installation + liens ─────────────────────────── */}
      {premium && (skill.demarrage || skill.depotUrl || skill.lienSource) && (
        <section
          aria-label="Installation et liens"
          className="mt-6 rounded-carte border border-bordure bg-white p-5 shadow-carte sm:p-6"
        >
          <h2 className="font-titre text-[17px] leading-6 font-bold text-bleu">
            Installer cette skill
          </h2>
          {skill.demarrage && (
            <>
              <div className="mt-3 overflow-x-auto rounded-carte bg-[#0b1b3f] p-4">
                <code className="block whitespace-pre font-mono text-[13px] leading-6 text-white">
                  {skill.demarrage}
                </code>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <CopierCode texte={skill.demarrage} />
                <span className="text-[12px] leading-4 text-encre">
                  Colle cette commande dans ton terminal, à la racine de ton projet.
                </span>
              </div>
            </>
          )}
          {(skill.depotUrl || skill.lienSource) && (
            <div className="mt-4 flex flex-wrap gap-2.5">
              {skill.depotUrl && (
                <Bouton asChild variante="secondaire" taille="sm">
                  <a href={skill.depotUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink aria-hidden /> Dépôt du code
                  </a>
                </Bouton>
              )}
              {skill.lienSource && (
                <a
                  href={skill.lienSource}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-[7px] -skew-x-[18deg] px-4 text-[14px] leading-5 font-semibold text-violet transition hover:bg-violet/10"
                >
                  <ExternalLink className="size-4" aria-hidden /> Fiche d&apos;origine
                </a>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── PREMIUM : article complet ──────────────────────────────── */}
      {premium &&
        (sections.length > 0 ? (
          <article className="mt-6 rounded-carte border border-bordure bg-white p-5 shadow-carte sm:p-7">
            {skill.articleTitre && (
              <h2 className="font-titre text-[20px] leading-7 font-bold text-bleu">
                {skill.articleTitre}
              </h2>
            )}
            {sections.map((section, i) => (
              <section key={i} className={i === 0 && !skill.articleTitre ? "mt-0" : "mt-6"}>
                {section.titre && (
                  <h3 className="font-titre text-[17px] leading-6 font-bold text-bleu">
                    {section.titre}
                  </h3>
                )}
                {section.paragraphes.map((paragraphe, j) => (
                  <p key={j} className="mt-3 text-[15px] leading-7 text-encre">
                    {paragraphe}
                  </p>
                ))}
                {section.images.map((image, k) => (
                  <figure
                    key={k}
                    className="mt-4 overflow-hidden rounded-carte border border-bordure bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.src}
                      alt={image.alt || skill.titre}
                      loading="lazy"
                      className="w-full bg-[linear-gradient(120deg,#efe9ff,#e6f7ff)] object-cover"
                    />
                    {image.alt && (
                      <figcaption className="border-t border-bordure px-4 py-2 text-center text-[12px] leading-4 text-encre">
                        {image.alt}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </section>
            ))}
          </article>
        ) : (
          <article className="mt-6 rounded-carte border border-bordure bg-white p-5 shadow-carte sm:p-7">
            <h2 className="font-titre text-[17px] leading-6 font-bold text-bleu">Article</h2>
            <p className="mt-2 text-[14px] leading-6 text-encre">
              L&apos;article détaillé de cette skill n&apos;est pas encore disponible. Les
              informations clés (catégorie, tags, commande d&apos;installation et liens) sont déjà
              affichées ci-dessus.
            </p>
          </article>
        ))}

      {/* ── PREMIUM : ton retour d'usage (lot 43) ──────────────────── */}
      {premium && (
        <section
          aria-label="Ton retour d'usage"
          className="mt-6 rounded-carte border border-bordure bg-white p-5 shadow-carte sm:p-6"
        >
          <h2 className="flex items-center gap-2 font-titre text-[17px] leading-6 font-bold text-bleu">
            <MessageSquareQuote className="size-4.5 text-violet" aria-hidden /> Ton retour
            d&apos;usage
          </h2>

          {monRetour ? (
            <>
              <p className="mt-2 text-[13px] leading-5 text-encre">
                Publié le {formatteurDate.format(monRetour.creeLe)}
                {typeof monRetour.note === "number" && (
                  <>
                    {" · "}
                    <Etoiles note={monRetour.note} />
                  </>
                )}
              </p>
              <div className="mt-3 grid gap-3">
                <div className="rounded-carte border border-bordure bg-[#f9faff] p-4">
                  <p className="text-[11px] leading-4 font-bold uppercase tracking-wide text-encre">
                    Usage
                  </p>
                  <p className="mt-1 text-[14px] leading-6 text-encre">{monRetour.usage}</p>
                </div>
                <div className="rounded-carte border border-bordure bg-[#f9faff] p-4">
                  <p className="text-[11px] leading-4 font-bold uppercase tracking-wide text-encre">
                    Résultat obtenu
                  </p>
                  <p className="mt-1 text-[14px] leading-6 text-encre">{monRetour.resultat}</p>
                </div>
              </div>
              <form action={supprimerRetourFormulaire} className="mt-4">
                <input type="hidden" name="retourId" value={monRetour.id} />
                <BoutonConfirmer
                  message="Supprimer ton retour d'usage sur cette skill ?"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-[7px] -skew-x-[18deg] border border-bordure bg-white px-3.5 text-[12px] leading-4 font-semibold text-encre transition hover:border-red-300 hover:text-red-500 active:scale-95"
                >
                  <Trash2 className="size-3.5" aria-hidden /> Supprimer mon retour
                </BoutonConfirmer>
              </form>
            </>
          ) : (
            <>
              <p className="mt-2 text-[13px] leading-5 text-encre">
                Testé cette skill&nbsp;? Partage ton contexte d&apos;usage et le résultat obtenu :
                ton retour guide les autres abonnés.
              </p>
              <div className="mt-4">
                <FormulaireRetour skillId={skill.id} />
              </div>
            </>
          )}
        </section>
      )}

      {/* ── PREMIUM : retours de la communauté (lot 43) ────────────── */}
      {premium && retours.length > 0 && (
        <section
          aria-label="Retours de la communauté"
          className="mt-6 rounded-carte border border-bordure bg-white p-5 shadow-carte sm:p-6"
        >
          <h2 className="font-titre text-[17px] leading-6 font-bold text-bleu">
            Retours de la communauté{" "}
            <span className="text-encre">({retours.length})</span>
          </h2>
          <ul className="mt-4 grid gap-3">
            {retours.map((retour) => {
              const auteur = retour.user?.name?.trim() || "Membre";
              return (
                <li
                  key={retour.id}
                  className="rounded-carte border border-bordure bg-[#f9faff] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    {retour.user?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={retour.user.image}
                        alt=""
                        className="size-8 shrink-0 rounded-[7px] -skew-x-[18deg] border border-bordure object-cover"
                      />
                    ) : (
                        <span className="grid size-8 shrink-0 place-items-center rounded-[7px] -skew-x-[18deg] bg-[linear-gradient(120deg,#6a3bff,#00d1ff)] text-[12px] font-bold text-white" aria-hidden>
                        {auteur.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <p className="text-[13px] leading-4 font-semibold text-bleu">{auteur}</p>
                    {typeof retour.note === "number" && <Etoiles note={retour.note} />}
                    <span className="ml-auto text-[12px] leading-4 text-encre">
                      {formatteurDate.format(retour.creeLe)}
                    </span>
                  </div>
                  <p className="mt-2.5 text-[14px] leading-6 text-encre">
                    <strong className="font-semibold text-bleu">Usage :</strong> {retour.usage}
                  </p>
                  <p className="mt-1.5 text-[14px] leading-6 text-encre">
                    <strong className="font-semibold text-bleu">Résultat :</strong>{" "}
                    {retour.resultat}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── À découvrir aussi ──────────────────────────────────────── */}
      {premium && autres.length > 0 && (
        <section className="mt-10">
          <h2 className="font-titre text-[18px] leading-6 font-bold text-bleu">
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