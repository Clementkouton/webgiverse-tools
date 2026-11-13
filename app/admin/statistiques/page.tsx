// app/admin/statistiques/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 25 — STATISTIQUES D'AUDIENCE par contenu :
//   • totaux de vues (outils / articles / prompts / tutoriels) ;
//   • top 8 de chaque catégorie, trié par vues ;
//   • 2 graphiques 30 jours : nouveaux inscrits et avis déposés par
//     jour (composant SVG existant GraphiqueBarres).
// Les compteurs « vues » sont alimentés par les pages publiques
// (incrément à chaque affichage de fiche).
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import {
  Eye,
  MonitorPlay,
  Newspaper,
  TerminalSquare,
  UserPlus,
  Wrench,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { CarteStatAdmin } from "@/components/admin/carte-stat-admin";
import { GraphiqueBarres } from "@/components/admin/graphique-barres";

export const metadata: Metadata = { title: "Statistiques — Administration" };
export const dynamic = "force-dynamic";

const TOP = 8;

export default async function PageStatistiquesAdmin() {
  const ilY_a30j = new Date();
  ilY_a30j.setDate(ilY_a30j.getDate() - 29);
  ilY_a30j.setHours(0, 0, 0, 0);

  const [
    sommeOutils, sommeArticles, sommePrompts, sommeTutos,
    topOutils, topArticles, topPrompts, topTutos,
    inscrits30j, avis30j,
  ] = await Promise.all([
    prisma.tool.aggregate({ _sum: { vues: true } }),
    prisma.article.aggregate({ _sum: { vues: true } }),
    prisma.prompt.aggregate({ _sum: { vues: true } }),
    prisma.tuto.aggregate({ _sum: { vues: true } }),
    prisma.tool.findMany({
      where: { vues: { gt: 0 } },
      orderBy: { vues: "desc" }, take: TOP,
      select: { nom: true, slug: true, vues: true },
    }),
    prisma.article.findMany({
      where: { vues: { gt: 0 } },
      orderBy: { vues: "desc" }, take: TOP,
      select: { titre: true, slug: true, vues: true },
    }),
    prisma.prompt.findMany({
      where: { vues: { gt: 0 } },
      orderBy: { vues: "desc" }, take: TOP,
      select: { titre: true, slug: true, vues: true },
    }),
    prisma.tuto.findMany({
      where: { vues: { gt: 0 } },
      orderBy: { vues: "desc" }, take: TOP,
      select: { titre: true, slug: true, vues: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: ilY_a30j } },
      select: { createdAt: true },
    }),
    prisma.avis.findMany({
      where: { creeLe: { gte: ilY_a30j } },
      select: { creeLe: true },
    }),
  ]);

  /** Regroupe des dates sur les 30 derniers jours → compteurs journaliers. */
  function serie30j(dates: Date[]): { valeurs: number[]; labels: string[] } {
    const compteurs = new Array<number>(30).fill(0);
    for (const d of dates) {
      const jour = new Date(d);
      jour.setHours(0, 0, 0, 0);
      const ecart = Math.floor((jour.getTime() - ilY_a30j.getTime()) / 86_400_000);
      if (ecart >= 0 && ecart < 30) compteurs[ecart]++;
    }
    return {
      valeurs: compteurs,
      labels: compteurs.map((_, i) => {
        const j = new Date(ilY_a30j);
        j.setDate(ilY_a30j.getDate() + i);
        return String(j.getDate());
      }),
    };
  }

  const serieInscrits = serie30j(inscrits30j.map((u) => u.createdAt));
  const serieAvis = serie30j(avis30j.map((a) => a.creeLe));
  const totalInscrits = serieInscrits.valeurs.reduce((a, b) => a + b, 0);
  const totalAvis = serieAvis.valeurs.reduce((a, b) => a + b, 0);

  /** Liste « top » réutilisable. */
  function TopListe({
    titre,
    items,
    hrefBase,
  }: {
    titre: string;
    items: { nom: string; slug: string; vues: number }[];
    hrefBase: string;
  }) {
    const maxV = Math.max(...items.map((i) => i.vues), 1);
    return (
      <Carte className="overflow-hidden p-5">
        <h3 className="font-titre text-[15px] leading-6 font-semibold text-adm-sombre">{titre}</h3>
        <div className="mt-3 grid gap-2.5">
          {items.length === 0 && (
            <p className="text-[13px] leading-5 text-encre">Aucune vue enregistrée pour l'instant — les compteurs démarrent dès la mise en ligne.</p>
          )}
          {items.map((item, i) => (
            <div key={item.slug} className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <Link href={`${hrefBase}/${item.slug}`} className="min-w-0 truncate text-[13.5px] font-medium text-adm-sombre hover:text-primaire-texte hover:underline">
                  <span className="mr-1.5 inline-block w-4 text-right text-[11px] font-bold text-adm-gris-clair">{i + 1}.</span>
                  {item.nom}
                </Link>
                <span className="shrink-0 text-[12px] font-semibold text-adm-gris">{item.vues.toLocaleString("fr-FR")}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-[7px]  not-italic bg-adm-fond">
                <div
                  className="h-full rounded-[7px]  not-italic bg-primaire transition-[width] duration-500"
                  style={{ width: `${Math.max((item.vues / maxV) * 100, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Carte>
    );
  }

  return (
    <div>
      <div className="animate-apparition-haut">
        <h1 className="text-h3 font-semibold">Statistiques d'audience</h1>
        <p className="mt-1 text-[14px] leading-6 text-encre">
          Ce que vos visiteurs regardent vraiment : vues cumulées, tops de contenu et activité des 30 derniers jours.
        </p>
      </div>

      {/* ── Totaux de vues ───────────────────────────────────────────── */}
      <section className="animate-apparition-haut mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CarteStatAdmin
          href="/admin/outils" libelle="Outils" icone={Wrench} ton="primaire"
          valeur={(sommeOutils._sum.vues ?? 0).toLocaleString("fr-FR")} contexte="Nombre de fiches outils"
        />
        <CarteStatAdmin
          href="/admin/articles" libelle="Vues articles" icone={Newspaper} ton="info"
          valeur={(sommeArticles._sum.vues ?? 0).toLocaleString("fr-FR")} contexte="Blog + actualités"
        />
        <CarteStatAdmin
          href="/admin/prompts" libelle="Vues prompts" icone={TerminalSquare} ton="succes"
          valeur={(sommePrompts._sum.vues ?? 0).toLocaleString("fr-FR")} contexte="Fiches de prompts"
        />
        <CarteStatAdmin
          href="/admin/tutoriels" libelle="Vues tutoriels" icone={MonitorPlay} ton="alerte"
          valeur={(sommeTutos._sum.vues ?? 0).toLocaleString("fr-FR")} contexte="Fiches vidéo"
        />
      </section>

      {/* ── Tops ─────────────────────────────────────────────────────── */}
      <section className="animate-apparition-haut mt-8 grid gap-4 xl:grid-cols-2">
        <TopListe titre="Top outils les plus consultés" items={topOutils.map((o) => ({ nom: o.nom, slug: o.slug, vues: o.vues }))} hrefBase="/outil" />
        <TopListe titre="Top articles les plus lus" items={topArticles.map((a) => ({ nom: a.titre, slug: a.slug, vues: a.vues }))} hrefBase="/articles" />
        <TopListe titre="Top prompts les plus consultés" items={topPrompts.map((p) => ({ nom: p.titre, slug: p.slug, vues: p.vues }))} hrefBase="/prompts" />
        <TopListe titre="Top tutoriels les plus regardés" items={topTutos.map((t) => ({ nom: t.titre, slug: t.slug, vues: t.vues }))} hrefBase="/tutoriels" />
      </section>

      {/* ── Graphiques 30 jours ─────────────────────────────────────── */}
      <section className="animate-apparition-haut mt-8 grid gap-4 xl:grid-cols-2">
        <Carte className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-titre text-[15px] leading-6 font-semibold text-adm-sombre">
              <UserPlus className="size-4 text-primaire" aria-hidden /> Nouveaux inscrits — 30 jours
            </h3>
            <span className="flex items-center gap-1 text-[13px] font-semibold text-primaire-texte">
              <Eye className="size-3.5" aria-hidden /> {totalInscrits}
            </span>
          </div>
          <div className="mt-3">
            <GraphiqueBarres valeurs={serieInscrits.valeurs} labels={serieInscrits.labels} />
          </div>
        </Carte>
        <Carte className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-titre text-[15px] leading-6 font-semibold text-adm-sombre">
              <UserPlus className="size-4 text-primaire" aria-hidden /> Avis déposés — 30 jours
            </h3>
            <span className="flex items-center gap-1 text-[13px] font-semibold text-primaire-texte">
              <Eye className="size-3.5" aria-hidden /> {totalAvis}
            </span>
          </div>
          <div className="mt-3">
            <GraphiqueBarres valeurs={serieAvis.valeurs} labels={serieAvis.labels} couleur="#15deb9" />
          </div>
        </Carte>
      </section>
    </div>
  );
}
