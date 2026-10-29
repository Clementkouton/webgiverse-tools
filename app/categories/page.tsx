// app/categories/page.tsx
// Lot 10 — page Catégories « style Aixploria » : héros avec accroche et
// chiffres réels (catégories, fiches testées), grille de cartes par
// famille (icône violette, nom, nombre d'outils, action visible au
// survol), puis appel à l'action vers l'assistant.
// Charte Webgiverse : accents violets, dégradé de marque sur le mot-clé
// du titre. Polices inchangées (Space Grotesk titres, Inter texte).
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { listerCategories } from "@/lib/queries";
import { IconeCategorie } from "@/components/commun/icone-categorie";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Catégories",
  description: "Toutes les catégories d'outils IA de l'annuaire Webgiverse.",
};

export default async function PageCategories() {
  const categories = await listerCategories();
  // Total de fiches publiées, toutes catégories confondues (chiffre réel).
  const totalOutils = categories.reduce((total, c) => total + c._count.outils, 0);

  return (
    <>
      {/* ── Héros ───────────────────────────────────────────────── */}
      <section className="hero-verre border-b border-bordure">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center lg:py-16">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
            Annuaire Webgiverse
          </p>
          <h1 className="mx-auto mt-4 max-w-[760px] text-[30px] leading-9 font-bold tracking-tight text-bleu sm:text-h2">
            Toutes les catégories d&apos;<span className="texte-degrade">outils IA</span>
          </h1>
          <p className="mesure mx-auto mt-3 text-[16px] leading-7 text-encre">
            Explore l&apos;annuaire par famille d&apos;outils : chaque catégorie ne regroupe que
            des fiches testées et vérifiées à la main par l&apos;équipe.
          </p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <li className="rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
              {categories.length} catégories
            </li>
            <li className="rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
              {totalOutils.toLocaleString("fr-FR")} fiches testées
            </li>
            <li className="rounded-full border border-violet/30 bg-white px-4 py-1.5 text-[13px] leading-4 font-semibold text-violet">
              100 % en français
            </li>
          </ul>
        </div>
      </section>

      {/* ── Grille des catégories ───────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-12 lg:py-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/categorie/${c.slug}`}
              className="group flex flex-col rounded-carte border border-bordure bg-white p-5 shadow-carte transition hover:border-violet"
            >
              <span className="grid size-11 place-items-center rounded-carte bg-violet/10">
                <IconeCategorie nom={c.icone} className="size-5 text-violet" />
              </span>
              <h2 className="mt-3 font-titre text-[17px] leading-6 font-semibold">{c.nom}</h2>
              <p className="mt-1 text-[13px] leading-5 text-encre">
                {c._count.outils} outil{c._count.outils > 1 ? "s" : ""} testé
                {c._count.outils > 1 ? "s" : ""}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] leading-4 font-semibold text-violet">
                Voir les outils
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          ))}
        </div>

        {/* ── Appel à l'action : assistant ──────────────────────── */}
        <section className="mt-12 rounded-carte border border-bordure bg-white p-6 shadow-carte sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-carte bg-violet/10">
                <Sparkles className="size-5 text-violet" aria-hidden />
              </span>
              <div>
                <h2 className="font-titre text-[18px] leading-6 font-semibold text-bleu">
                  Tu hésites entre deux catégories ?
                </h2>
                <p className="mt-1 max-w-xl text-[14px] leading-6 text-encre">
                  Décris ton projet à l&apos;assistant Webgiverse : il te recommande les bons
                  outils en quelques secondes, gratuits d&apos;abord.
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
                <Link href="/outils">Explorer tout l&apos;annuaire</Link>
              </Bouton>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}