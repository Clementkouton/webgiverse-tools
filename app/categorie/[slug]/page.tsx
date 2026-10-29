// app/categorie/[slug]/page.tsx
// Lot 10 — page catégorie « style Aixploria » : héros avec pastille de
// catégorie, titre avec mot-clé en dégradé de marque, compteurs réels,
// navigation croisée en pastilles vers les autres catégories (comme la
// liste de catégories d'Aixploria), puis grille des outils de la
// catégorie et appel à l'assistant. Charte Webgiverse inchangée
// (accents violets, dégradé de marque) et polices intactes
// (Space Grotesk titres, Inter texte).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { listerOutils, listerCategories } from "@/lib/queries";
import { Bouton } from "@/components/ui/bouton";
import { IconeCategorie } from "@/components/commun/icone-categorie";
import CarteOutilView from "@/components/outil/carte-outil";

export const revalidate = 3600;

export async function generateStaticParams() {
  const categories = await prisma.category.findMany({ select: { slug: true } });
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const categorie = await prisma.category.findUnique({ where: { slug } });
  return categorie
    ? { title: `Outils ${categorie.nom}`, description: `Les meilleurs outils IA pour ${categorie.nom.toLowerCase()}, sélectionnés par Webgiverse.` }
    : {};
}

export default async function PageCategorie({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categorie = await prisma.category.findUnique({ where: { slug } });
  if (!categorie) notFound();

  // Outils de la catégorie (12 premiers, les plus populaires) + toutes les
  // catégories pour la navigation croisée en pastilles, comme chez Aixploria.
  const [{ outils, total }, categories] = await Promise.all([
    listerOutils({ categorie: slug, tri: "populaire" }),
    listerCategories(),
  ]);

  return (
    <>
      {/* ── Héros de catégorie (style Aixploria) ───────────────── */}
      <section className="hero-verre border-b border-bordure">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center lg:py-16">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
            <IconeCategorie nom={categorie.icone} className="size-4" />
            Catégorie Webgiverse
          </p>
          <h1 className="mx-auto mt-4 max-w-[760px] text-[30px] leading-9 font-bold tracking-tight text-bleu sm:text-h2">
            Les meilleurs outils <span className="texte-degrade">{categorie.nom}</span>
          </h1>
          <p className="mesure mx-auto mt-3 text-[16px] leading-7 text-encre">
            Une sélection testée à la main : chaque fiche {categorie.nom.toLowerCase()} est vérifiée
            (tarifs, liens, fonctionnalités) avant d&apos;entrer dans l&apos;annuaire.
          </p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <li className="rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
              {total} outil{total > 1 ? "s" : ""} testé{total > 1 ? "s" : ""}
            </li>
            <li className="rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
              Fiches vérifiées manuellement
            </li>
            <li className="rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
              100 % en français
            </li>
          </ul>
        </div>
      </section>

      {/* ── Navigation croisée : toutes les catégories en pastilles ── */}
      <nav aria-label="Toutes les catégories" className="border-b border-bordure bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <ul className="flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/categorie/${c.slug}`}
                  aria-current={c.slug === slug ? "page" : undefined}
                  className={
                    c.slug === slug
                      ? "inline-flex min-h-9 items-center gap-2 rounded-full border border-violet bg-violet px-4 text-[14px] leading-4 font-semibold text-white"
                      : "inline-flex min-h-9 items-center gap-2 rounded-full border border-bordure bg-white px-4 text-[14px] leading-4 font-medium text-bleu transition hover:border-violet hover:text-violet"
                  }
                >
                  {c.nom}
                  <span className={c.slug === slug ? "text-[12px] leading-4 font-semibold text-white/80" : "text-[12px] leading-4 font-semibold text-encre"}>
                    {c._count.outils}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* ── Grille des outils de la catégorie ──────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-12 lg:py-14">
        {outils.length ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {outils.map((o) => <CarteOutilView key={o.id} outil={o} />)}
            </div>
            {total > outils.length && (
              <p className="mt-8 text-center">
                <Link
                  href={`/outils?categorie=${slug}`}
                  className="inline-flex min-h-11 items-center gap-1 text-[15px] leading-5 font-semibold text-violet hover:underline"
                >
                  Voir les {total} outils {categorie.nom.toLowerCase()} dans l&apos;annuaire
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </p>
            )}
          </>
        ) : (
          <div className="rounded-carte border border-bordure bg-white p-10 text-center shadow-carte">
            <p className="text-encre">Aucun outil dans cette catégorie pour l&apos;instant.</p>
            <Link href="/proposer" className="mt-2 inline-block font-semibold text-violet hover:underline">
              Proposer un outil
            </Link>
          </div>
        )}

        {/* ── Appel à l'action : assistant ──────────────────────── */}
        <section className="mt-12 rounded-carte border border-bordure bg-white p-6 shadow-carte sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-carte bg-violet/10">
                <Sparkles className="size-5 text-violet" aria-hidden />
              </span>
              <div>
                <h2 className="font-titre text-[18px] leading-6 font-semibold text-bleu">
                  Tu ne sais pas quel {categorie.nom.toLowerCase()} choisir ?
                </h2>
                <p className="mt-1 max-w-xl text-[14px] leading-6 text-encre">
                  Décris ton projet à l&apos;assistant Webgiverse : il te recommande les bons
                  outils de cette catégorie en quelques secondes, gratuits d&apos;abord.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Bouton asChild>
                <Link href="/assistant">
                  <Sparkles aria-hidden /> Lancer l&apos;assistant
                </Link>
              </Bouton>
              <Bouton variante="secondaire" asChild>
                <Link href={`/outils?categorie=${slug}`}>Tout voir dans l&apos;annuaire</Link>
              </Bouton>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}