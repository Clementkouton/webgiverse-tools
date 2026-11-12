// app/admin/segments/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 26 — SEGMENTS UTILISATEURS prêts à l'emploi :
//   • Premium expirant (≤ 14 jours)  → à relancer avant expiration ;
//   • Inactifs 30 jours              → à réactiver ;
//   • Parrains actifs                → vos meilleurs ambassadeurs ;
//   • Inscrits cette semaine         → message de bienvenue.
// Chaque carte donne le nombre de membres ; le clic ouvre la liste
// (tableau) et un bouton exporte le segment en CSV
// (/api/admin/segments/[segment], même requête, zéro duplication —
// la logique vit dans lib/segments.ts).
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import {
  Download,
  Gift,
  Hourglass,
  UserPlus,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import {
  compterTousLesSegments,
  estCleSegment,
  lireUtilisateursSegment,
  SEGMENTS,
  type CleSegment,
} from "@/lib/segments";

export const metadata: Metadata = { title: "Segments — Administration" };
export const dynamic = "force-dynamic";

const ICONES: Record<CleSegment, LucideIcon> = {
  "premium-expirant": Hourglass,
  "inactifs-30j": UserX,
  "parrains-actifs": Gift,
  "inscrits-semaine": UserPlus,
};

const TONS: Record<CleSegment, string> = {
  "premium-expirant": "bg-adm-alerte-doux text-[#b26f00]",
  "inactifs-30j": "bg-adm-erreur-doux text-[#c94f35]",
  "parrains-actifs": "bg-adm-succes-doux text-[#0f9b85]",
  "inscrits-semaine": "bg-primaire/10 text-primaire-texte",
};

type Parametres = Promise<Record<string, string | string[] | undefined>>;

export default async function PageSegmentsAdmin({
  searchParams,
}: {
  searchParams: Parametres;
}) {
  const params = await searchParams;
  const brut = typeof params.segment === "string" ? params.segment : "";
  const segmentActif: CleSegment | null = brut && estCleSegment(brut) ? brut : null;

  const compteurs = await compterTousLesSegments();
  const membres = segmentActif ? await lireUtilisateursSegment(segmentActif) : [];
  const definition = segmentActif
    ? SEGMENTS.find((s) => s.cle === segmentActif)!
    : null;

  const formatteurDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  const maintenant = new Date();

  return (
    <div>
      {/* ── En-tête ─────────────────────────────────────────────────── */}
      <div className="animate-apparition-haut">
        <h1 className="text-h3 font-semibold">Segments utilisateurs</h1>
        <p className="mt-1 text-[14px] leading-6 text-encre">
          Des filtres prêts à l'emploi pour relancer, réactiver et féliciter — chaque segment
          s'exporte en CSV pour ta newsletter ou ton tableur.
        </p>
      </div>

      {/* ── Cartes des segments ─────────────────────────────────────── */}
      <section className="animate-apparition-haut mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SEGMENTS.map((segment) => {
          const Icone = ICONES[segment.cle];
          const actif = segmentActif === segment.cle;
          return (
            <Link
              key={segment.cle}
              href={`/admin/segments?segment=${segment.cle}`}
              className={`group flex flex-col rounded-carte border bg-white p-5 shadow-carte transition hover:shadow-[0_8px_28px_rgba(93,135,255,0.12)] ${
                actif ? "border-primaire ring-2 ring-primaire/30" : "border-adm-bordure hover:border-primaire/40"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className={`grid size-11 place-items-center rounded-xl ${TONS[segment.cle]}`}>
                  <Icone className="size-5" aria-hidden />
                </span>
                <span className="font-titre text-[24px] leading-8 font-bold text-adm-sombre">
                  {compteurs[segment.cle].toLocaleString("fr-FR")}
                </span>
              </span>
              <span className="mt-3 block text-[14px] leading-5 font-semibold text-adm-sombre group-hover:text-primaire-texte">
                {segment.titre}
              </span>
              <span className="mt-1 block text-[12px] leading-4 text-encre">{segment.description}</span>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-primaire-texte">
                {actif ? "Liste affichée ci-dessous" : "Voir la liste + CSV"}
                {!actif && (
                  <Download className="size-3.5 transition group-hover:translate-y-0.5" aria-hidden />
                )}
              </span>
            </Link>
          );
        })}
      </section>

      {/* ── Liste du segment sélectionné ────────────────────────────── */}
      {segmentActif && definition && (
        <Carte className="animate-apparition-haut mt-6 p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-adm-bordure px-5 py-4">
            <div>
              <h2 className="flex items-center gap-2 font-titre text-[16px] leading-6 font-semibold text-adm-sombre">
                {definition.titre}
                <Badge variante="defaut">
                  {membres.length} membre{membres.length > 1 ? "s" : ""}
                </Badge>
              </h2>
              <p className="mt-0.5 text-[12.5px] leading-4 text-encre">{definition.description}</p>
            </div>
            <a
              href={`/api/admin/segments/${segmentActif}`}
              className="inline-flex items-center gap-1.5 rounded-[7px] -skew-x-[18deg] border border-primaire/30 bg-primaire/10 px-4 py-2 text-[13px] font-bold text-primaire-texte transition hover:border-primaire/60 hover:bg-primaire/15"
            >
              <Download className="size-4" aria-hidden /> Exporter ce segment (CSV)
            </a>
          </div>

          {membres.length === 0 ? (
            <p className="px-5 py-8 text-center text-[14px] leading-5 text-encre">
              Aucun membre dans ce segment pour le moment — la liste se remplira automatiquement.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-150 text-left text-[14px] leading-5">
                <thead className="text-left text-legende text-encre">
                  <tr>
                    <th className="px-5 py-3">Membre</th>
                    <th className="px-3 py-3">Inscrit le</th>
                    <th className="px-3 py-3">Premium</th>
                    <th className="px-5 py-3 text-right">
                      {segmentActif === "premium-expirant" ? "Expire dans" : "Détail"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {membres.map((membre) => {
                    const joursAvantExpiration = membre.premiumJusquAu
                      ? Math.max(
                          0,
                          Math.ceil(
                            (new Date(membre.premiumJusquAu).getTime() - maintenant.getTime()) /
                              86_400_000,
                          ),
                        )
                      : null;
                    return (
                      <tr
                        key={membre.id}
                        className="border-t border-bordure transition hover:bg-adm-fond/70"
                      >
                        <td className="px-5 py-3.5">
                          <span className="block font-semibold text-adm-sombre">
                            {membre.nom || "Sans nom"}
                          </span>
                          <span className="block text-[12px] leading-4 text-encre">
                            {membre.email}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-encre">
                          {formatteurDate.format(new Date(membre.inscritLe))}
                        </td>
                        <td className="px-3 py-3.5">
                          {membre.plan ? (
                            <Badge
                              variante="defaut"
                              className="bg-primaire/10 text-primaire-texte"
                            >
                              {membre.plan === "PRO" ? "Pro" : "Entreprise"}
                            </Badge>
                          ) : (
                            <span className="text-[12px] text-adm-gris-clair">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {segmentActif === "premium-expirant" && joursAvantExpiration !== null ? (
                            <span
                              className={`inline-flex items-center rounded-[7px] -skew-x-[18deg] px-2 py-0.5 text-[11px] leading-4 font-bold ${
                                joursAvantExpiration <= 7
                                  ? "bg-adm-erreur-doux text-[#c94f35]"
                                  : "bg-adm-alerte-doux text-[#b26f00]"
                              }`}
                            >
                              {joursAvantExpiration} jour{joursAvantExpiration > 1 ? "s" : ""}
                            </span>
                          ) : segmentActif === "parrains-actifs" ? (
                            <span className="text-[12.5px] font-semibold text-encre">
                              {membre.filleulsRecompenses} filleul
                              {membre.filleulsRecompenses > 1 ? "s" : ""} récompensé
                              {membre.filleulsRecompenses > 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="text-[12px] text-adm-gris-clair">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Carte>
      )}

      {/* ── Aide ────────────────────────────────────────────────────── */}
      <p className="animate-apparition-haut mt-4 px-1 text-[12.5px] leading-5 text-adm-gris">
        Astuce : le segment « Inactifs 30 jours » combine les connexions, l'activité du site, les
        avis et les paiements — un membre qui a fait l'un des quatre durant le mois n'y apparaît pas.
      </p>
    </div>
  );
}
