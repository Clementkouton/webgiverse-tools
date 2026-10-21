// app/admin/articles/[id]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { FormulaireArticle } from "@/components/admin/formulaire-article";
import { majArticleAction } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Modifier l'article — Administration" };
export const dynamic = "force-dynamic";

export default async function PageModifierArticle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/articles" className="inline-flex items-center gap-1 text-[14px] font-semibold text-violet hover:underline">
        <ChevronLeft className="size-4" aria-hidden /> Retour aux articles
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-h3 font-semibold">Modifier : {article.titre}</h2>
          <p className="mt-1 text-[14px] leading-5 text-encre">Les changements sont visibles sur le site dès l'enregistrement.</p>
        </div>
        {article.statut === "PUBLIE" && (
          <a
            href={`/articles/${article.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-violet hover:underline"
          >
            Voir l'article publié <ExternalLink className="size-4" aria-hidden />
          </a>
        )}
      </div>
      <div className="mt-6">
        <FormulaireArticle
          action={majArticleAction}
          article={{
            id: article.id,
            titre: article.titre,
            slug: article.slug,
            type: article.type,
            statut: article.statut,
            extrait: article.extrait,
            image: article.image,
            auteur: article.auteur,
            contenu: article.contenu,
          }}
        />
      </div>
    </div>
  );
}