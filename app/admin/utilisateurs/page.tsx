// app/admin/utilisateurs/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Liste des membres : RECHERCHE PAR MOT (filtre intelligent :
// chaque mot doit être présent, partout dans le nom ou l'e-mail — pas
// une succession de mots), filtre par statut, et actions rapides :
// fiche détaillée, impersonation, suspension/bannissement (révocable).
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { EtatVideAdmin } from "@/components/admin/etat-vide-admin";
import { UsersRound } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { basculerRoleFormulaire } from "@/app/actions/admin";
import {
  suspendreMembreFormulaire,
  bannirMembreFormulaire,
  reactiverMembreFormulaire,
  impersonerFormulaire,
} from "@/app/actions/gestion-utilisateurs";
import { formatteDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Utilisateurs — Administration" };
export const dynamic = "force-dynamic";

/** Découpe la requête en mots (filtre intelligent : ET logique). */
function motsDeRecherche(q: string | undefined): string[] {
  return (q ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
}

function BadgeStatut({ statut }: { statut: "ACTIF" | "SUSPENDU" | "BANNI" }) {
  if (statut === "SUSPENDU") {
    return <Badge className="border-red-200 bg-red-50 text-red-700">Suspendu</Badge>;
  }
  if (statut === "BANNI") {
    return <Badge className="border-red-300 bg-red-600 text-white">Banni</Badge>;
  }
  return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Actif</Badge>;
}

export default async function PageUtilisateursAdmin({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string }>;
}) {
  const { q, statut } = await searchParams;
  const mots = motsDeRecherche(q);
  const filtreStatut =
    statut === "ACTIF" || statut === "SUSPENDU" || statut === "BANNI" ? statut : null;

  const utilisateurs = await prisma.user.findMany({
    where: {
      // Filtre intelligent : TOUS les mots doivent correspondre (ET),
      // dans le nom OU l'e-mail (OU) — pas une succession de mots.
      ...(mots.length > 0
        ? {
            AND: mots.map((mot) => ({
              OR: [
                { name: { contains: mot, mode: "insensitive" as const } },
                { email: { contains: mot, mode: "insensitive" as const } },
              ],
            })),
          }
        : {}),
      ...(filtreStatut ? { statut: filtreStatut } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { favorites: true, avis: true, lists: true, votes: true, conversations: true } },
      abonnement: { select: { statut: true, plan: true, expireLe: true } },
    },
  });

  type UtilisateurAvecStatut = (typeof utilisateurs)[number] & {
    statut: "ACTIF" | "SUSPENDU" | "BANNI";
    motifCompte?: string | null;
  };

  const [nbAdmins, nbSuspendus, nbBannis] = [
    utilisateurs.filter((u) => u.role === "ADMIN").length,
    utilisateurs.filter((u) => (u as UtilisateurAvecStatut).statut === "SUSPENDU").length,
    utilisateurs.filter((u) => (u as UtilisateurAvecStatut).statut === "BANNI").length,
  ];

  const maintenant = new Date();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-h3 font-semibold">Utilisateurs ({utilisateurs.length})</h2>
          <p className="mt-1 text-[14px] leading-5 text-encre">
            {nbAdmins} admin{nbAdmins > 1 ? "s" : ""} · {nbSuspendus} suspendu
            {nbSuspendus > 1 ? "s" : ""} · {nbBannis} banni{nbBannis > 1 ? "s" : ""} — fiche,
            impersonation et suspension sur chaque membre.
          </p>
        </div>

        {/* Recherche PAR MOT + filtre statut (formulaire GET natif) */}
        <form className="flex flex-wrap items-center gap-2" action="/admin/utilisateurs">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Rechercher par mot : marie gmail litige…"
            aria-label="Rechercher un membre par mot"
            className="min-h-10 w-64 rounded-champ border border-bordure bg-white px-3 text-[14px] leading-5 text-bleu outline-none focus:border-violet"
          />
          <select
            name="statut"
            defaultValue={filtreStatut ?? ""}
            aria-label="Filtrer par statut"
            className="min-h-10 rounded-champ border border-bordure bg-white px-3 text-[14px] leading-5 text-bleu outline-none focus:border-violet"
          >
            <option value="">Tous les statuts</option>
            <option value="ACTIF">Actifs</option>
            <option value="SUSPENDU">Suspendus</option>
            <option value="BANNI">Bannis</option>
          </select>
          <Bouton taille="sm" variante="secondaire" type="submit">Filtrer</Bouton>
        </form>
      </div>

      <Carte className="mt-6 overflow-x-auto p-2">
        <table className="w-full min-w-200 text-[14px] leading-5">
          <thead className="text-left text-legende text-encre">
            <tr>
              <th className="p-3">Utilisateur</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Rôle</th>
              <th className="p-3">Abonnement</th>
              <th className="p-3">Inscrit le</th>
              <th className="p-3">Activité</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {utilisateurs.map((u) => {
              const membre = u as UtilisateurAvecStatut;
              const premium =
                u.abonnement?.statut === "ACTIF" && u.abonnement.expireLe > maintenant;
              return (
                <tr key={u.id} className="border-t border-bordure align-top">
                  <td className="p-3">
                    <p className="font-semibold text-bleu">{u.name || "Sans nom"}</p>
                    <p className="text-[13px] text-encre">{u.email}</p>
                    {membre.statut !== "ACTIF" && membre.motifCompte && (
                      <p className="mt-1 text-[12px] leading-4 text-red-700">Motif : {membre.motifCompte}</p>
                    )}
                  </td>
                  <td className="p-3">
                    <BadgeStatut statut={membre.statut} />
                  </td>
                  <td className="p-3">
                    {u.role === "ADMIN" ? <Badge variante="source">Admin</Badge> : <Badge>Utilisateur</Badge>}
                  </td>
                  <td className="p-3 text-[13px] text-encre">
                    {premium ? (
                      <Badge variante="nouveau">Premium {u.abonnement?.plan === "ENTREPRISE" ? "Entreprise" : "Pro"}</Badge>
                    ) : (
                      <span>Découverte</span>
                    )}
                  </td>
                  <td className="p-3 text-encre">{formatteDate(u.createdAt)}</td>
                  <td className="p-3 text-[13px] text-encre">
                    {u._count.favorites} fav. · {u._count.avis} avis · {u._count.lists} listes
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-start gap-2">
                      <Bouton taille="sm" variante="secondaire" asChild>
                        <Link href={`/admin/utilisateurs/${u.id}`}>Fiche</Link>
                      </Bouton>

                      {u.role !== "ADMIN" && (
                        <form action={impersonerFormulaire}>
                          <input type="hidden" name="utilisateurId" value={u.id} />
                          <Bouton taille="sm" variante="secondaire" type="submit" title="Voir le site avec les yeux de ce membre">
                            👁 Se connecter en tant que…
                          </Bouton>
                        </form>
                      )}

                      {u.role !== "ADMIN" && membre.statut === "ACTIF" && (
                        <details className="rounded-champ border border-bordure bg-gris/50 px-3 py-2 text-[13px]">
                          <summary className="cursor-pointer select-none font-semibold text-rouge">
                            ⏸ Suspendre / bannir
                          </summary>
                          <div className="mt-2 grid w-64 gap-2">
                            <textarea
                              name="motif"
                              form={`suspension-${u.id}`}
                              placeholder="Motif (litige, abus, remboursement…)"
                              rows={2}
                              className="w-full rounded-champ border border-bordure bg-white px-2 py-1.5 text-[13px] text-bleu outline-none focus:border-violet"
                            />
                            <form id={`suspension-${u.id}`} action={suspendreMembreFormulaire}>
                              <input type="hidden" name="utilisateurId" value={u.id} />
                              <div className="flex items-center gap-2">
                                <select name="duree" className="min-h-9 flex-1 rounded-champ border border-bordure bg-white px-2 text-[13px] text-bleu">
                                  <option value="">Illimitée</option>
                                  <option value="1">24 h</option>
                                  <option value="7">7 jours</option>
                                  <option value="30">30 jours</option>
                                </select>
                                <Bouton taille="sm" variante="danger" type="submit">Suspendre</Bouton>
                              </div>
                            </form>
                            <form action={bannirMembreFormulaire}>
                              <input type="hidden" name="utilisateurId" value={u.id} />
                              <Bouton taille="sm" variante="danger" type="submit" className="w-full">
                                🚫 Bannir définitivement
                              </Bouton>
                            </form>
                          </div>
                        </details>
                      )}

                      {membre.statut !== "ACTIF" && (
                        <form action={reactiverMembreFormulaire}>
                          <input type="hidden" name="utilisateurId" value={u.id} />
                          <Bouton taille="sm" variante="secondaire" type="submit">✅ Réactiver</Bouton>
                        </form>
                      )}

                      {u.role === "ADMIN" ? (
                        <p className="text-[13px] font-semibold text-violet">C&apos;est ton compte 👋</p>
                      ) : (
                        <form action={basculerRoleFormulaire}>
                          <input type="hidden" name="utilisateurId" value={u.id} />
                          <Bouton taille="sm" variante="secondaire" type="submit">Rendre admin</Bouton>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {utilisateurs.length === 0 && (
          <EtatVideAdmin
            icone={UsersRound}
            ton="info"
            titre={mots.length > 0 || filtreStatut ? "Aucun membre ne correspond" : "Aucun utilisateur inscrit"}
            description={
              mots.length > 0 || filtreStatut
                ? "Essaie d'autres mots-clés ou réinitialise le filtre de statut."
                : "Les membres apparaîtront ici dès la première inscription."
            }
          />
        )}
      </Carte>

      <p className="mt-3 text-[13px] leading-5 text-encre">
        💡 La recherche fonctionne <strong>par mot</strong> : « marie gmail » trouve tous les membres
        dont le nom OU l&apos;e-mail contient « marie » ET « gmail », peu importe l&apos;ordre. La
        suspension d&apos;un compte le déconnecte automatiquement (moins d&apos;une minute) et bloque
        les nouvelles connexions ; la réactivation restaure l&apos;accès immédiatement.
      </p>
    </div>
  );
}
