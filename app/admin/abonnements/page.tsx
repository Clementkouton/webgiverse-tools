// app/admin/abonnements/page.tsx
// Gestion admin des abonnements premium : revenus, abonnés actifs,
// derniers paiements (simulation et Paystack réel confondus).

import type { Metadata } from "next";
import { Crown, ReceiptText, TrendingUp, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { PLANS, formatePrix } from "@/lib/plans";

export const metadata: Metadata = { title: "Abonnements — Administration" };
export const dynamic = "force-dynamic";

const formatteurDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              titre: "Revenus totaux",
              valeur: formatePrix(revenusTotal._sum.montant ?? 0),
              icone: TrendingUp,
            },
            {
              titre: "Revenus ce mois",
              valeur: formatePrix(revenusMois._sum.montant ?? 0),
              icone: ReceiptText,
            },
            {
              titre: "Abonnés actifs",
              valeur: String(nbActifs),
              icone: Users,
            },
            {
              titre: "Abonnements enregistrés",
              valeur: String(abonnements.length),
              icone: Crown,
            },
          ].map((stat) => (
            <Carte key={stat.titre} className="flex items-center gap-4 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-champ bg-violet/10 text-violet">
                <stat.icone className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block text-[13px] leading-4 font-medium text-encre">{stat.titre}</span>
                <span className="block font-titre text-[20px] leading-7 font-bold">{stat.valeur}</span>
              </span>
            </Carte>
          ))}
        </div>

        {/* Abonnés actifs */}
        <section className="mt-10">
          <h2 className="text-h3 font-semibold">Abonnés premium actifs ({abonnementsActifs.length})</h2>
          {abonnementsActifs.length === 0 ? (
            <Carte className="mt-4 p-6 text-[14px] leading-5 text-encre">
              Aucun abonné actif pour l&apos;instant. Les paiements de test effectués en mode
              simulation apparaîtront ici.
            </Carte>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-carte border border-bordure bg-white shadow-carte">
              <table className="w-full min-w-[640px] text-left text-[14px]">
                <thead className="bg-gris text-[12px] leading-4 uppercase text-encre">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Utilisateur</th>
                    <th className="px-4 py-3 font-semibold">Plan</th>
                    <th className="px-4 py-3 font-semibold">Expire le</th>
                    <th className="px-4 py-3 font-semibold">Renouvellement</th>
                  </tr>
                </thead>
                <tbody>
                  {abonnementsActifs.map((abonnement) => (
                    <tr key={abonnement.id} className="border-t border-bordure">
                      <td className="px-4 py-3">
                        <span className="block font-semibold text-bleu">
                          {abonnement.utilisateur.name ?? "Sans nom"}
                        </span>
                        <span className="block text-[12px] leading-4 text-encre">
                          {abonnement.utilisateur.email}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-bleu">
                        {PLANS[abonnement.plan as "PRO" | "ENTREPRISE"]?.nom ?? abonnement.plan}
                      </td>
                      <td className="px-4 py-3 text-bleu">{formatteurDate.format(abonnement.expireLe)}</td>
                      <td className="px-4 py-3">
                        {abonnement.annuleLe ? (
                          <Badge variante="defaut">Arrêté</Badge>
                        ) : (
                          <Badge variante="gratuit">Actif</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Derniers paiements */}
        <section className="mt-10">
          <h2 className="text-h3 font-semibold">Derniers paiements ({paiements.length})</h2>
          <div className="mt-4 overflow-x-auto rounded-carte border border-bordure bg-white shadow-carte">
            <table className="w-full min-w-[720px] text-left text-[14px]">
              <thead className="bg-gris text-[12px] leading-4 uppercase text-encre">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Utilisateur</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Montant</th>
                  <th className="px-4 py-3 font-semibold">Canal</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {paiements.map((paiement) => (
                  <tr key={paiement.id} className="border-t border-bordure">
                    <td className="px-4 py-3 text-bleu">{formatteurDate.format(paiement.creeLe)}</td>
                    <td className="px-4 py-3">
                      <span className="block font-semibold text-bleu">
                        {paiement.utilisateur.name ?? "Sans nom"}
                      </span>
                      <span className="block text-[12px] leading-4 text-encre">
                        {paiement.utilisateur.email}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-bleu">
                      {PLANS[paiement.plan as "PRO" | "ENTREPRISE"]?.nom ?? paiement.plan}
                    </td>
                    <td className="px-4 py-3 font-semibold text-bleu">{formatePrix(paiement.montant)}</td>
                    <td className="px-4 py-3 text-encre">
                        {paiement.simulation ? "Simulation" : paiement.canal ?? "Moneroo"}
                    </td>
                    <td className="px-4 py-3">
                      {paiement.statut === "PAYE" ? (
                        <Badge variante="gratuit">Payé</Badge>
                      ) : paiement.statut === "ECHOUE" ? (
                        <Badge variante="magenta">Échoué</Badge>
                      ) : (
                        <Badge variante="defaut">En attente</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  } catch {
    return (
      <Carte className="p-6">
        <h2 className="text-h3 font-semibold">Schéma pas encore installé</h2>
        <p className="mt-2 text-[14px] leading-5 text-encre">
          Les tables Abonnement/Paiement sont introuvables. Ajoute le bloc Prisma fourni dans
          <code className="mx-1 rounded bg-gris px-1.5 py-0.5 text-[13px]">prisma/schema.prisma</code>
          puis lance <code className="rounded bg-gris px-1.5 py-0.5 text-[13px]">npx prisma db push</code>{" "}
          (serveur arrêté), et reviens sur cette page.
        </p>
      </Carte>
    );
  }
}