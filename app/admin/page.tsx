// app/admin/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { Bouton } from "@/components/ui/bouton";
import { approuverPropositionFormulaire, basculerMiseEnAvantFormulaire,
  basculerPublicationFormulaire, refuserPropositionFormulaire } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Administration" };
export const dynamic = "force-dynamic";

export default async function PageAdmin() {
  const [propositions, outils, abonnes] = await Promise.all([
    prisma.toolSubmission.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { category: true } }),
    prisma.tool.findMany({ orderBy: { updatedAt: "desc" }, take: 60 }),
    prisma.newsletterSubscriber.count(),
  ]);
  const enAttente = propositions.filter((p) => p.statut === "EN_ATTENTE");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:py-14">
      <h1 className="text-h2 font-semibold">Administration</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[["outils publiés", outils.filter((o) => o.statut === "PUBLIE").length],
          ["propositions en attente", enAttente.length],
          ["abonnés newsletter", abonnes]].map(([libelle, valeur]) => (
          <Carte key={String(libelle)} className="p-5">
            <p className="font-titre text-[28px] leading-9 font-bold">{valeur}</p>
            <p className="text-legende text-encre">{libelle}</p>
          </Carte>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-h3 font-semibold">Propositions d'outils</h2>
        <div className="mt-4 grid gap-3">
          {propositions.map((p) => (
            <Carte key={p.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-titre text-[17px] leading-6 font-semibold">{p.nom}</h3>
                <Badge>{p.statut === "EN_ATTENTE" ? "En attente" : p.statut === "APPROUVE" ? "Approuvé" : "Refusé"}</Badge>
                {p.category && <Badge variante="source">{p.category.nom}</Badge>}
              </div>
              <p className="mt-2 text-[14px] leading-5 text-encre">{p.description}</p>
              <p className="mt-1 text-[13px] leading-5 text-encre">
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-violet hover:underline">{p.url}</a>
                {p.tarif ? ` · ${p.tarif}` : ""}{p.contact ? ` · ${p.contact}` : ""}
              </p>
              {p.statut === "EN_ATTENTE" && (
                <div className="mt-4 flex gap-2">
                  <form action={approuverPropositionFormulaire}>
                    <input type="hidden" name="propositionId" value={p.id} />
                    <Bouton taille="sm" type="submit">Approuver et publier</Bouton>
                  </form>
                  <form action={refuserPropositionFormulaire}>
                    <input type="hidden" name="propositionId" value={p.id} />
                    <Bouton taille="sm" variante="danger" type="submit">Refuser</Bouton>
                  </form>
                </div>
              )}
            </Carte>
          ))}
          {propositions.length === 0 && <Carte className="p-6 text-encre">Aucune proposition pour l'instant.</Carte>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-h3 font-semibold">Outils</h2>
        <Carte className="mt-4 overflow-x-auto p-2">
          <table className="w-full min-w-160 text-[14px] leading-5">
            <thead className="text-left text-legende text-encre">
              <tr><th className="p-3">Outil</th><th className="p-3">Statut</th><th className="p-3">À la une</th><th className="p-3">Actions</th></tr>
            </thead>
            <tbody>
              {outils.map((o) => (
                <tr key={o.id} className="border-t border-bordure">
                  <td className="p-3"><Link href={`/outil/${o.slug}`} className="font-semibold text-violet hover:underline">{o.nom}</Link></td>
                  <td className="p-3">{o.statut === "PUBLIE" ? "Publié" : o.statut === "ARCHIVE" ? "Archivé" : "Brouillon"}</td>
                  <td className="p-3">{o.misEnAvant ? "Oui" : "Non"}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <form action={basculerPublicationFormulaire}>
                        <input type="hidden" name="outilId" value={o.id} />
                        <Bouton taille="sm" variante="secondaire" type="submit">{o.statut === "PUBLIE" ? "Archiver" : "Publier"}</Bouton>
                      </form>
                      <form action={basculerMiseEnAvantFormulaire}>
                        <input type="hidden" name="outilId" value={o.id} />
                        <Bouton taille="sm" variante="fantome" type="submit">{o.misEnAvant ? "Retirer de la une" : "Mettre en avant"}</Bouton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Carte>
      </section>
    </div>
  );
}