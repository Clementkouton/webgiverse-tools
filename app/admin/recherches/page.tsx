// app/admin/recherches/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 26 — RECHERCHE INTERNE : ce que les visiteurs tapent dans le
// moteur du catalogue (/outils?q=…), alimenté par la table
// RequeteRecherche (journalisée à chaque recherche, page 1).
//   • 4 indicateurs : recherches 30 j, termes uniques, taux sans
//     résultat, terme le plus fréquent ;
//   • TOP 15 des requêtes (volume, résultats moyens, lien vers la
//     recherche publique) ;
//   • « SANS RÉSULTAT » : l'or à exploiter — ce que les visiteurs
//     cherchent et que le catalogue n'a pas ;
//   • volume des recherches par jour sur 30 jours (SVG).
// Export CSV de l'historique groupé : /api/admin/recherches/export.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { Download, Lightbulb, Search, SearchX, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { CarteStatAdmin } from "@/components/admin/carte-stat-admin";
import { GraphiqueBarres } from "@/components/admin/graphique-barres";

export const metadata: Metadata = { title: "Recherches — Administration" };
export const dynamic = "force-dynamic";

const FENETRE_JOURS = 30;

export default async function PageRecherchesAdmin() {
  // Le client Prisma actuellement généré ne déclare pas encore ce modèle.
  const requeteRecherche = (prisma as any).requeteRecherche;

  const ilYa30j = new Date();
  ilYa30j.setDate(ilYa30j.getDate() - (FENETRE_JOURS - 1));
  ilYa30j.setHours(0, 0, 0, 0);

  const [
    total30j, sansResultat30j, termesUniques,
    topRequetes, requetesVides, recherches30j,
  ] = await Promise.all([
    requeteRecherche.count({ where: { creeLe: { gte: ilYa30j } } }),
    requeteRecherche.count({ where: { creeLe: { gte: ilYa30j }, nbResultats: 0 } }),
    requeteRecherche.findMany({
      where: { creeLe: { gte: ilYa30j } },
      distinct: ["terme"],
      select: { terme: true },
    }),
    requeteRecherche.groupBy({
      by: ["terme"],
      where: { creeLe: { gte: ilYa30j } },
      _count: { terme: true },
      _avg: { nbResultats: true },
      orderBy: { _count: { terme: "desc" } },
      take: 15,
    }),
    requeteRecherche.groupBy({
      by: ["terme"],
      where: { creeLe: { gte: ilYa30j }, nbResultats: 0 },
      _count: { terme: true },
      orderBy: { _count: { terme: "desc" } },
      take: 12,
    }),
    requeteRecherche.findMany({
      where: { creeLe: { gte: ilYa30j } },
      select: { creeLe: true },
    }),
  ]);

  // ── Série journalière du volume de recherches ───────────────────
  const compteurs = new Array<number>(FENETRE_JOURS).fill(0);
  for (const r of recherches30j) {
    const jour = new Date(r.creeLe);
    jour.setHours(0, 0, 0, 0);
    const ecart = Math.floor((jour.getTime() - ilYa30j.getTime()) / 86_400_000);
    if (ecart >= 0 && ecart < FENETRE_JOURS) compteurs[ecart]++;
  }
  const labels = compteurs.map((_, i) => {
    const j = new Date(ilYa30j);
    j.setDate(ilYa30j.getDate() + i);
    return String(j.getDate());
  });

  const tauxSansResultat =
    total30j > 0 ? Math.round((sansResultat30j / total30j) * 100) : 0;
  const topTerme = topRequetes[0]?.terme ?? "—";
  const maxTop = Math.max(
    ...topRequetes.map((t: { _count: { terme: number } }) => t._count.terme),
    1,
  );

  return (
    <div>
      {/* ── En-tête ─────────────────────────────────────────────────── */}
      <div className="animate-apparition-haut flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h3 font-semibold">Recherches internes</h1>
          <p className="mt-1 text-[14px] leading-6 text-encre">
            Ce que les visiteurs tapent dans le moteur d'outils — et ce qu'ils ne trouvent pas.
            L'or à exploiter pour enrichir le catalogue.
          </p>
        </div>
        <Link
          href="/api/admin/recherches/export"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primaire/30 bg-primaire/10 px-4 py-2 text-[13px] font-bold text-primaire-texte transition hover:border-primaire/60 hover:bg-primaire/15"
        >
          <Download className="size-4" aria-hidden /> Exporter l'historique (CSV)
        </Link>
      </div>

      {/* ── Indicateurs ─────────────────────────────────────────────── */}
      <section className="animate-apparition-haut mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CarteStatAdmin
          href="/admin/recherches"
          libelle="Recherches (30 j)"
          valeur={total30j.toLocaleString("fr-FR")}
          icone={Search}
          ton="primaire"
          contexte="pages de résultats affichées"
        />
        <CarteStatAdmin
          href="/admin/recherches"
          libelle="Termes uniques (30 j)"
          valeur={termesUniques.length.toLocaleString("fr-FR")}
          icone={TrendingUp}
          ton="info"
          contexte="requêtes différentes tapées"
        />
        <CarteStatAdmin
          href="/admin/recherches"
          libelle="Sans résultat (30 j)"
          valeur={`${tauxSansResultat} %`}
          icone={SearchX}
          ton={tauxSansResultat >= 20 ? "erreur" : "succes"}
          contexte={`${sansResultat30j} recherche${sansResultat30j > 1 ? "s" : ""} restée(s) vide(s)`}
        />
        <CarteStatAdmin
          href={`/outils?q=${encodeURIComponent(topRequetes[0]?.terme ?? "")}`}
          libelle="Terme n° 1"
          valeur={topTerme.length > 18 ? `${topTerme.slice(0, 18)}…` : topTerme}
          icone={TrendingUp}
          ton="succes"
          contexte={topRequetes[0] ? `${topRequetes[0]._count.terme} fois tapé` : "aucune recherche encore"}
        />
      </section>

      {/* ── Top requêtes + or à exploiter ───────────────────────────── */}
      <section className="animate-apparition-haut mt-6 grid gap-4 xl:grid-cols-2">
        {/* Top des requêtes */}
        <Carte className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-titre text-[15px] leading-6 font-semibold text-adm-sombre">
              Top des requêtes — {FENETRE_JOURS} jours
            </h2>
            <Badge variante="defaut">{topRequetes.length} terme{topRequetes.length > 1 ? "s" : ""}</Badge>
          </div>
          <div className="mt-3 grid gap-2.5">
            {topRequetes.length === 0 && (
              <p className="text-[13px] leading-5 text-encre">
                Aucune recherche enregistrée pour l'instant — les termes tapés dans le moteur du
                catalogue s'accumulent ici dès les premières visites.
              </p>
            )}
            {topRequetes.map((t: { terme: string; _count: { terme: number }; _avg: { nbResultats: number | null } }, i: number) => (
              <div key={t.terme} className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    href={`/outils?q=${encodeURIComponent(t.terme)}`}
                    className="min-w-0 truncate text-[13.5px] font-medium text-adm-sombre hover:text-primaire-texte hover:underline"
                    title={`Voir la recherche « ${t.terme} » comme un visiteur`}
                  >
                    <span className="mr-1.5 inline-block w-5 text-right text-[11px] font-bold text-adm-gris-clair">
                      {i + 1}.
                    </span>
                    {t.terme}
                  </Link>
                  <span className="flex shrink-0 items-center gap-2 text-[12px] font-semibold text-adm-gris">
                    <span className="rounded-full bg-adm-fond px-2 py-0.5 text-[11px] font-medium text-adm-gris">
                      {Math.round(t._avg.nbResultats ?? 0)} résultat
                      {Math.round(t._avg.nbResultats ?? 0) > 1 ? "s" : ""} en moyenne
                    </span>
                    <span className="text-adm-sombre">×{t._count.terme}</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-adm-fond">
                  <div
                    className="h-full rounded-full bg-primaire transition-[width] duration-500"
                    style={{ width: `${Math.max((t._count.terme / maxTop) * 100, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Carte>

        {/* Sans résultat — l'or à exploiter */}
        <Carte className="border-[#efdda8] bg-[#fdfaf1] p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-titre text-[15px] leading-6 font-semibold text-adm-sombre">
              <Lightbulb className="size-4 text-[#b26f00]" aria-hidden /> Sans résultat — l'or à exploiter
            </h2>
            <Badge variante="defaut" className="bg-adm-alerte-doux text-[#b26f00]">
              {requetesVides.length} terme{requetesVides.length > 1 ? "s" : ""}
            </Badge>
          </div>
          <p className="mt-1 text-[13px] leading-5 text-encre">
            Ces recherches n'ont renvoyé <strong>aucun outil</strong> : la demande existe déjà.
            Ajoute une fiche sur ces sujets (ou écris un article) pour capter cette audience.
          </p>
          <div className="mt-3 grid gap-2">
            {requetesVides.length === 0 && (
              <p className="text-[13px] leading-5 text-encre">
                Aucune recherche vide sur la période : le catalogue couvre ce que les visiteurs
                cherchent. Continue à surveiller cette liste chaque semaine.
              </p>
            )}
            {requetesVides.map((t: { terme: string; _count: { terme: number } }) => (
              <div
                key={t.terme}
                className="flex min-w-0 items-center justify-between gap-3 rounded-champ border border-[#efdda8] bg-white px-3.5 py-2.5"
              >
                <span className="min-w-0 truncate text-[13.5px] font-medium text-adm-sombre">
                  {t.terme}
                </span>
                <span className="shrink-0 rounded-full bg-adm-alerte-doux px-2 py-0.5 text-[11px] leading-4 font-bold text-[#b26f00]">
                  ×{t._count.terme} sans résultat
                </span>
              </div>
            ))}
          </div>
        </Carte>
      </section>

      {/* ── Volume 30 jours ─────────────────────────────────────────── */}
      <Carte className="animate-apparition-haut mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">
            Volume de recherches
          </h2>
          <Badge variante="defaut">{FENETRE_JOURS} derniers jours</Badge>
        </div>
        <p className="mt-1 text-[13px] leading-4 text-encre">
          {total30j > 0
            ? `${total30j.toLocaleString("fr-FR")} recherche${total30j > 1 ? "s" : ""} tapée${total30j > 1 ? "s" : ""} dans le moteur du catalogue.`
            : "Les recherches des visiteurs s'afficheront ici, jour par jour."}
        </p>
        <div className="mt-4">
          <GraphiqueBarres valeurs={compteurs} labels={labels} couleur="#49beff" />
        </div>
      </Carte>
    </div>
  );
}
