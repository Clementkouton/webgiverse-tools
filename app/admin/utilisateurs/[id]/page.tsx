// app/admin/utilisateurs/[id]/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Fiche membre : identité, diagnostic d'inscription,
// abonnement, parrainage, paiements, ACTIVITÉ, et l'outillage admin :
//   • notes internes privées (historique : litige, Premium offert…) ;
//   • impersonation « Se connecter en tant que… » ;
//   • suspension / bannissement avec motif (révocable).
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { Bouton } from "@/components/ui/bouton";
import { basculerRoleFormulaire } from "@/app/actions/admin";
import {
  impersonerFormulaire,
  ajouterNoteFormulaire,
  supprimerNoteFormulaire,
} from "@/app/actions/gestion-utilisateurs";
import { formatteDate } from "@/lib/dates";
import { formatePrix } from "@/lib/plans";

export const metadata: Metadata = { title: "Fiche membre — Administration" };
export const dynamic = "force-dynamic";

export default async function PageFicheMembre({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membre = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: { select: { favorites: true, avis: true, lists: true, votes: true, conversations: true, activites: true } },
      abonnement: true,
      paiements: { orderBy: { creeLe: "desc" }, take: 8 },
      filleulDe: { include: { parrain: { select: { id: true, name: true, email: true } } } },
      filleulsParraines: {
        include: { filleul: { select: { id: true, name: true, email: true } } },
        orderBy: { creeLe: "desc" },
      },
      notesRecues: {
        include: { auteur: { select: { name: true, email: true } } },
        orderBy: { creeLe: "desc" },
      },
    },
  });
  if (!membre) notFound();

  const maintenant = new Date();
  const premium =
    membre.abonnement?.statut === "ACTIF" && membre.abonnement.expireLe > maintenant;

  const stats = [
    { libelle: "Favoris", valeur: membre._count.favorites },
    { libelle: "Avis", valeur: membre._count.avis },
    { libelle: "Listes", valeur: membre._count.lists },
    { libelle: "Votes", valeur: membre._count.votes },
    { libelle: "Conversations", valeur: membre._count.conversations },
    { libelle: "Activités", valeur: membre._count.activites },
  ];

  return (
    <div className="grid gap-6">
      {/* ── En-tête : identité + statut ──────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/utilisateurs" className="text-[13px] font-semibold text-violet hover:underline">
            ← Toutes les fiches
          </Link>
          <h2 className="mt-2 text-h3 font-semibold">{membre.name || "Sans nom"}</h2>
          <p className="text-[14px] text-encre">{membre.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {membre.role === "ADMIN" ? <Badge variante="source">Admin</Badge> : <Badge>Utilisateur</Badge>}
            {premium ? (
              <Badge variante="nouveau">
                Premium {membre.abonnement?.plan === "ENTREPRISE" ? "Entreprise" : "Pro"} — jusqu&apos;au{" "}
                {formatteDate(membre.abonnement?.expireLe)}
              </Badge>
            ) : (
              <Badge>Découverte</Badge>
            )}
          </div>
        </div>

        {/* Actions principales */}
        <div className="flex flex-wrap items-start gap-2">
          {membre.role !== "ADMIN" && (
            <form action={impersonerFormulaire}>
              <input type="hidden" name="utilisateurId" value={membre.id} />
              <Bouton taille="sm" variante="secondaire" type="submit">
                👁 Se connecter en tant que…
              </Bouton>
            </form>
          )}
          {membre.role === "ADMIN" ? (
            <p className="text-[13px] font-semibold text-violet">C&apos;est ton compte 👋</p>
          ) : (
            <form action={basculerRoleFormulaire}>
              <input type="hidden" name="utilisateurId" value={membre.id} />
              <Bouton taille="sm" variante="secondaire" type="submit">Rendre admin</Bouton>
            </form>
          )}
        </div>
      </div>

      {/* ── Diagnostic d'inscription + statistiques ───────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Carte className="p-5">
          <h3 className="font-titre text-[16px] font-semibold">Diagnostic d&apos;inscription</h3>
          <dl className="mt-3 grid gap-1.5 text-[13px] leading-5">
            <div className="flex justify-between gap-3">
              <dt className="text-encre">Objectif</dt>
              <dd className="text-right font-semibold">{membre.objectif || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-encre">Niveau</dt>
              <dd className="text-right font-semibold">{membre.niveau || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-encre">Budget</dt>
              <dd className="text-right font-semibold">{membre.budget || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-encre">Inscrit le</dt>
              <dd className="text-right font-semibold">{formatteDate(membre.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-encre">Code parrain</dt>
              <dd className="text-right font-mono text-[12px] font-semibold">{membre.codeParrain ?? "—"}</dd>
            </div>
          </dl>
        </Carte>

        <Carte className="p-5">
          <h3 className="font-titre text-[16px] font-semibold">Activité</h3>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
            {stats.map((s) => (
              <li key={s.libelle} className="rounded-champ bg-gris px-3 py-2">
                <span className="font-titre text-[18px] font-bold text-violet">{s.valeur}</span>
                <br />
                <span className="text-encre">{s.libelle}</span>
              </li>
            ))}
          </ul>
        </Carte>

        <Carte className="p-5">
          <h3 className="font-titre text-[16px] font-semibold">Parrainage</h3>
          <div className="mt-3 grid gap-2 text-[13px] leading-5">
            <p>
              <span className="text-encre">Parrain : </span>
              {membre.filleulDe ? (
                <Link href={`/admin/utilisateurs/${membre.filleulDe.parrain.id}`} className="font-semibold text-violet hover:underline">
                  {membre.filleulDe.parrain.name || membre.filleulDe.parrain.email}
                </Link>
              ) : (
                <span className="font-semibold">—</span>
              )}
            </p>
            <p>
              <span className="text-encre">Filleuls : </span>
              <strong>{membre.filleulsParraines.length}</strong>
              {" "}
              ({membre.filleulsParraines.filter((p) => p.statut === "RECOMPENSE").length} récompensé(s))
            </p>
            {membre.filleulsParraines.slice(0, 5).map((p) => (
              <p key={p.id} className="rounded-champ bg-gris px-3 py-1.5">
                {p.filleul.name || p.filleul.email} —{" "}
                {p.statut === "RECOMPENSE" ? "Premium (récompense envoyée)" : "en attente"}
              </p>
            ))}
          </div>
        </Carte>
      </div>

      {/* ── Paiements ─────────────────────────────────────────────── */}
      <Carte className="overflow-x-auto p-2">
        <h3 className="p-3 font-titre text-[16px] font-semibold">Paiements récents</h3>
        <table className="w-full min-w-120 text-[14px] leading-5">
          <thead className="text-left text-legende text-encre">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Montant</th>
              <th className="px-3 py-2">Canal</th>
              <th className="px-3 py-2">Code promo</th>
              <th className="px-3 py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {membre.paiements.map((p) => (
              <tr key={p.id} className="border-t border-bordure">
                <td className="px-3 py-2 text-encre">{formatteDate(p.creeLe)}</td>
                <td className="px-3 py-2 font-semibold">{p.plan}</td>
                <td className="px-3 py-2">{formatePrix(p.montant)}</td>
                <td className="px-3 py-2 text-encre">{p.simulation ? "Test" : p.canal ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-[13px]">{p.codePromo ?? "—"}</td>
                <td className="px-3 py-2">{p.statut}</td>
              </tr>
            ))}
            {membre.paiements.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-encre">Aucun paiement enregistré.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Carte>

      {/* ── Notes internes (historique privé) ─────────────────────── */}
      <Carte className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-titre text-[16px] font-semibold">Notes internes ({membre.notesRecues.length})</h3>
            <p className="text-[13px] text-encre">
              Historique privé de l&apos;équipe — litige, Premium offert, abus… Jamais visible par le membre.
            </p>
          </div>
        </div>

        <form action={ajouterNoteFormulaire} className="mt-4 grid gap-2">
          <input type="hidden" name="utilisateurId" value={membre.id} />
          <textarea
            name="contenu"
            required
            minLength={3}
            maxLength={2000}
            rows={3}
            placeholder="Ex. : remboursement accordé le 12/03, Premium offert 1 mois suite au litige #4482…"
            className="w-full rounded-champ border border-bordure bg-white px-3 py-2 text-[14px] leading-5 text-bleu outline-none focus:border-violet"
          />
          <div>
            <Bouton taille="sm" type="submit">Ajouter la note</Bouton>
          </div>
        </form>

        <ul className="mt-4 grid gap-2">
          {membre.notesRecues.map((note) => (
            <li key={note.id} className="flex items-start justify-between gap-3 rounded-champ bg-gris px-4 py-3">
              <div className="min-w-0">
                <p className="whitespace-pre-wrap text-[14px] leading-5">{note.contenu}</p>
                <p className="mt-1 text-[12px] leading-4 text-encre">
                  {note.auteur.name || note.auteur.email} — {formatteDate(note.creeLe)}
                </p>
              </div>
              <form action={supprimerNoteFormulaire}>
                <input type="hidden" name="noteId" value={note.id} />
                <Bouton taille="sm" variante="danger" type="submit">Supprimer</Bouton>
              </form>
            </li>
          ))}
          {membre.notesRecues.length === 0 && (
            <li className="text-[13px] text-encre">Aucune note pour l&apos;instant.</li>
          )}
        </ul>
      </Carte>
    </div>
  );
}
