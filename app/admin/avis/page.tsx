// app/admin/avis/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { supprimerAvisAdminFormulaire } from "@/app/actions/admin";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import { formatteDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Modérer les avis — Administration" };
export const dynamic = "force-dynamic";

export default async function PageAvisAdmin() {
  const [avis, nbTotal] = await Promise.all([
    prisma.avis.findMany({
      orderBy: { majLe: "desc" },
      take: 200,
      include: {
        outil: { select: { nom: true, slug: true, logo: true } },
        utilisateur: { select: { name: true, email: true } },
      },
    }),
    prisma.avis.count(),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-h3 font-semibold">Modérer les avis ({nbTotal})</h2>
          <p className="mt-1 text-[14px] text-encre">Supprime uniquement les avis inappropriés ou hors-sujet — les avis négatifs honnêtes sont légitimes.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {avis.map((a) => (
          <Carte key={a.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/outil/${a.outil.slug}`} className="text-[15px] font-semibold text-violet hover:underline">
                    {a.outil.nom}
                  </Link>
                  <span className="text-[14px] font-semibold text-amber-500" aria-label={`Note ${a.note} sur 5`}>
                    {"★".repeat(a.note)}{"☆".repeat(5 - a.note)}
                  </span>
                  <Badge>{formatteDate(a.majLe)}</Badge>
                </div>
                <p className="mt-2 text-[14px] leading-6 whitespace-pre-line text-encre">{a.contenu}</p>
                <p className="mt-2 text-[13px] text-encre">
                  Par <span className="font-semibold text-bleu">{a.utilisateur.name || "Sans nom"}</span> ({a.utilisateur.email})
                </p>
              </div>
              <form action={supprimerAvisAdminFormulaire} className="shrink-0">
                <input type="hidden" name="avisId" value={a.id} />
                <BoutonConfirmer
                  message={`Supprimer cet avis sur « ${a.outil.nom} » ? Action définitive.`}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-red-300 bg-white px-4 text-[14px] leading-5 font-semibold text-red-700 transition hover:bg-red-50"
                  type="submit"
                >
                  Supprimer
                </BoutonConfirmer>
              </form>
            </div>
          </Carte>
        ))}
        {avis.length === 0 && (
          <Carte className="p-6 text-[14px] text-encre">Aucun avis publié pour l'instant.</Carte>
        )}
      </div>
    </div>
  );
}