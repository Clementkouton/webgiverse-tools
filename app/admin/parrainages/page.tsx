// app/admin/parrainages/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Gestion des parrainages (admin) : statistiques, CLASSEMENT
// des meilleurs parrains, liste des parrainages, et RELANCES par
// e-mail des membres qui n'ont pas encore de filleul Premium
// (individuelle ou de masse).
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { Bouton } from "@/components/ui/bouton";
import {
  relancerMembreFormulaire,
  relancerTousFormulaire,
} from "@/app/actions/parrainages";
import { formatteDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Parrainages — Administration" };
export const dynamic = "force-dynamic";

export default async function PageParrainagesAdmin() {
  const [parrainages, classementBrut, eligibles] = await Promise.all([
    prisma.parrainage.findMany({
      include: {
        parrain: { select: { id: true, name: true, email: true } },
        filleul: { select: { id: true, name: true, email: true } },
      },
      orderBy: { creeLe: "desc" },
      take: 100,
    }),
    prisma.parrainage.groupBy({
      by: ["parrainId"],
      _count: { parrainId: true },
      _sum: { joursOfferts: true },
    }),
    prisma.user.findMany({
      where: {
        role: "USER",
        statut: "ACTIF",
        filleulsParraines: { none: { statut: "RECOMPENSE" } },
      },
      select: { id: true, name: true, email: true, createdAt: true, relanceParrainageLe: true },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
  ]);

  // Classement : les parrains triés par nombre de filleuls.
  const utilisateurs = await prisma.user.findMany({
    where: { id: { in: classementBrut.map((c) => c.parrainId) } },
    select: { id: true, name: true, email: true },
  });
  const nomParId = new Map(utilisateurs.map((u) => [u.id, u]));
  const classement = classementBrut
    .map((c) => ({
      parrain: nomParId.get(c.parrainId),
      filleuls: c._count.parrainId,
      jours: c._sum.joursOfferts ?? 0,
      recompenses: parrainages.filter(
        (p) => p.parrainId === c.parrainId && p.statut === "RECOMPENSE"
      ).length,
    }))
    .sort((a, b) => b.filleuls - a.filleuls || b.recompenses - a.recompenses)
    .slice(0, 20);

  const stats = {
    total: parrainages.length,
    recompenses: parrainages.filter((p) => p.statut === "RECOMPENSE").length,
    joursOfferts: parrainages
      .filter((p) => p.statut === "RECOMPENSE")
      .reduce((somme, p) => somme + p.joursOfferts, 0),
  };

  // Éligibles à une relance : inscrits depuis plus de 3 jours, jamais
  // récompensés, jamais relancés en premier.
  const ilYa3Jours = new Date(Date.now() - 3 * 86_400_000);
  const aRelancer = eligibles
    .filter((u) => u.createdAt < ilYa3Jours)
    .sort(
      (a, b) =>
        Number(Boolean(a.relanceParrainageLe)) - Number(Boolean(b.relanceParrainageLe))
    );

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-h3 font-semibold">Parrainages</h2>
        <p className="mt-1 text-[14px] leading-5 text-encre">
          Chaque membre a un code personnel. Un filleul qui passe Premium offre
          automatiquement 14 jours Premium à son parrain — récompense créditée sans
          intervention.
        </p>
      </div>

      {/* ── Statistiques ──────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Carte className="p-5 text-center">
          <p className="font-titre text-h2 font-bold text-violet">{stats.total}</p>
          <p className="text-[13px] text-encre">filleuls inscrits (100 derniers)</p>
        </Carte>
        <Carte className="p-5 text-center">
          <p className="font-titre text-h2 font-bold text-violet">{stats.recompenses}</p>
          <p className="text-[13px] text-encre">filleuls Premium (récompensés)</p>
        </Carte>
        <Carte className="p-5 text-center">
          <p className="font-titre text-h2 font-bold text-violet">{stats.joursOfferts}</p>
          <p className="text-[13px] text-encre">jours Premium offerts au total</p>
        </Carte>
      </div>

      {/* ── Classement des meilleurs parrains ─────────────────────── */}
      <Carte className="overflow-x-auto p-2">
        <h3 className="p-3 font-titre text-[16px] font-semibold">🏆 Meilleurs parrains</h3>
        <table className="w-full min-w-140 text-[14px] leading-5">
          <thead className="text-left text-legende text-encre">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Parrain</th>
              <th className="px-3 py-2">Filleuls</th>
              <th className="px-3 py-2">Premium (récompensés)</th>
              <th className="px-3 py-2">Jours gagnés</th>
            </tr>
          </thead>
          <tbody>
            {classement.map((ligne, index) => (
              <tr key={ligne.parrain?.id ?? index} className="border-t border-bordure">
                <td className="px-3 py-2 font-titre font-bold text-violet">
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                </td>
                <td className="px-3 py-2">
                  {ligne.parrain ? (
                    <Link href={`/admin/utilisateurs/${ligne.parrain.id}`} className="font-semibold text-bleu hover:text-violet">
                      {ligne.parrain.name || ligne.parrain.email}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 font-semibold">{ligne.filleuls}</td>
                <td className="px-3 py-2">{ligne.recompenses}</td>
                <td className="px-3 py-2">{ligne.jours}</td>
              </tr>
            ))}
            {classement.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-encre">
                  Aucun parrainage pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Carte>

      {/* ── Relances ──────────────────────────────────────────────── */}
      <Carte className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-titre text-[16px] font-semibold">
              Relances par e-mail ({aRelancer.length} éligible{aRelancer.length > 1 ? "s" : ""})
            </h3>
            <p className="text-[13px] text-encre">
              Membres actifs inscrits depuis 3 jours minimum, sans filleul Premium. L&apos;e-mail
              rappelle leur lien d&apos;invitation et la récompense de 14 jours.
            </p>
          </div>
          {aRelancer.length > 0 && (
            <form action={relancerTousFormulaire}>
              <Bouton taille="sm" type="submit">
                ✉️ Relancer tous (max 100, jamais relancés d&apos;abord)
              </Bouton>
            </form>
          )}
        </div>
        <ul className="mt-4 grid gap-2">
          {aRelancer.slice(0, 30).map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-champ bg-gris px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-semibold text-bleu">{u.name || "Sans nom"}</p>
                <p className="truncate text-[13px] text-encre">
                  {u.email} · inscrit le {formatteDate(u.createdAt)}
                  {u.relanceParrainageLe && ` · relancé le ${formatteDate(u.relanceParrainageLe)}`}
                </p>
              </div>
              <form action={relancerMembreFormulaire}>
                <input type="hidden" name="utilisateurId" value={u.id} />
                <Bouton taille="sm" variante="secondaire" type="submit">
                  {u.relanceParrainageLe ? "Relancer à nouveau" : "Relancer"}
                </Bouton>
              </form>
            </li>
          ))}
          {aRelancer.length === 0 && (
            <li className="text-[13px] text-encre">
              Aucun membre à relancer : tout le monde a déjà parrainé ou est trop récent.
            </li>
          )}
        </ul>
      </Carte>

      {/* ── Derniers parrainages ──────────────────────────────────── */}
      <Carte className="overflow-x-auto p-2">
        <h3 className="p-3 font-titre text-[16px] font-semibold">Derniers parrainages</h3>
        <table className="w-full min-w-160 text-[14px] leading-5">
          <thead className="text-left text-legende text-encre">
            <tr>
              <th className="px-3 py-2">Parrain</th>
              <th className="px-3 py-2">Filleul</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Inscrit le</th>
              <th className="px-3 py-2">Récompense</th>
            </tr>
          </thead>
          <tbody>
            {parrainages.map((p) => (
              <tr key={p.id} className="border-t border-bordure">
                <td className="px-3 py-2">
                  <Link href={`/admin/utilisateurs/${p.parrainId}`} className="font-semibold text-bleu hover:text-violet">
                    {p.parrain.name || p.parrain.email}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/admin/utilisateurs/${p.filleulId}`} className="text-bleu hover:text-violet">
                    {p.filleul.name || p.filleul.email}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {p.statut === "RECOMPENSE" ? (
                    <Badge variante="nouveau">Récompensé (+{p.joursOfferts} j)</Badge>
                  ) : (
                    <Badge>En attente</Badge>
                  )}
                </td>
                <td className="px-3 py-2 text-encre">{formatteDate(p.creeLe)}</td>
                <td className="px-3 py-2 text-encre">{formatteDate(p.recompenseLe)}</td>
              </tr>
            ))}
            {parrainages.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-encre">Aucun parrainage enregistré.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Carte>
    </div>
  );
}
