// app/admin/avis/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 22 — Modération des avis, style « TailwindAdmin » : cartes
// blanches arrondies, lien outil en indigo, étoiles ambre du
// template, pastille « utile » menthe douce et suppression en
// bouton corail (le rouge reste réservé aux actions destructrices).
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareOff } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { EtatVideAdmin } from "@/components/admin/etat-vide-admin";
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

  // Lot 20 — votes « Utile » reçus par avis (lecture défensive : la
  // table existe depuis le Lot 20a, on n'affiche rien si absente).
  const delegueVotesAvis = (prisma as any).voteAvis;
  const votesParAvis: Record<string, number> = delegueVotesAvis?.groupBy
    ? await delegueVotesAvis
        .groupBy({ by: ["avisId"], _count: { avisId: true } })
        .then(
          (lignes: { avisId: string; _count: { avisId: number } }[]) =>
            Object.fromEntries(lignes.map((l) => [l.avisId, l._count.avisId])),
        )
        .catch(() => ({}))
    : {};

  return (
    <div>
      <div className="animate-apparition-haut">
        <h1 className="text-h3 font-semibold">Modérer les avis ({nbTotal})</h1>
        <p className="mt-1 text-[14px] leading-6 text-encre">
          Supprime uniquement les avis inappropriés ou hors-sujet — les avis négatifs honnêtes sont légitimes.
        </p>
      </div>

      <div className="mt-6 grid gap-3">
        {avis.map((a) => {
          const utiles = votesParAvis[a.id] ?? 0;
          return (
          <Carte key={a.id} className="animate-apparition-haut p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link href={`/outil/${a.outil.slug}`} className="text-[15px] font-semibold text-primaire-texte hover:underline">
                    {a.outil.nom}
                  </Link>
                  <span className="text-[14px] font-semibold text-adm-alerte" aria-label={`Note ${a.note} sur 5`}>
                    {"★".repeat(a.note)}{"☆".repeat(5 - a.note)}
                  </span>
                  {utiles > 0 && (
                      <span className="inline-flex items-center rounded-[7px] -skew-x-[18deg] bg-adm-succes-doux px-2.5 py-0.5 text-[12px] leading-4 font-semibold text-[#0f9b85]">
                      👍 {utiles} utile{utiles > 1 ? "s" : ""}
                    </span>
                  )}
                  <span className="text-[13px] text-adm-gris">{formatteDate(a.majLe)}</span>
                </div>
                <p className="mt-2 text-[14px] leading-6 whitespace-pre-line text-encre">{a.contenu}</p>
                <p className="mt-2 text-[13px] text-encre">
                  Par <span className="font-semibold text-adm-sombre">{a.utilisateur.name || "Sans nom"}</span> ({a.utilisateur.email})
                </p>
              </div>
              <form action={supprimerAvisAdminFormulaire} className="shrink-0">
                <input type="hidden" name="avisId" value={a.id} />
                <BoutonConfirmer
                  message={`Supprimer cet avis sur « ${a.outil.nom} » ? Action définitive.`}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[7px] -skew-x-[18deg] border border-red-300 bg-white px-4 text-[14px] leading-5 font-semibold text-red-700 transition hover:bg-red-50"
                  type="submit"
                >
                  Supprimer
                </BoutonConfirmer>
              </form>
            </div>
          </Carte>
          );
        })}
        {avis.length === 0 && (
          <Carte className="animate-apparition-haut">
            <EtatVideAdmin
              icone={MessageSquareOff}
              ton="info"
              titre="Aucun avis publié pour l'instant"
              description="Les avis des membres apparaîtront ici dès le premier retour publié."
            />
          </Carte>
        )}
      </div>
    </div>
  );
}
