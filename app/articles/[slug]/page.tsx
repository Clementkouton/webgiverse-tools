// app/articles/[slug]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatteDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

async function lireArticle(slug: string) {
  return (prisma as typeof prisma & { article: typeof prisma extends { article: infer T } ? T : any }).article.findUnique({ where: { slug } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await lireArticle(slug);
  if (!article || article.statut !== "PUBLIE") return { title: "Article introuvable" };
  return { title: article.titre, description: article.extrait };
}

export default async function PageArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await lireArticle(slug);

  // Les brouillons ne sont pas visibles sur le site public.
  if (!article || article.statut !== "PUBLIE") notFound();

  const retour = article.type === "ACTUALITE" ? { href: "/actualites", libelle: "Toutes les actualités" } : { href: "/blog", libelle: "Retour au blog" };
  const paragraphes: string[] = article.contenu.split("\n").map((p: string) => p.trim()).filter(Boolean);

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 lg:py-16">
      <Link href={retour.href} className="inline-flex items-center gap-1 text-[14px] font-semibold text-violet hover:underline">
        <ChevronLeft className="size-4" aria-hidden /> {retour.libelle}
      </Link>

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variante={article.type === "ACTUALITE" ? "magenta" : "source"}>
            {article.type === "ACTUALITE" ? "Actualité" : "Blog"}
          </Badge>
          <span className="text-[14px] text-encre">
            {formatteDate(article.publieLe)} · {article.auteur}
          </span>
        </div>
        <h1 className="mt-4 text-h2 font-titre font-semibold">{article.titre}</h1>
        <p className="mt-3 text-[17px] leading-7 text-encre">{article.extrait}</p>
      </header>

      {article.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={article.image} alt="" className="mt-8 w-full rounded-carte border border-bordure object-cover" />
      )}

      <div className="mt-8 grid gap-5 text-[16px] leading-7 text-bleu">
        {paragraphes.map((paragraphe, i) => (
          <p key={i}>{paragraphe}</p>
        ))}
      </div>

      <footer className="mt-12 rounded-carte border border-bordure bg-gris p-6 text-center">
        <p className="text-[15px] font-semibold text-bleu">Envie de découvrir les meilleurs outils IA ?</p>
        <Link href="/outils" className="mt-2 inline-block text-[15px] font-semibold text-violet hover:underline">
          Explorer l'annuaire →
        </Link>
      </footer>
    </article>
  );
}