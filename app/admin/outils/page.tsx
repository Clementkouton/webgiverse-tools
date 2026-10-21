// app/admin/outils/page.tsx
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
  searchParams: Promise<{ statut?: string; cree?: string; maj?: string }>;
}) {
  const { statut = "", cree, maj } = await searchParams;

  const where =
    statut === "PUBLIE" || statut === "BROUILLON" || statut === "ARCHIVE"
      ? { statut: statut as "PUBLIE" | "BROUILLON" | "ARCHIVE" }
      : {};
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
          <h2 className="text-h3 font-semibold">Outils ({nbTotal})</h2>
          <p className="mt-1 text-[14px] text-encre">Modifie les fiches, publie ou archive, mets en avant, supprime.</p>
        </div>
        <Bouton asChild taille="sm">
          <Link href="/admin/outils/nouveau">+ Nouvel outil</Link>
        </Bouton>
      </div>

      {(cree || maj) && (
        <p role="status" className="mt-4 rounded-carte border border-[#00845c]/30 bg-[#00845c]/10 px-4 py-3 text-[14px] font-semibold text-[#00553a]">
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
              "rounded-full px-4 py-2 text-[14px] leading-5 font-semibold",
              statut === f.valeur ? "bg-violet text-white" : "bg-white text-encre hover:text-bleu"
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
              <tr key={o.id} className="border-t border-bordure align-middle">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <LogoOutil nom={o.nom} logo={o.logo} />
                    <div className="min-w-0">
                      <Link href={`/outil/${o.slug}`} className="font-semibold text-violet hover:underline">
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
                      <Bouton taille="sm" variante="secondaire" type="submit">
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