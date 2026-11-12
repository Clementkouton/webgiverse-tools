// app/admin/articles/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 22 — Catalogue des articles, style « TailwindAdmin » : chips
// de filtre indigo (actif plein, inactif contour gris), bannière de
// confirmation menthe douce, badges Blog/Actualité/Publié en
// pastilles pastel et boutons alignés sur la page Outils.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
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

/** Pastilles douces — mêmes teintes que Propositions / Abonnements. */
const PASTILLE_TYPE: Record<string, string> = {
  BLOG: "bg-adm-info-doux text-[#2b6be0]",
  ACTUALITE: "bg-adm-alerte-doux text-[#b26f00]",
};
const PASTILLE_STATUT: Record<string, string> = {
  PUBLIE: "bg-adm-succes-doux text-[#0b8a78]",
  BROUILLON: "bg-gris text-encre",
};

export default async function PageArticlesAdmin({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; cree?: string; maj?: string }>;
}) {
  const { type = "", cree, maj } = await searchParams;

  const where: Prisma.ArticleWhereInput = type === "BLOG" || type === "ACTUALITE" ? { type } : {};
  const [articles, nbTotal] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: [{ majLe: "desc" }],
      select: { id: true, titre: true, slug: true, type: true, statut: true, publieLe: true, auteur: true, majLe: true },
    }),
    prisma.article.count(),
  ]);

  return (
    <div className="mx-auto px-4 pb-10 sm:px-6 lg:px-8">
      <div className="animate-apparition-haut flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-h3 font-semibold">Articles ({nbTotal})</h1>
          <p className="mt-1 text-[14px] leading-6 text-encre">Rédige les actualités du site et les articles du blog.</p>
        </div>
        <Bouton asChild taille="sm" variante="indigo">
          <Link href="/admin/articles/nouveau">+ Nouvel article</Link>
        </Bouton>
      </div>

      {(cree || maj) && (
        <p role="status" className="animate-apparition-haut mt-4 rounded-carte border border-adm-succes/40 bg-adm-succes-doux px-4 py-3 text-[14px] font-semibold text-[#0b8a78]">
          {cree ? "✅ Article créé avec succès." : "✅ Modifications enregistrées."}
        </p>
      )}

      {/* Filtres par type */}
      <div className="animate-apparition-haut mt-6 flex flex-wrap gap-2" role="group" aria-label="Filtrer par type">
        {FILTRES.map((f) => (
          <Link
            key={f.valeur}
            href={f.valeur ? `/admin/articles?type=${f.valeur}` : "/admin/articles"}
            className={cn(
              "rounded-[7px] -skew-x-[18deg] not-italic border px-4 py-2 text-[14px] leading-5 font-semibold transition",
              type === f.valeur
                ? "border-transparent bg-primaire text-white shadow-[0_2px_10px_rgba(93,135,255,0.35)]"
                : "border-adm-bordure bg-white text-adm-gris hover:border-primaire/40 hover:text-primaire-texte",
            )}
          >
            {f.libelle}
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        {articles.map((a) => (
          <Carte key={a.id} className="animate-apparition-haut p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="text-[16px] leading-6 font-titre font-semibold text-adm-sombre">{a.titre}</h3>
                  <span className={cn("inline-flex rounded-[7px] -skew-x-[18deg] not-italic px-2.5 py-0.5 text-[12px] leading-4 font-semibold", PASTILLE_TYPE[a.type])}>
                    {a.type === "ACTUALITE" ? "Actualité" : "Blog"}
                  </span>
                  <span className={cn("inline-flex rounded-[7px] -skew-x-[18deg] not-italic px-2.5 py-0.5 text-[12px] leading-4 font-semibold", PASTILLE_STATUT[a.statut])}>
                    {a.statut === "PUBLIE" ? "Publié" : "Brouillon"}
                  </span>
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
                  <Bouton
                    taille="sm"
                    variante={a.statut === "PUBLIE" ? "fantome" : "indigoDoux"}
                    type="submit"
                  >
                    {a.statut === "PUBLIE" ? "Dépublier" : "Publier"}
                  </Bouton>
                </form>
                <form action={supprimerArticleFormulaire}>
                  <input type="hidden" name="articleId" value={a.id} />
                  <BoutonConfirmer
                    message={`Supprimer « ${a.titre} » ? Action définitive.`}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[7px] -skew-x-[18deg] not-italic border border-red-300 bg-white px-4 text-[14px] leading-5 font-semibold text-red-700 transition hover:bg-red-50"
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
          <Carte className="animate-apparition-haut p-6 text-[14px] text-encre">
            Aucun article pour ce filtre. Rédige le premier avec « + Nouvel article ».
          </Carte>
        )}
      </div>
    </div>
  );
}