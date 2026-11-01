// app/admin/propositions/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 22 — Propositions d'outils : leur PROPRE page de modération
// (elles quittent le tableau de bord, qui reste épuré).
//   • en attente : approuver (crée l'outil publié) ou refuser ;
//   • historique : 20 dernières propositions traitées avec pastille
//     d'état douce (ambre / menthe / corail, palette TailwindAdmin).
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import { Inbox, History } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { Bouton } from "@/components/ui/bouton";
import { EtatVideAdmin } from "@/components/admin/etat-vide-admin";
import { approuverPropositionFormulaire, refuserPropositionFormulaire } from "@/app/actions/admin";
import { formatteDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Propositions — Administration" };
export const dynamic = "force-dynamic";

const PASTILLE: Record<string, string> = {
  EN_ATTENTE: "bg-adm-alerte-doux text-[#b26f00]",
  APPROUVE: "bg-adm-succes-doux text-[#0b8a78]",
  REFUSE: "bg-adm-erreur-doux text-[#c94f35]",
};
const LIBELLE: Record<string, string> = {
  EN_ATTENTE: "En attente",
  APPROUVE: "Approuvée",
  REFUSE: "Refusée",
};

export default async function PagePropositionsAdmin() {
  const [propositions, nbEnAttente, nbTraitees] = await Promise.all([
    prisma.toolSubmission.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { category: true },
    }),
    prisma.toolSubmission.count({ where: { statut: "EN_ATTENTE" } }),
    prisma.toolSubmission.count({ where: { statut: { not: "EN_ATTENTE" } } }),
  ]);

  const enAttente = propositions.filter((p) => p.statut === "EN_ATTENTE");
  const historique = propositions
    .filter((p) => p.statut !== "EN_ATTENTE")
    .slice(0, 20);

  return (
    <div>
      <div className="animate-apparition-haut flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h3 font-semibold">Propositions d'outils</h1>
          <p className="mt-1 text-[14px] leading-6 text-encre">
            Modère les outils proposés par la communauté : approuver publie la fiche instantanément.
          </p>
        </div>
        {nbEnAttente > 0 && (
          <Badge className="border-transparent bg-adm-alerte-doux text-[#b26f00]">{nbEnAttente} en attente</Badge>
        )}
      </div>

      {/* ── En attente ──────────────────────────────────────────────── */}
      <section className="mt-6 grid gap-3">
        {enAttente.map((p) => (
          <Carte key={p.id} className="animate-apparition-haut p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[17px] leading-6 font-titre font-semibold">{p.nom}</h2>
              {p.category && <Badge variante="source">{p.category.nom}</Badge>}
              <span className="text-[13px] text-encre">proposée le {formatteDate(p.createdAt)}</span>
            </div>
            <p className="mt-2 text-[14px] leading-5 text-encre">{p.description}</p>
            <p className="mt-1 text-[13px] leading-5 text-encre">
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primaire-texte hover:underline">{p.url}</a>
              {p.tarif ? ` · ${p.tarif}` : ""}{p.contact ? ` · ${p.contact}` : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <form action={approuverPropositionFormulaire}>
                <input type="hidden" name="propositionId" value={p.id} />
                <Bouton taille="sm" variante="indigo" type="submit">Approuver et publier</Bouton>
              </form>
              <form action={refuserPropositionFormulaire}>
                <input type="hidden" name="propositionId" value={p.id} />
                <Bouton taille="sm" variante="danger" type="submit">Refuser</Bouton>
              </form>
            </div>
          </Carte>
        ))}
        {enAttente.length === 0 && (
          <Carte className="animate-apparition-haut">
            <EtatVideAdmin
              icone={Inbox}
              ton="succes"
              titre="Aucune proposition en attente"
              description="Tout est traité 🎉 Les nouvelles propositions de la communauté apparaîtront ici."
            />
          </Carte>
        )}
      </section>

      {/* ── Historique ──────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="font-titre text-[17px] leading-6 font-semibold text-adm-sombre">
          Historique <span className="font-normal text-encre">({nbTraitees} traitée{nbTraitees > 1 ? "s" : ""})</span>
        </h2>
        <Carte className="mt-4 overflow-x-auto p-0">
          <table className="w-full min-w-150 text-[14px] leading-5">
            <thead className="text-left text-legende text-encre">
              <tr>
                <th className="px-5 py-3">Outil proposé</th>
                <th className="px-3 py-3">Catégorie</th>
                <th className="px-3 py-3">Statut</th>
                <th className="px-5 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {historique.map((p) => (
                <tr key={p.id} className="border-t border-bordure transition hover:bg-adm-fond/70">
                  <td className="max-w-70 truncate px-5 py-3.5 font-semibold text-adm-sombre">{p.nom}</td>
                  <td className="px-3 py-3.5 text-encre">{p.category?.nom ?? "—"}</td>
                  <td className="px-3 py-3.5">
                    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[12px] leading-4 font-semibold", PASTILLE[p.statut])}>
                      {LIBELLE[p.statut] ?? p.statut}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-encre">{formatteDate(p.createdAt)}</td>
                </tr>
              ))}
              {historique.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-0">
                    <EtatVideAdmin
                      icone={History}
                      ton="info"
                      titre="Aucune proposition traitée pour l'instant"
                      description="Les propositions approuvées ou refusées s'afficheront ici."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Carte>
      </section>
    </div>
  );
}