// app/dashboard/export/page.tsx
// Lot 19 — « Export premium » : promesse affichée sur /tarifs et dans la
// carte Premium (« export PDF »). Deux livrables sans AUCUNE librairie :
//   • PDF : page optimisée pour l'impression — le bouton ouvre la
//     fenêtre d'impression du navigateur, « Enregistrer au format PDF »
//     fait le reste (la barre latérale, la barre du haut et le pied de
//     page du dashboard sont masqués à l'impression via @media print).
//   • CSV : téléchargement direct via /api/export/csv?type=favoris|listes
//     (séparateur « ; » + BOM UTF-8 : accents corrects dans Excel FR).
// Accès réservé aux plans Premium actifs (Pro / Entreprise) ; les autres
// voient une carte d'invitation, jamais les données.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  Crown,
  Download,
  FileSpreadsheet,
  ListChecks,
  Lock,
  Printer,
  Star,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { premiumActif } from "@/lib/premium";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { BoutonImprimer } from "@/components/dashboard/bouton-imprimer";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = { title: "Export premium — Webgiverse" };
export const dynamic = "force-dynamic";

const formatteurDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

const LIBELLES_STATUT: Record<string, string> = {
  A_TESTER: "À tester",
  EN_COURS: "En cours",
  ADOPTE: "Adopté",
};

// Styles d'impression : on masque la coque du dashboard (barre latérale,
// barre du haut, pied de page) pour ne garder que le document.
const STYLES_IMPRESSION = `
@media print {
  aside, header, footer { display: none !important; }
  [data-zone-contenu] { padding-left: 0 !important; background: #fff !important; }
  body { background: #fff !important; }
  [data-zone-document] { box-shadow: none !important; border: none !important; }
  [data-eviter-coupure] { break-inside: avoid; }
}
`;

export default async function PageExport() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?suite=/dashboard/export");
  const userId = session.user.id;

  const premium = await premiumActif(userId);

  /* ── Non abonné : invitation, aucune donnée envoyée ─────────── */
  if (!premium) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 lg:py-10">
        <Link
          href="/dashboard"
          className="inline-flex min-h-9 items-center gap-1 text-[13px] leading-4 font-semibold text-encre transition hover:text-violet"
        >
          <ChevronLeft className="size-4" aria-hidden /> Tableau de bord
        </Link>
        <h1 className="mt-3 flex items-center gap-2 text-h2 font-semibold">
          <Crown className="size-7 text-violet" aria-hidden /> Export premium
        </h1>
        <Carte className="mt-8 p-10 text-center">
          <Lock className="mx-auto size-10 text-violet" aria-hidden />
          <h2 className="mt-3 font-titre text-[18px] leading-6 font-semibold text-bleu">
            L&apos;export PDF et CSV est réservé aux abonnés
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-encre">
            Exporte tes favoris et tes listes en PDF soigné ou en CSV (Excel,
            Google Sheets) — inclus dans les plans Pro et Entreprise dès{" "}
            <strong className="text-bleu">{PLANS.PRO.prix}/mois</strong>.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Bouton asChild>
              <Link href="/tarifs">
                <Crown className="size-4" aria-hidden /> Voir les tarifs
              </Link>
            </Bouton>
            <Bouton asChild variante="secondaire">
              <Link href="/dashboard/abonnement">Gérer mon abonnement</Link>
            </Bouton>
          </div>
        </Carte>
      </div>
    );
  }

  /* ── Abonné : données + document imprimable ─────────────────── */
  type FavoriExport = {
    id: string;
    statut: "A_TESTER" | "EN_COURS" | "ADOPTE";
    note: string | null;
    creeLe: Date;
    tool: {
      nom: string;
      slug: string;
      tarif: string | null;
      categories: { categorie: { nom: string } }[];
    };
  };
  type ListeExport = {
    id: string;
    nom: string;
    estPublique: boolean;
    createdAt: Date;
    items: { tool: { nom: string; slug: string } }[];
  };

  let favoris: FavoriExport[] = [];
  let listes: ListeExport[] = [];
  try {
    [favoris, listes] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          statut: true,
          note: true,
          creeLe: true,
          tool: {
            select: {
              nom: true,
              slug: true,
              tarif: true,
              categories: { select: { categorie: { select: { nom: true } } } },
            },
          },
        },
      }) as unknown as Promise<FavoriExport[]>,
      prisma.list.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          nom: true,
          estPublique: true,
          createdAt: true,
          items: {
            orderBy: { createdAt: "asc" },
            select: { tool: { select: { nom: true, slug: true } } },
          },
        },
      }) as unknown as Promise<ListeExport[]>,
    ]);
  } catch {
    favoris = [];
    listes = [];
  }

  const aujourdhui = formatteurDate.format(new Date());

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:py-10">
      {/* Règles d'impression (masque la coque du dashboard) */}
      <style dangerouslySetInnerHTML={{ __html: STYLES_IMPRESSION }} />

      <div className="print:hidden">
        <Link
          href="/dashboard"
          className="inline-flex min-h-9 items-center gap-1 text-[13px] leading-4 font-semibold text-encre transition hover:text-violet"
        >
          <ChevronLeft className="size-4" aria-hidden /> Tableau de bord
        </Link>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <h1 className="flex items-center gap-2 text-h2 font-semibold">
            <Crown className="size-7 text-violet" aria-hidden /> Export premium
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <BoutonImprimer />
            <Bouton asChild variante="secondaire">
              <a href="/api/export/csv?type=favoris">
                <FileSpreadsheet className="size-4" aria-hidden /> CSV favoris
              </a>
            </Bouton>
            <Bouton asChild variante="secondaire">
              <a href="/api/export/csv?type=listes">
                <FileSpreadsheet className="size-4" aria-hidden /> CSV listes
              </a>
            </Bouton>
          </div>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-encre">
          <Printer className="size-4" aria-hidden />
          Astuce : dans la fenêtre d&apos;impression, choisis « Enregistrer au format PDF ».
        </p>
      </div>

      {/* ══════════ Document imprimable ══════════ */}
      <div
        data-zone-document
        className="mt-6 rounded-carte border border-bordure bg-white p-6 shadow-carte sm:p-8"
      >
        {/* En-tête du document */}
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-bordure pb-4">
          <div>
            <p className="font-titre text-[20px] leading-7 font-bold text-bleu">
              Webgiverse — Mes outils IA
            </p>
            <p className="mt-0.5 text-[13px] leading-4 text-encre">
              Export du {aujourdhui} · {session.user.name ?? "Membre"}
            </p>
          </div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3 py-1 text-[12px] leading-4 font-bold text-sky-500">
            <Crown className="size-3.5" aria-hidden /> Premium
          </p>
        </div>

        {/* ── Section favoris ─────────────────────────────────────── */}
        <section data-eviter-coupure className="mt-6" aria-label="Mes favoris">
          <h2 className="flex items-center gap-2 font-titre text-[16px] leading-6 font-semibold text-bleu">
            <Star className="size-4.5 text-violet" aria-hidden /> Mes favoris ({favoris.length})
          </h2>
          {favoris.length === 0 ? (
            <p className="mt-2 text-[13px] leading-5 text-encre">Aucun favori enregistré.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-150 border-collapse text-[13px] leading-5">
                <thead>
                  <tr className="border-b border-bordure text-left text-[12px] leading-4 uppercase tracking-wide text-encre">
                    <th className="py-2 pr-3 font-bold">Outil</th>
                    <th className="py-2 pr-3 font-bold">Catégories</th>
                    <th className="py-2 pr-3 font-bold">Statut</th>
                    <th className="py-2 pr-3 font-bold">Note</th>
                    <th className="py-2 font-bold">Ajouté le</th>
                  </tr>
                </thead>
                <tbody>
                  {favoris.map((favori) => (
                    <tr key={favori.id} className="border-b border-bordure/60 align-top">
                      <td className="py-2 pr-3 font-semibold text-bleu">
                        {favori.tool.nom}
                        {favori.tool.tarif ? (
                          <span className="block text-[12px] font-normal text-encre">
                            {favori.tool.tarif}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3 text-encre">
                        {favori.tool.categories.map((c) => c.categorie.nom).join(", ") || "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <span className="inline-flex items-center gap-1 font-medium text-bleu">
                          {favori.statut === "ADOPTE" && (
                            <CheckCircle2 className="size-3.5 text-sky-500" aria-hidden />
                          )}
                          {LIBELLES_STATUT[favori.statut] ?? favori.statut}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-encre">{favori.note || "—"}</td>
                      <td className="py-2 text-encre">{formatteurDate.format(favori.creeLe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Section listes ──────────────────────────────────────── */}
        <section data-eviter-coupure className="mt-8" aria-label="Mes listes">
          <h2 className="flex items-center gap-2 font-titre text-[16px] leading-6 font-semibold text-bleu">
            <ListChecks className="size-4.5 text-violet" aria-hidden /> Mes listes ({listes.length})
          </h2>
          {listes.length === 0 ? (
            <p className="mt-2 text-[13px] leading-5 text-encre">Aucune liste enregistrée.</p>
          ) : (
            <ul className="mt-3 grid gap-3">
              {listes.map((liste) => (
                <li key={liste.id} className="rounded-carte border border-bordure p-4">
                  <p className="flex flex-wrap items-center gap-2 font-titre text-[14px] leading-5 font-semibold text-bleu">
                    {liste.nom}
                    {liste.estPublique && (
                      <span className="rounded-full bg-gris px-2 py-0.5 text-[11px] leading-4 font-bold text-encre">
                        publique
                      </span>
                    )}
                    <span className="text-[12px] font-normal text-encre">
                      · {liste.items.length} outil{liste.items.length > 1 ? "s" : ""}
                    </span>
                  </p>
                  {liste.items.length > 0 ? (
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] leading-5 text-encre">
                      {liste.items.map((item) => (
                        <li key={`${liste.id}-${item.tool.slug}`}>{item.tool.nom}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-1 text-[13px] leading-5 text-encre">Liste vide.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pied du document */}
        <p className="mt-8 border-t border-bordure pt-3 text-center text-[11px] leading-4 text-encre">
          Généré par Webgiverse Outils IA — webgiverse-tools.vercel.app
        </p>
      </div>

      {/* Rappel CSV (masqué à l'impression) */}
      <p className="print:hidden mt-4 flex items-center gap-1.5 text-[13px] leading-5 text-encre">
        <Download className="size-4" aria-hidden />
        Besoin de réutiliser les données ? Les exports CSV s&apos;ouvrent directement dans Excel et Google Sheets.
      </p>
    </div>
  );
}