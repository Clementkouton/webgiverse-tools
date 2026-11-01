// app/admin/prompts/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 22 — Contrôle de la BIBLIOTHÈQUE DE PROMPTS depuis la console
// admin :
//   • 4 tuiles de statistiques (prompts, vues, favoris, catégories)
//     avec pastilles pastel « TailwindAdmin » (indigo, info, corail,
//     menthe) ;
//   • tableau complet : catégorie, type, vues, favoris ;
//   • actions : basculer le badge « Nouveau », supprimer (confirmé).
// Tableau épuré, pastilles douces, interrupteurs indigo.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { Files, FolderOpen, Heart, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import {
  basculerPromptNouveauFormulaire,
  supprimerPromptFormulaire,
} from "@/app/actions/admin";
import { PASTILLE_TUILE, type Ton } from "@/components/admin/carte-stat-admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Prompts — Administration" };
export const dynamic = "force-dynamic";

const PASTILLE_TYPE: Record<string, string> = {
  TEXTE: "bg-primaire/10 text-primaire-texte",
  IMAGE: "bg-adm-info-doux text-[#2b6be0]",
  CODE: "bg-adm-alerte-doux text-[#b26f00]",
};

export default async function PagePromptsAdmin() {
  const [prompts, vuesTotales, nbCategories] = await Promise.all([
    prisma.prompt.findMany({
      orderBy: [{ vues: "desc" }, { majLe: "desc" }],
      select: {
        id: true, slug: true, titre: true, emoji: true, type: true,
        vues: true, nouveau: true,
        categorie: { select: { nom: true } },
        _count: { select: { favoris: true } },
      },
    }),
    prisma.prompt.aggregate({ _sum: { vues: true } }),
    prisma.promptCategorie.count(),
  ]);

  const nbFavoris = prompts.reduce((s, p) => s + p._count.favoris, 0);

  const TUILES: { libelle: string; valeur: number; icone: typeof Files; ton: Ton }[] = [
    { libelle: "Prompts publiés", valeur: prompts.length, icone: Files, ton: "primaire" },
    { libelle: "Vues cumulées", valeur: vuesTotales._sum.vues ?? 0, icone: Eye, ton: "info" },
    { libelle: "Favoris enregistrés", valeur: nbFavoris, icone: Heart, ton: "erreur" },
    { libelle: "Catégories", valeur: nbCategories, icone: FolderOpen, ton: "succes" },
  ];

  return (
    <div>
      <div className="animate-apparition-haut">
        <h1 className="text-h3 font-semibold">Prompts</h1>
        <p className="mt-1 text-[14px] leading-6 text-encre">
          La bibliothèque de prompts métiers (contenu complet réservé aux Premium) : popularité, sauvegardes et actions rapides.
        </p>
      </div>

      {/* ── Tuiles de statistiques ──────────────────────────────────── */}
      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TUILES.map((t, i) => (
          <Carte
            key={t.libelle}
            className="animate-apparition-haut flex items-center gap-4 p-5"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", PASTILLE_TUILE[t.ton])}>
              <t.icone className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-titre text-[24px] leading-8 font-bold text-adm-sombre">{t.valeur}</span>
              <span className="block truncate text-[13px] leading-4 font-semibold text-adm-gris">{t.libelle}</span>
            </span>
          </Carte>
        ))}
      </section>

      {/* ── Tableau des prompts ─────────────────────────────────────── */}
      <Carte className="animate-apparition-haut delai-2 mt-6 overflow-x-auto p-0">
        <table className="w-full min-w-200 text-[14px] leading-5">
          <thead className="text-left text-legende text-encre">
            <tr>
              <th className="px-5 py-3">Prompt</th>
              <th className="px-3 py-3">Catégorie</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Vues</th>
              <th className="px-3 py-3">Favoris</th>
              <th className="px-3 py-3">Nouveau</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {prompts.map((p) => (
              <tr key={p.id} className="border-t border-bordure transition hover:bg-adm-fond/70">
                <td className="max-w-80 px-5 py-3.5">
                  <Link href={`/prompts/${p.slug}`} className="flex items-center gap-2 font-semibold text-adm-sombre hover:text-primaire-texte">
                    <span aria-hidden className="text-[16px]">{p.emoji}</span>
                    <span className="truncate">{p.titre}</span>
                  </Link>
                  <span className="text-[12px] leading-4 text-encre">/prompts/{p.slug}</span>
                </td>
                <td className="px-3 py-3.5 text-encre">{p.categorie.nom}</td>
                <td className="px-3 py-3.5">
                  <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[12px] leading-4 font-semibold", PASTILLE_TYPE[p.type])}>
                    {p.type.toLowerCase()}
                  </span>
                </td>
                <td className="px-3 py-3.5 font-semibold text-primaire-texte tabular-nums">{p.vues}</td>
                <td className="px-3 py-3.5 text-encre tabular-nums">{p._count.favoris}</td>
                <td className="px-3 py-3.5">
                  <form action={basculerPromptNouveauFormulaire}>
                    <input type="hidden" name="promptId" value={p.id} />
                    <button
                      type="submit"
                      role="switch"
                      aria-checked={p.nouveau}
                      aria-label={`Badge nouveau : ${p.titre}`}
                      className={cn(
                        "relative h-6 w-10 shrink-0 rounded-full transition",
                        p.nouveau ? "bg-primaire" : "bg-adm-bordure",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
                          p.nouveau ? "left-[18px]" : "left-0.5",
                        )}
                      />
                    </button>
                  </form>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <BoutonConfirmer
                    message={`Supprimer définitivement « ${p.titre} » ? Les favoris des membres seront perdus.`}
                    className="inline-flex min-h-9 items-center justify-center rounded-full border border-red-300 bg-white px-3 text-[13px] leading-4 font-semibold text-red-700 transition hover:bg-red-50"
                    type="submit"
                  >
                    Supprimer
                  </BoutonConfirmer>
                </td>
              </tr>
            ))}
            {prompts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-encre">Aucun prompt pour l'instant.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Carte>
    </div>
  );
}