// app/prompts/role/[slug]/page.tsx
// Lot 17 — page « par métier » (ex: /prompts/role/entrepreneurs).
// Regroupe tous les prompts utiles à un rôle donné (tableau
// Prompt.roles[]). Héros avec total réel, grille paginée et retour
// vers la liste complète des métiers.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { listerPrompts } from "@/lib/queries";
import { CartePrompt } from "@/components/prompts/carte-prompt";
import { Pagination } from "@/components/commun/pagination";
import { roleParSlug, ROLES } from "@/lib/prompts-utils";

type Params = Promise<{ slug: string }>;

type Recherche = Promise<Record<string, string | string[] | undefined>>;

function val(c: string | string[] | undefined): string {
  return (Array.isArray(c) ? c[0] : c) ?? "";
}

export function generateStaticParams() {
  return ROLES.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const role = roleParSlug(slug);
  if (!role) return { title: "Métier introuvable" };
  return {
    title: `Prompts pour ${role.nom} — bibliothèque IA | Webgiverse`,
    description: `Les meilleurs prompts IA pour ${role.nom.toLowerCase()} : instructions testées, en français, prêtes à copier dans ChatGPT, Claude ou Gemini.`,
  };
}

export default async function PageRolePrompts({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Recherche;
}) {
  const { slug } = await params;
  const role = roleParSlug(slug);
  if (!role) notFound();

  const p = await searchParams;
  const tri = val(p.tri);
  const page = Math.max(1, Math.trunc(Number(val(p.page)) || 1));

  const { prompts, total, page: pageFinale, pages } = await listerPrompts({
    role: slug,
    tri: tri || "vues",
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
          <li><Link href="/prompts/roles" className="hover:text-violet">Métiers</Link></li>
          <li aria-hidden><ChevronRight className="size-3.5" /></li>
          <li className="font-medium text-bleu">{role.nom}</li>
        </ol>
      </nav>

      {/* ── Héros du métier ─────────────────────────────────────── */}
      <section className="hero-verre mt-4 border-b border-bordure">
        <div className="mx-auto max-w-7xl px-4 py-10 text-center lg:py-12">
          <h1 className="mx-auto max-w-[720px] text-[28px] leading-9 font-bold tracking-tight text-bleu sm:text-h2">
            Prompts pour <span className="texte-degrade">{role.nom.toLowerCase()}</span>
          </h1>
          <p className="mesure mx-auto mt-3 text-[15px] leading-7 text-encre">
            {total} prompt{total > 1 ? "s" : ""} choisis pour les {role.nom.toLowerCase()} :
            gagne des heures sur tes livrables récurrents, du premier coup.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 lg:py-12">
        {prompts.length === 0 ? (
          <div className="rounded-carte border border-bordure bg-white p-12 text-center shadow-carte">
            <p className="font-titre text-[17px] leading-6 font-semibold text-bleu">
              Aucun prompt pour ce métier pour le moment.
            </p>
            <Link
              href="/prompts/roles"
              className="mt-4 inline-block text-[14px] font-semibold text-violet hover:underline"
            >
              Découvrir les autres métiers →
            </Link>
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
          base={`/prompts/role/${slug}`}
          params={{ tri }}
        />
      </div>
    </>
  );
}
