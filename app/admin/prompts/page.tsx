// app/admin/prompts/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 34 — Contrôle de la BIBLIOTHÈQUE DE PROMPTS depuis la console
// admin :
//   • tuiles de statistiques conservées (prompts, vues, favoris,
//     catégories) ;
//   • tableau géré par GestionListeAdmin : recherche PAR MOTS (ordre
//     libre, accents ignorés), filtres par type et par catégorie,
//     cases à cocher avec sélections rapides (40 / 150 / 200) et
//     suppression EN MASSE ;
//   • actions par ligne : bascule du badge « Nouveau » (réparée : le
//     bouton était hors formulaire) et suppression (unitaire ou masse).
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import { Files, FolderOpen, Heart, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import {
  basculerPromptNouveauFormulaire,
  supprimerPromptsMasseAction,
} from "@/app/actions/admin";
import { GestionListeAdmin } from "@/components/admin/gestion-liste-admin";
import { PASTILLE_TUILE, type Ton } from "@/components/admin/carte-stat-admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Prompts — Administration" };
export const dynamic = "force-dynamic";

const PASTILLE_TYPE: Record<string, string> = {
  TEXTE: "bg-primaire/10 text-primaire-texte",
  IMAGE: "bg-adm-info-doux text-[#2b6be0]",
  CODE: "bg-adm-alerte-doux text-[#b26f00]",
};
const LIBELLE_TYPE: Record<string, string> = {
  TEXTE: "Texte",
  IMAGE: "Image",
  CODE: "Code",
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
          La bibliothèque de prompts métiers : recherche par mots, filtres, sélection multiple et suppression en masse.
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

      {/* ── Tableau géré (recherche, filtres, sélection, masse) ────── */}
      <div className="animate-apparition-haut delai-2 mt-4">
        <GestionListeAdmin
          libelleTerme="prompt"
          colonnes={["Catégorie", "Vues", "Favoris"]}
          actionSupprimerMasse={supprimerPromptsMasseAction}
          actionBasculerNouveau={basculerPromptNouveauFormulaire}
          champId="promptId"
          filtres={[
            { champ: "type", label: "Type" },
            { champ: "categorie", label: "Catégorie" },
          ]}
          items={prompts.map((p) => ({
            id: p.id,
            titre: p.titre,
            emoji: p.emoji,
            href: `/prompts/${p.slug}`,
            sousTitre: `/prompts/${p.slug}`,
            badges: [{ label: LIBELLE_TYPE[p.type] ?? p.type, classe: PASTILLE_TYPE[p.type] ?? "bg-adm-fond text-adm-gris" }],
            cellules: [p.categorie.nom, String(p.vues), String(p._count.favoris)],
            recherche: `${p.titre} ${p.categorie.nom} ${LIBELLE_TYPE[p.type] ?? p.type} ${p.slug}`,
            filtres: { type: LIBELLE_TYPE[p.type] ?? p.type, categorie: p.categorie.nom },
            nouveau: p.nouveau,
          }))}
        />
      </div>
    </div>
  );
}
