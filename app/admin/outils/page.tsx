// app/admin/outils/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 22 — style « TailwindAdmin » : bouton indigo plein, notice de
// recherche indigo doux, filtres actifs indigo, liens de table en
// indigo lisible. Structure et requêtes inchangées.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { Bouton } from "@/components/ui/bouton";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import { LogoOutil } from "@/components/commun/logo-outil";
import {
  basculerMiseEnAvantFormulaire,
  basculerPublicationFormulaire,
  supprimerOutilFormulaire,
} from "@/app/actions/admin";
import { formatteDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

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
  // Lot 21 — recherche par nom (champ de recherche de la topbar admin)
  const filtreRecherche = q.trim()
    ? { nom: { contains: q.trim(), mode: "insensitive" as const } }
    : {};
  const where = { ...filtreStatut, ...filtreRecherche };
  const [outils, nbTotal] = await Promise.all([
    prisma.tool.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: { id: true, nom: true, slug: true, logo: true, type: true, statut: true, misEnAvant: true, updatedAt: true },
    }),
    prisma.tool.count(),
  ]);

  const libelleStatut = (s: string) => (s === "PUBLIE" ? "Publié" : s === "ARCHIVE" ? "Archivé" : "Brouillon");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-h3 font-semibold">Outils ({outils.length}{q.trim() ? ` résultat${outils.length > 1 ? "s" : ""}` : `/${nbTotal}`})</h2>
          <p className="mt-1 text-[14px] text-encre">Modifie les fiches, publie ou archive, mets en avant, supprime.</p>
        </div>
        <Bouton asChild taille="sm" variante="indigo">
          <Link href="/admin/outils/nouveau">+ Nouvel outil</Link>
        </Bouton>
      </div>

      {q.trim() && (
        <p role="status" className="mt-4 rounded-carte border border-primaire/30 bg-primaire/10 px-4 py-3 text-[14px] font-semibold text-primaire-texte">
          Recherche : {outils.length} outil{outils.length > 1 ? "s" : ""} pour « {q.trim()} » — <Link href="/admin/outils" className="underline">réinitialiser</Link>
        </p>
      )}

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
            className={cn(
              "rounded-full border px-4 py-2 text-[14px] leading-5 font-semibold transition",
              statut === f.valeur
                ? "border-transparent bg-primaire text-white shadow-[0_2px_10px_rgba(93,135,255,0.35)]"
                : "border-adm-bordure bg-white text-adm-gris hover:border-primaire/40 hover:text-primaire-texte",
            )}
          >
            {f.libelle}
          </Link>
        ))}
      </div>

      <Carte className="mt-4 overflow-x-auto p-2">
        <table className="w-full min-w-200 text-[14px] leading-5">
          <thead className="text-left text-legende text-encre">
            <tr>
              <th className="p-3">Outil</th>
              <th className="p-3">Statut</th>
              <th className="p-3">À la une</th>
              <th className="p-3">Modifié</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {outils.map((o) => (
              <tr key={o.id} className="border-t border-bordure align-middle transition hover:bg-adm-fond/70">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <LogoOutil nom={o.nom} logo={o.logo} />
                    <div className="min-w-0">
                      <Link href={`/outil/${o.slug}`} className="font-semibold text-primaire-texte hover:underline">
                        {o.nom}
                      </Link>
                      <p className="truncate text-[12px] text-encre">
                        {o.slug} · {o.type === "AGENT" ? "Agent IA" : "Outil"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <Badge variante={o.statut === "PUBLIE" ? "gratuit" : "defaut"}>{libelleStatut(o.statut)}</Badge>
                </td>
                <td className="p-3">{o.misEnAvant ? "⭐ Oui" : "Non"}</td>
                <td className="p-3 text-encre">{formatteDate(o.updatedAt)}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <Bouton asChild taille="sm" variante="secondaire">
                      <Link href={`/admin/outils/${o.id}`}>
                        <Pencil className="size-4" aria-hidden /> Modifier
                      </Link>
                    </Bouton>
                    <form action={basculerPublicationFormulaire}>
                      <input type="hidden" name="outilId" value={o.id} />
                      <Bouton taille="sm" variante="indigoDoux" type="submit">
                        {o.statut === "PUBLIE" ? "Archiver" : "Publier"}
                      </Bouton>
                    </form>
                    <form action={basculerMiseEnAvantFormulaire}>
                      <input type="hidden" name="outilId" value={o.id} />
                      <Bouton taille="sm" variante="fantome" type="submit">
                        {o.misEnAvant ? "Retirer de la une" : "Mettre en avant"}
                      </Bouton>
                    </form>
                    <form action={supprimerOutilFormulaire}>
                      <input type="hidden" name="outilId" value={o.id} />
                      <BoutonConfirmer
                        message={`Supprimer « ${o.nom} » ? Cette action est définitive : favoris, avis et votes liés seront aussi supprimés.`}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-red-300 bg-white px-4 text-[14px] leading-5 font-semibold text-red-700 transition hover:bg-red-50"
                        type="submit"
                      >
                        Supprimer
                      </BoutonConfirmer>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {outils.length === 0 && (
          <p className="p-6 text-[14px] text-encre">Aucun outil pour ce filtre. Crée-en un avec « + Nouvel outil ».</p>
        )}
      </Carte>
    </div>
  );
}