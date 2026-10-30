// app/prompts/categorie/[slug]/page.tsx
// Lot 17 — page d'une catégorie de prompts (ex: /prompts/categorie/marketing).
// Héros avec le total réel de prompts de la catégorie, grille paginée
// (16 par page) conservant les filtres (q, type, tri) et section
// descriptive SEO. Charte inchangée.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { listerPrompts, obtenirPromptCategorie } from "@/lib/queries";
import { CartePrompt } from "@/components/prompts/carte-prompt";
import { Pagination } from "@/components/commun/pagination";

type Params = Promise<{ slug: string }>;

type Recherche = Promise<Record<string, string | string[] | undefined>>;

function val(c: string | string[] | undefined): string {
  return (Array.isArray(c) ? c[0] : c) ?? "";
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const categorie = await obtenirPromptCategorie(slug);
  if (!categorie) return { title: "Catégorie introuvable" };
  return {
    title: `Prompts ${categorie.nom} — bibliothèque IA | Webgiverse`,
    description: `Tous les prompts IA ${categorie.nom.toLowerCase()} : des instructions métier testées sur ChatGPT, Claude et Gemini, prêtes à copier.`,
  };
}

export default async function PageCategoriePrompts({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Recherche;
}) {
  const { slug } = await params;
  const categorie = await obtenirPromptCategorie(slug);
  if (!categorie) notFound();

  const p = await searchParams;
  const q = val(p.q).slice(0, 80);
  const type = val(p.type);
  const tri = val(p.tri);
  const page = Math.max(1, Math.trunc(Number(val(p.page)) || 1));

  const { prompts, total, page: pageFinale, pages } = await listerPrompts({
    categorie: slug,
    q,
    type,
    tri,
    page,
  });

  return (
    <>
      {/* ── Fil d'Ariane ────────────────────────────────────────── */}
      <nav aria-label="Fil d'Ariane" className="mx-auto w-full max-w-7xl px-4 pt-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-[13px] leading-4 text-encre">
          <li><Link href="/" className="hover:text-violet">Accueil</Link></li>
          <li aria-hidden><ChevronRight className="size-3.5" /></li>
          <li><Link href="/prompts" className="hover:text-violet">Prompts</Link></li>
          <li aria-hidden><ChevronRight className="size-3.5" /></li>
          <li className="font-medium text-bleu">{categorie.nom}</li>
        </ol>
      </nav>

      {/* ── Héros de la catégorie ───────────────────────────────── */}
      <section className="hero-verre mt-4 border-b border-bordure">
        <div className="mx-auto max-w-7xl px-4 py-10 text-center lg:py-12">
          <h1 className="mx-auto max-w-[720px] text-[28px] leading-9 font-bold tracking-tight text-bleu sm:text-h2">
            Prompts <span className="texte-degrade">{categorie.nom}</span>
          </h1>
          <p className="mesure mx-auto mt-3 text-[15px] leading-7 text-encre">
            {total} prompt{total > 1 ? "s" : ""} dans cette catégorie — testés sur ChatGPT, Claude,
            Gemini et les autres modèles majeurs. Copie, remplace les variables, lance.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 lg:py-12">
        {prompts.length === 0 ? (
          <div className="rounded-carte border border-bordure bg-white p-12 text-center shadow-carte">
            <p className="font-titre text-[17px] leading-6 font-semibold text-bleu">
              Aucun prompt ne correspond à ces filtres.
            </p>
            <Bouton asChild variante="secondaire" className="mt-5">
              <Link href={`/prompts/categorie/${slug}`}>Réinitialiser les filtres</Link>
            </Bouton>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {prompts.map((prompt) => (
              <CartePrompt key={prompt.id} prompt={prompt} />
            ))}
          </div>
        )}

        <Pagination
          page={pageFinale}
          pages={pages}
          base={`/prompts/categorie/${slug}`}
          params={{ q, type, tri }}
        />
      </div>
    </>
  );
}
