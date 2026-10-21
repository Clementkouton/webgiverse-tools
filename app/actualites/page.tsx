// app/actualites/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { formatteDate } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Actualités IA",
  description: "Les dernières nouvelles du monde de l'intelligence artificielle, sélectionnées par l'équipe Webgiverse.",
};
export const dynamic = "force-dynamic";

export default async function PageActualites() {
  const actualites = await prisma.article.findMany({
    where: { type: "ACTUALITE", statut: "PUBLIE" },
    orderBy: { publieLe: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:py-16">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-[13px] font-semibold tracking-wide text-violet uppercase">Webgiverse</p>
        <h1 className="mt-2 text-h2 font-titre font-semibold">Actualités IA</h1>
        <p className="mt-3 text-[16px] leading-6 text-encre">
          Les nouveautés du site et les infos importantes du monde de l'intelligence artificielle.
        </p>
      </header>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {actualites.map((a) => (
          <Link key={a.id} href={`/articles/${a.slug}`} className="group">
            <Carte className="h-full overflow-hidden transition group-hover:border-violet group-hover:shadow-[0_4px_18px_rgba(106,59,255,0.15)]">
              {a.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.image} alt="" className="h-40 w-full object-cover" />
              )}
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <Badge variante="magenta">Actualité</Badge>
                  <span className="text-[13px] text-encre">{formatteDate(a.publieLe)}</span>
                </div>
                <h2 className="mt-3 text-[17px] leading-6 font-titre font-semibold text-bleu group-hover:text-violet">
                  {a.titre}
                </h2>
                <p className="mt-2 line-clamp-3 text-[14px] leading-5 text-encre">{a.extrait}</p>
                <p className="mt-3 text-[13px] font-semibold text-violet">Lire l'actualité →</p>
              </div>
            </Carte>
          </Link>
        ))}
      </div>

      {actualites.length === 0 && (
        <Carte className="mx-auto mt-10 max-w-xl p-8 text-center">
          <p className="text-[16px] font-semibold text-bleu">Aucune actualité pour le moment</p>
          <p className="mt-2 text-[14px] text-encre">Reviens bientôt : les premières actualités arrivent !</p>
        </Carte>
      )}
    </div>
  );
}