// app/admin/journal/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 25 — JOURNAL D'AUDIT de la console : les 100 dernières actions
// admin tracées automatiquement (créations, éditions, suppressions,
// bascules, exports…). Filtre par type d'action via les puces ;
// pagination « Charger la suite » par paramètre ?page=n.
// Alimenté par lib/journal-admin.ts (tracerActionAdmin).
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { History, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { EtatVideAdmin } from "@/components/admin/etat-vide-admin";
import { formatteDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Journal d'audit — Administration" };
export const dynamic = "force-dynamic";

const PAR_PAGE = 40;

/** Couleur douce de la pastille d'action selon sa famille. */
function pastilleAction(action: string): string {
  if (action.startsWith("EXPORT")) return "bg-adm-info-doux text-[#2b6be0]";
  if (/SUPPRIME|REFUSE/.test(action)) return "bg-adm-erreur-doux text-[#c94f35]";
  if (/CREE|APPROUVE|PUBLIE/.test(action)) return "bg-adm-succes-doux text-[#0b8a78]";
  return "bg-adm-alerte-doux text-[#b26f00]";
}

export default async function PageJournalAdmin({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  const { page, action } = await searchParams;
  const numeroPage = Math.max(1, Number(page ?? "1") || 1);
  const filtreAction = typeof action === "string" && action ? action : null;

  const [traces, total] = await Promise.all([
    prisma.journalAdmin.findMany({
      where: filtreAction ? { action: filtreAction } : undefined,
      orderBy: { creeLe: "desc" },
      skip: (numeroPage - 1) * PAR_PAGE,
      take: PAR_PAGE + 1, // +1 pour détecter la page suivante
    }),
    prisma.journalAdmin.count({ where: filtreAction ? { action: filtreAction } : undefined }),
  ]);

  const aLaSuite = traces.length > PAR_PAGE;
  const visibles = traces.slice(0, PAR_PAGE);

  // Familles d'actions présentes (pour les puces de filtre)
  const familles = await prisma.journalAdmin.findMany({
    select: { action: true },
    distinct: ["action"],
    orderBy: { action: "asc" },
  });

  const lienSuite = `/admin/journal?page=${numeroPage + 1}${filtreAction ? `&action=${filtreAction}` : ""}`;
  const lienPrecedent = numeroPage > 1 ? `/admin/journal?page=${numeroPage - 1}${filtreAction ? `&action=${filtreAction}` : ""}` : null;

  return (
    <div className="mx-auto px-4 pb-10 sm:px-6 lg:px-8">
      <div className="animate-apparition-haut flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h3 font-semibold">Journal d'audit</h1>
          <p className="mt-1 text-[14px] leading-6 text-encre">
            Qui a fait quoi dans la console : {total.toLocaleString("fr-FR")} action{total > 1 ? "s" : ""} enregistrée{total > 1 ? "s" : ""}.
          </p>
        </div>
        <Badge className="border-transparent bg-adm-info-doux text-[#2b6be0]">
          <ShieldCheck className="mr-1 size-3.5" aria-hidden /> Traçage automatique
        </Badge>
      </div>

      {/* ── Puces de filtre par action ──────────────────────────────── */}
      {familles.length > 1 && (
        <div className="animate-apparition-haut mt-5 flex flex-wrap items-center gap-2">
          <Link
            href="/admin/journal"
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition",
              !filtreAction
                ? "bg-primaire text-white shadow-[0_2px_10px_rgba(93,135,255,0.35)]"
                : "border border-bordure bg-white text-adm-gris hover:border-primaire hover:text-primaire-texte",
            )}
          >
            Toutes
          </Link>
          {familles.map((f) => (
            <Link
              key={f.action}
              href={`/admin/journal?action=${f.action}`}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition",
                filtreAction === f.action
                  ? "bg-primaire text-white shadow-[0_2px_10px_rgba(93,135,255,0.35)]"
                  : "border border-bordure bg-white text-adm-gris hover:border-primaire hover:text-primaire-texte",
              )}
            >
              {f.action}
            </Link>
          ))}
        </div>
      )}

      {/* ── Liste ───────────────────────────────────────────────────── */}
      {visibles.length === 0 ? (
        <div className="mt-6">
          <EtatVideAdmin
            icone={History}
            titre="Aucune action enregistrée pour l'instant"
            description="Chaque création, édition, suppression ou export effectué dans la console apparaîtra ici automatiquement."
          />
        </div>
      ) : (
        <Carte className="animate-apparition-haut mt-6 overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-bordure text-[12px] uppercase tracking-wide text-legende text-encre">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Admin</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Cible</th>
                <th className="px-4 py-3 font-semibold">Détails</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((t) => (
                <tr key={t.id} className="border-t border-bordure align-top hover:bg-adm-fond/70">
                  <td className="whitespace-nowrap px-4 py-3 text-[13px] text-encre">
                    {formatteDate(t.creeLe)}
                    <span className="block text-[11px] text-adm-gris-clair">
                      {t.creeLe.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] font-medium text-adm-sombre">{t.adminNom ?? "Admin"}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold", pastilleAction(t.action))}>
                      {t.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13.5px] text-adm-sombre">{t.cible}</td>
                  <td className="max-w-[280px] break-words px-4 py-3 text-[12.5px] text-encre">{t.details ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Carte>
      )}

      {/* ── Pagination ──────────────────────────────────────────────── */}
      {(lienPrecedent || aLaSuite) && (
        <div className="mt-5 flex items-center justify-between">
          {lienPrecedent ? (
            <Link href={lienPrecedent} className="text-[13px] font-semibold text-primaire-texte hover:underline">← Page précédente</Link>
          ) : <span />}
          {aLaSuite && (
            <Link href={lienSuite} className="flex items-center gap-1.5 text-[13px] font-semibold text-primaire-texte hover:underline">
              <History className="size-4" aria-hidden /> Actions plus anciennes →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
