// app/admin/articles/nouveau/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { FormulaireArticle } from "@/components/admin/formulaire-article";
import { creerArticleAction } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Nouvel article — Administration" };
export const dynamic = "force-dynamic";

export default async function PageNouvelArticle() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/articles" className="inline-flex items-center gap-1 text-[14px] font-semibold text-violet hover:underline">
        <ChevronLeft className="size-4" aria-hidden /> Retour aux articles
      </Link>
      <h2 className="mt-3 text-h3 font-semibold">Rédiger un nouvel article</h2>
      <p className="mt-1 text-[14px] leading-5 text-encre">
        Choisis « Article de blog » ou « Actualité » selon l'endroit où l'article apparaîtra sur le site
        (Blog ou Actualités). Enregistre en brouillon pour le garder hors ligne, ou publie-le directement.
      </p>
      <div className="mt-6">
        <FormulaireArticle action={creerArticleAction} />
      </div>
    </div>
  );
}