// app/admin/articles/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { Bouton } from "@/components/ui/bouton";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import {
  basculerPublicationArticleFormulaire,
  supprimerArticleFormulaire,
} from "@/app/actions/admin";
import { formatteDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Articles — Administration" };
export const dynamic = "force-dynamic";

const FILTRES = [
  { valeur: "", libelle: "Tous" },
  { valeur: "BLOG", libelle: "Blog" },
  { valeur: "ACTUALITE", libelle: "Actualités" },
] as const;

export default async function PageArticlesAdmin({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; cree?: string; maj?: string }>;
}) {
  const { type = "", cree, maj } = await searchParams;

  const where = type === "BLOG" || type === "ACTUALITE" ? { type } : {};
  const [articles, nbTotal] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: [{ majLe: "desc" }],
      select: { id: true, titre: true, slug: true, type: true, statut: true, publieLe: true, auteur: true, majLe: true },
    }),
    prisma.article.count(),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-h3 font-semibold">Articles ({nbTotal})</h2>
          <p className="mt-1 text-[14px] text-encre">Rédige les actualités du site et les articles du blog.</p>
        </div>
        <Bouton asChild taille="sm">
          <Link href="/admin/articles/nouveau">+ Nouvel article</Link>
        </Bouton>
      </div>

      {(cree || maj) && (
        <p role="status" className="mt-4 rounded-carte border border-[#00845c]/30 bg-[#00845c]/10 px-4 py-3 text-[14px] font-semibold text-[#00553a]">
          {cree ? "✅ Article créé avec succès." : "✅ Modifications enregistrées."}
        </p>
      )}

      {/* Filtres par type */}
      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filtrer par type">
        {FILTRES.map((f) => (
          <Link
            key={f.valeur}
            href={f.valeur ? `/admin/articles?type=${f.valeur}` : "/admin/articles"}
            className={cn(
              "rounded-full px-4 py-2 text-[14px] leading-5 font-semibold",
              type === f.valeur ? "bg-violet text-white" : "bg-white text-encre hover:text-bleu"
            )}
          >
            {f.libelle}
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        {articles.map((a) => (
          <Carte key={a.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[16px] leading-6 font-titre font-semibold">{a.titre}</h3>
                  <Badge variante={a.type === "ACTUALITE" ? "magenta" : "source"}>
                    {a.type === "ACTUALITE" ? "Actualité" : "Blog"}
                  </Badge>
                  <Badge variante={a.statut === "PUBLIE" ? "gratuit" : "defaut"}>
                    {a.statut === "PUBLIE" ? "Publié" : "Brouillon"}
                  </Badge>
                </div>
                <p className="mt-1 text-[13px] text-encre">
                  /articles/{a.slug} · {a.auteur} ·{" "}
                  {a.statut === "PUBLIE" ? `publié le ${formatteDate(a.publieLe)}` : `modifié le ${formatteDate(a.majLe)}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Bouton asChild taille="sm" variante="secondaire">
                  <Link href={`/admin/articles/${a.id}`}>
                    <Pencil className="size-4" aria-hidden /> Modifier
                  </Link>
                </Bouton>
                <form action={basculerPublicationArticleFormulaire}>
                  <input type="hidden" name="articleId" value={a.id} />
                  <Bouton taille="sm" variante="secondaire" type="submit">
                    {a.statut === "PUBLIE" ? "Dépublier" : "Publier"}
                  </Bouton>
                </form>
                <form action={supprimerArticleFormulaire}>
                  <input type="hidden" name="articleId" value={a.id} />
                  <BoutonConfirmer
                    message={`Supprimer « ${a.titre} » ? Action définitive.`}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-red-300 bg-white px-4 text-[14px] leading-5 font-semibold text-red-700 transition hover:bg-red-50"
                    type="submit"
                  >
                    Supprimer
                  </BoutonConfirmer>
                </form>
              </div>
            </div>
          </Carte>
        ))}
        {articles.length === 0 && (
          <Carte className="p-6 text-[14px] text-encre">
            Aucun article pour ce filtre. Rédige le premier avec « + Nouvel article ».
          </Carte>
        )}
      </div>
    </div>
  );
}