// app/admin/outils/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 34 — Contrôle des OUTILS depuis la console admin :
//   • pastilles de statut (URL) et notices conservées ;
//   • tableau géré par GestionListeAdmin : recherche PAR MOTS (ordre
//     libre, accents ignorés — la recherche « nom contient » stricte
//     est remplacée par le filtre intelligent), filtre par type,
//     cases à cocher avec sélections rapides (40 / 150 / 200) et
//     suppression EN MASSE (favoris, avis, votes et catégories liées
//     nettoyés par les cascades de la base) ;
//   • actions par ligne conservées : publier/archiver, mise en avant,
//     modifier, supprimer.
// La recherche topbar (?q=) continue de fonctionner : elle initialise
// la recherche du tableau.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Bouton } from "@/components/ui/bouton";
import {
  basculerMiseEnAvantFormulaire,
  basculerPublicationFormulaire,
  supprimerOutilsMasseAction,
} from "@/app/actions/admin";
import { GestionListeAdmin } from "@/components/admin/gestion-liste-admin";
import { formatteDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Outils — Administration" };
export const dynamic = "force-dynamic";

const FILTRES = [
  { valeur: "", libelle: "Tous" },
  { valeur: "PUBLIE", libelle: "Publiés" },
  { valeur: "BROUILLON", libelle: "Brouillons" },
  { valeur: "ARCHIVE", libelle: "Archivés" },
] as const;

export default async function PageOutilsAdmin({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; cree?: string; maj?: string; q?: string }>;
}) {
  const { statut = "", cree, maj, q = "" } = await searchParams;

  const filtreStatut =
    statut === "PUBLIE" || statut === "BROUILLON" || statut === "ARCHIVE"
      ? { statut: statut as "PUBLIE" | "BROUILLON" | "ARCHIVE" }
      : {};
  const [outils, nbTotal] = await Promise.all([
    prisma.tool.findMany({
      where: filtreStatut,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, nom: true, slug: true, logo: true, type: true, statut: true,
        misEnAvant: true, updatedAt: true, description: true,
      },
    }),
    prisma.tool.count(),
  ]);

  const libelleStatut = (s: string) => (s === "PUBLIE" ? "Publié" : s === "ARCHIVE" ? "Archivé" : "Brouillon");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-h3 font-semibold">
            Outils ({outils.length}
            {statut ? "" : `/${nbTotal}`})
          </h2>
          <p className="mt-1 text-[14px] text-encre">
            Recherche par mots, filtres, sélection multiple et suppression en masse.
          </p>
        </div>
        <Bouton asChild taille="sm" variante="indigo">
          <Link href="/admin/outils/nouveau">+ Nouvel outil</Link>
        </Bouton>
      </div>

      {(cree || maj) && (
        <p role="status" className="mt-4 rounded-carte border border-adm-succes/40 bg-adm-succes-doux px-4 py-3 text-[14px] font-semibold text-[#0b8a78]">
          {cree ? "✅ Outil créé avec succès." : "✅ Modifications enregistrées."}
        </p>
      )}

      {/* Filtres par statut */}
      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
        {FILTRES.map((f) => (
          <Link
            key={f.valeur}
            href={f.valeur ? `/admin/outils?statut=${f.valeur}` : "/admin/outils"}
            className={
              statut === f.valeur
                ? "rounded-[7px] -skew-x-[18deg] not-italic border border-transparent bg-primaire px-4 py-2 text-[14px] leading-5 font-semibold text-white shadow-[0_2px_10px_rgba(93,135,255,0.35)]"
                : "rounded-[7px] -skew-x-[18deg] not-italic border border-adm-bordure bg-white px-4 py-2 text-[14px] leading-5 font-semibold text-adm-gris transition hover:border-primaire/40 hover:text-primaire-texte"
            }
          >
            {f.libelle}
          </Link>
        ))}
      </div>

      {/* ── Tableau géré (recherche par mots, filtres, masse) ─────── */}
      <div className="mt-4">
        <GestionListeAdmin
          libelleTerme="outil"
          colonnes={["Modifié"]}
          rechercheInitiale={q}
          actionSupprimerMasse={supprimerOutilsMasseAction}
          actionBasculerStatut={basculerPublicationFormulaire}
          actionBasculerMiseEnAvant={basculerMiseEnAvantFormulaire}
          champId="outilId"
          filtres={[{ champ: "type", label: "Type" }]}
          items={outils.map((o) => ({
            id: o.id,
            titre: o.nom,
            href: `/outil/${o.slug}`,
            hrefEdition: `/admin/outils/${o.id}`,
            sousTitre: `${o.slug} · ${o.type === "AGENT" ? "Agent IA" : "Outil"}`,
            logo: o.logo,
            badges: [
              {
                label: libelleStatut(o.statut),
                classe:
                  o.statut === "PUBLIE"
                    ? "bg-adm-succes-doux text-[#0b8a78]"
                    : o.statut === "ARCHIVE"
                      ? "bg-adm-fond text-adm-gris"
                      : "bg-adm-alerte-doux text-[#b26f00]",
              },
            ],
            cellules: [formatteDate(o.updatedAt)],
            recherche: `${o.nom} ${o.slug} ${o.type === "AGENT" ? "agent" : "outil"} ${libelleStatut(o.statut)} ${o.description}`,
            filtres: { type: o.type === "AGENT" ? "Agent IA" : "Outil", statut: o.statut },
            miseEnAvant: o.misEnAvant,
          }))}
        />
      </div>
    </div>
  );
}
