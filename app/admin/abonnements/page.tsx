// app/admin/abonnements/page.tsx
// Gestion admin des abonnements premium : revenus, abonnés actifs,
// derniers paiements (simulation et Moneroo réel confondus).
// Lot 22 — style « TailwindAdmin » : tuiles d'icônes sur pastilles
// pastel (indigo / info / menthe / ambre, comme les cartes stats de
// l'accueil), tableaux sur cartes blanches arrondies et statuts en
// pastilles douces (menthe / corail / ambre).

import type { Metadata } from "next";
import { Crown, ReceiptText, TrendingUp, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { PLANS, formatePrix } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Abonnements — Administration" };
export const dynamic = "force-dynamic";

const formatteurDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Pastille d'état douce — mêmes teintes que la page Propositions. */
const PASTILLE: Record<string, string> = {
  actif: "bg-adm-succes-doux text-[#0b8a78]",
  attente: "bg-adm-alerte-doux text-[#b26f00]",
  echoue: "bg-adm-erreur-doux text-[#c94f35]",
  neutre: "bg-gris text-encre",
};

function Pastille({ ton, children }: { ton: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex rounded-[7px] -skew-x-[18deg] not-italic px-2.5 py-0.5 text-[12px] leading-4 font-semibold", PASTILLE[ton])}>
      {children}
    </span>
  );
}

/** Tuile statistique — même gabarit que CarteStatAdmin (sans lien). */
const TUILES: Record<string, string> = {
  primaire: "bg-primaire/10 text-primaire-texte",
  info: "bg-adm-info-doux text-[#2b6be0]",
  succes: "bg-adm-succes-doux text-[#0f9b85]",
  alerte: "bg-adm-alerte-doux text-[#b26f00]",
};

export default async function PageAdminAbonnements() {
  // Garde douce : si le schéma n'a pas encore été poussé, la page reste consultable.
  try {
    const [abonnements, paiements, revenusTotal, revenusMois, nbActifs] = await Promise.all([
      prisma.abonnement.findMany({
        include: { utilisateur: { select: { name: true, email: true } } },
        orderBy: { majLe: "desc" },
        take: 50,
      }),
      prisma.paiement.findMany({
        include: { utilisateur: { select: { name: true, email: true } } },
        orderBy: { creeLe: "desc" },
        take: 20,
      }),
      prisma.paiement.aggregate({ where: { statut: "PAYE" }, _sum: { montant: true } }),
      prisma.paiement.aggregate({
        where: {
          statut: "PAYE",
          creeLe: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
        _sum: { montant: true },
      }),
      prisma.abonnement.count({ where: { statut: "ACTIF", expireLe: { gt: new Date() } } }),
    ]);

    const maintenant = new Date();
    const abonnementsActifs = abonnements.filter(
      (a) => a.statut === "ACTIF" && a.expireLe > maintenant,
    );

    return (
      <div>
        {/* Statistiques */}
        <div className="animate-apparition-haut grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              titre: "Revenus totaux",
              valeur: formatePrix(revenusTotal._sum.montant ?? 0),
              icone: TrendingUp,
              ton: "primaire",
            },
            {
              titre: "Revenus ce mois",
              valeur: formatePrix(revenusMois._sum.montant ?? 0),
              icone: ReceiptText,
              ton: "info",
            },
            {
              titre: "Abonnés actifs",
              valeur: String(nbActifs),
              icone: Users,
              ton: "succes",
            },
            {
              titre: "Abonnements enregistrés",
              valeur: String(abonnements.length),
              icone: Crown,
              ton: "alerte",
            },
          ].map((stat) => (
            <Carte key={stat.titre} className="flex items-center gap-4 p-5">
              <span
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-xl",
                  TUILES[stat.ton],
                )}
              >
                <stat.icone className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-titre text-[24px] leading-8 font-bold text-adm-sombre">{stat.valeur}</span>
                <span className="block truncate text-[13px] leading-4 font-semibold text-adm-gris">{stat.titre}</span>
              </span>
            </Carte>
          ))}
        </div>

        {/* Abonnés actifs */}
        <section className="animate-apparition-haut mt-10">
          <h2 className="font-titre text-[17px] leading-6 font-semibold text-adm-sombre">
            Abonnés premium actifs{" "}
            <span className="font-normal text-encre">({abonnementsActifs.length})</span>
          </h2>
          {abonnementsActifs.length === 0 ? (
            <Carte className="mt-4 p-6 text-[14px] leading-5 text-encre">
              Aucun abonné actif pour l&apos;instant. Les paiements de test effectués en mode
              simulation apparaîtront ici.
            </Carte>
          ) : (
            <Carte className="mt-4 overflow-x-auto p-0">
              <table className="w-full min-w-150 text-left text-[14px] leading-5">
                <thead className="text-left text-legende text-encre">
                  <tr>
                    <th className="px-5 py-3">Utilisateur</th>
                    <th className="px-3 py-3">Plan</th>
                    <th className="px-3 py-3">Expire le</th>
                    <th className="px-5 py-3 text-right">Renouvellement</th>
                  </tr>
                </thead>
                <tbody>
                  {abonnementsActifs.map((abonnement) => (
                    <tr key={abonnement.id} className="border-t border-bordure transition hover:bg-adm-fond/70">
                      <td className="px-5 py-3.5">
                        <span className="block font-semibold text-adm-sombre">
                          {abonnement.utilisateur.name ?? "Sans nom"}
                        </span>
                        <span className="block text-[12px] leading-4 text-encre">
                          {abonnement.utilisateur.email}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-encre">
                        {PLANS[abonnement.plan as "PRO" | "ENTREPRISE"]?.nom ?? abonnement.plan}
                      </td>
                      <td className="px-3 py-3.5 text-encre">{formatteurDate.format(abonnement.expireLe)}</td>
                      <td className="px-5 py-3.5 text-right">
                        {abonnement.annuleLe ? (
                          <Pastille ton="neutre">Arrêté</Pastille>
                        ) : (
                          <Pastille ton="actif">Actif</Pastille>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Carte>
          )}
        </section>

        {/* Derniers paiements */}
        <section className="animate-apparition-haut mt-10">
          <h2 className="font-titre text-[17px] leading-6 font-semibold text-adm-sombre">
            Derniers paiements <span className="font-normal text-encre">({paiements.length})</span>
          </h2>
          <Carte className="mt-4 overflow-x-auto p-0">
            <table className="w-full min-w-150 text-left text-[14px] leading-5">
              <thead className="text-left text-legende text-encre">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-3 py-3">Utilisateur</th>
                  <th className="px-3 py-3">Plan</th>
                  <th className="px-3 py-3">Montant</th>
                  <th className="px-3 py-3">Canal</th>
                  <th className="px-5 py-3 text-right">Statut</th>
                </tr>
              </thead>
              <tbody>
                {paiements.map((paiement) => (
                  <tr key={paiement.id} className="border-t border-bordure transition hover:bg-adm-fond/70">
                    <td className="px-5 py-3.5 text-encre">{formatteurDate.format(paiement.creeLe)}</td>
                    <td className="px-3 py-3.5">
                      <span className="block font-semibold text-adm-sombre">
                        {paiement.utilisateur.name ?? "Sans nom"}
                      </span>
                      <span className="block text-[12px] leading-4 text-encre">
                        {paiement.utilisateur.email}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-encre">
                      {PLANS[paiement.plan as "PRO" | "ENTREPRISE"]?.nom ?? paiement.plan}
                    </td>
                    <td className="px-3 py-3.5 font-semibold text-adm-sombre">{formatePrix(paiement.montant)}</td>
                    <td className="px-3 py-3.5 text-encre">
                      {paiement.simulation ? "Simulation" : paiement.canal ?? "Moneroo"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {paiement.statut === "PAYE" ? (
                        <Pastille ton="actif">Payé</Pastille>
                      ) : paiement.statut === "ECHOUE" ? (
                        <Pastille ton="echoue">Échoué</Pastille>
                      ) : (
                        <Pastille ton="attente">En attente</Pastille>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Carte>
        </section>
      </div>
    );
  } catch {
    return (
      <Carte className="animate-apparition-haut p-6">
        <h2 className="text-h3 font-semibold">Schéma pas encore installé</h2>
        <p className="mt-2 text-[14px] leading-5 text-encre">
          Les tables Abonnement/Paiement sont introuvables. Ajoute le bloc Prisma fourni dans
          <code className="mx-1 rounded bg-adm-fond px-1.5 py-0.5 text-[13px]">prisma/schema.prisma</code>
          puis lance <code className="rounded bg-adm-fond px-1.5 py-0.5 text-[13px]">npx prisma db push</code>{" "}
          (serveur arrêté), et reviens sur cette page.
        </p>
      </Carte>
    );
  }
}