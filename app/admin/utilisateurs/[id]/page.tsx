import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  ajouterNoteMembreFormulaire,
  bannirMembreFormulaire,
  impersonerFormulaire,
  rendreAdminFormulaire,
  reactiverMembreFormulaire,
  supprimerNoteMembreFormulaire,
  suspendreMembreFormulaire,
} from "../../../actions/gestion-utilisateurs";

export const dynamic = "force-dynamic";

/* ────────────────────────── Éléments d'affichage ────────────────────────── */

function dateFr(date: Date | null | undefined) {
  if (!date) return "—";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function dateHeureFr(date: Date) {
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const LIBELLES_STATUT: Record<string, { texte: string; classe: string }> = {
  ACTIF: { texte: "Actif", classe: "bg-emerald-100 text-emerald-700" },
  SUSPENDU: { texte: "Suspendu", classe: "bg-amber-100 text-amber-700" },
  BANNI: { texte: "Banni", classe: "bg-rose-100 text-rose-700" },
};

function BadgeStatut({ statut }: { statut: string }) {
  const libelle = LIBELLES_STATUT[statut] ?? { texte: statut, classe: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center rounded-[7px] -skew-x-[18deg] not-italic px-2.5 py-0.5 text-xs font-medium ${libelle.classe}`}>
      {libelle.texte}
    </span>
  );
}

const LIBELLES_PARRAINAGE: Record<string, string> = {
  EN_ATTENTE: "En attente",
  RECOMPENSE: "Récompensé",
  ANNULE: "Annulé",
};

/* ──────────────────────────────── Page ──────────────────────────────── */

export default async function PageFicheMembre({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Champs et relations 100 % conformes au schéma réel du projet :
  // parrainePar (User), filleuls (User[]), parrainageFilleul (Parrainage),
  // paiements (creeLe), abonnement (statut/plan/expireLe), notes (NoteMembre).
  const membre = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          favorites: true,
          avis: true,
          lists: true,
          votes: true,
          conversations: true,
          activites: true,
        },
      },
      abonnement: true,
      paiements: { orderBy: { creeLe: "desc" }, take: 8 },
      parrainePar: { select: { id: true, name: true, email: true } },
      filleuls: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          parrainageFilleul: { select: { statut: true, recompenseLe: true } },
        },
      },
      notes: {
        orderBy: { creeLe: "desc" },
      },
    },
  });
  if (!membre) notFound();

  const session = await auth();
  const moi = session?.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
    : null;
  const monId = moi?.id ?? null;

  // Pas d'actions sensibles sur soi-même ni sur un autre admin.
  const protege = membre.role === "ADMIN" || membre.id === monId;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/utilisateurs"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800"
      >
        ← Retour aux utilisateurs
      </Link>

      {/* En-tête */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {membre.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={membre.image} alt="" className="h-14 w-14 rounded-[7px] -skew-x-[18deg] not-italic object-cover" />
            ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-[7px] -skew-x-[18deg] not-italic bg-slate-200 text-xl font-semibold text-slate-600">
                {(membre.name ?? "?").slice(0, 1).toUpperCase()}
              </span>
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-900">{membre.name ?? "Sans nom"}</h1>
              <p className="text-sm text-slate-500">{membre.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {membre.role === "ADMIN" ? (
                  <span className="rounded-[7px] -skew-x-[18deg] not-italic bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                    Admin
                  </span>
                ) : (
                    <span className="rounded-[7px] -skew-x-[18deg] not-italic bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    Membre
                  </span>
                )}
                <BadgeStatut statut={membre.statut} />
                {membre.id === monId && (
                  <span className="text-xs text-slate-400">C'est ton compte 👋</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1 text-right text-xs text-slate-500">
            <p>Inscrit le {dateFr(membre.createdAt)}</p>
            {membre.refCode && (
              <p>
                Code de parrainage :{" "}
                <span className="font-mono text-slate-700">{membre.refCode}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Gestion du compte */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Gestion du compte
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!protege && membre.statut === "ACTIF" && (
            <>
              <form action={impersonerFormulaire}>
                <input type="hidden" name="id" value={membre.id} />
                <button
                  type="submit"
                  className="rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                >
                  Se connecter en tant que…
                </button>
              </form>

              <form action={suspendreMembreFormulaire} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={membre.id} />
                <input
                  name="motif"
                  placeholder="Motif (optionnel)"
                  className="w-56 rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-slate-500"
                />
                <button
                  type="submit"
                  className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                >
                  Suspendre
                </button>
              </form>

              <form action={bannirMembreFormulaire}>
                <input type="hidden" name="id" value={membre.id} />
                <button
                  type="submit"
                  className="rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                >
                  Bannir
                </button>
              </form>
            </>
          )}

          {!protege && membre.statut === "SUSPENDU" && (
            <>
              <form action={reactiverMembreFormulaire}>
                <input type="hidden" name="id" value={membre.id} />
                <button
                  type="submit"
                  className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  Réactiver
                </button>
              </form>
              <form action={bannirMembreFormulaire}>
                <input type="hidden" name="id" value={membre.id} />
                <button
                  type="submit"
                  className="rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                >
                  Bannir
                </button>
              </form>
            </>
          )}

          {membre.statut === "BANNI" && (
            <form action={reactiverMembreFormulaire}>
              <input type="hidden" name="id" value={membre.id} />
              <button
                type="submit"
                className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
              >
                Réactiver
              </button>
            </form>
          )}

          {membre.role !== "ADMIN" && (
            <form action={rendreAdminFormulaire}>
              <input type="hidden" name="id" value={membre.id} />
              <button
                type="submit"
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Rendre admin
              </button>
            </form>
          )}

          {protege && (
            <p className="text-xs text-slate-400">Aucune action disponible sur ce compte.</p>
          )}
        </div>

        {(membre.statut === "SUSPENDU" || membre.statut === "BANNI") && (
          <p className="mt-3 text-xs text-slate-500">
            {membre.statut === "SUSPENDU" ? "Suspendu" : "Banni"}.
          </p>
        )}
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Favoris", valeur: membre._count.favorites },
          { label: "Avis", valeur: membre._count.avis },
          { label: "Listes", valeur: membre._count.lists },
          { label: "Votes", valeur: membre._count.votes },
          { label: "Conversations", valeur: membre._count.conversations },
          { label: "Activités", valeur: membre._count.activites },
        ].map((carte) => (
          <div key={carte.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{carte.valeur}</p>
            <p className="mt-1 text-xs text-slate-500">{carte.label}</p>
          </div>
        ))}
      </div>

      {/* Abonnement + paiements */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Abonnement</h2>
          {membre.abonnement ? (
            <div className="mt-3 space-y-1 text-sm">
              <p className="text-lg font-semibold text-slate-900">
                {membre.abonnement.plan ?? "Plan inconnu"}
              </p>
              <p className="text-slate-600">Statut : {membre.abonnement.statut}</p>
              <p className="text-slate-500">Expire le {dateFr(membre.abonnement.expireLe)}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">Aucun abonnement.</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Paiements récents
          </h2>
          {membre.paiements.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {membre.paiements.map((paiement) => (
                <li
                  key={paiement.id}
                  className="rounded-lg bg-slate-50 px-3 py-2"
                >
                  Paiement du {dateFr(paiement.creeLe)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-400">Aucun paiement enregistré.</p>
          )}
        </div>
      </div>

      {/* Profil déclaré */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Profil déclaré
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">Objectif</dt>
            <dd className="text-sm text-slate-800">{membre.objectif ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Niveau</dt>
            <dd className="text-sm text-slate-800">{membre.niveau ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Budget</dt>
            <dd className="text-sm text-slate-800">{membre.budget ?? "—"}</dd>
          </div>
        </dl>
      </div>

      {/* Parrainage */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Parrainage</h2>
        <div className="mt-3 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-slate-500">Parrainé par</p>
            {membre.parrainePar ? (
              <Link
                href={`/admin/utilisateurs/${membre.parrainePar.id}`}
                className="mt-1 block text-sm text-indigo-600 hover:underline"
              >
                {membre.parrainePar.name ?? membre.parrainePar.email}{" "}
                <span className="text-slate-400">({membre.parrainePar.email})</span>
              </Link>
            ) : (
              <p className="mt-1 text-sm text-slate-400">Aucun parrain.</p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">Filleuls ({membre.filleuls.length})</p>
            {membre.filleuls.length > 0 ? (
              <ul className="mt-1 space-y-2">
                {membre.filleuls.map((filleul) => (
                  <li key={filleul.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link
                      href={`/admin/utilisateurs/${filleul.id}`}
                      className="truncate text-indigo-600 hover:underline"
                    >
                      {filleul.name ?? filleul.email}
                    </Link>
                    {filleul.parrainageFilleul && (
                      <span className="shrink-0 rounded-[7px] -skew-x-[18deg] not-italic bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {LIBELLES_PARRAINAGE[filleul.parrainageFilleul.statut] ??
                          filleul.parrainageFilleul.statut}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-slate-400">Aucun filleul.</p>
            )}
          </div>
        </div>
      </div>

      {/* Notes internes des admins */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Notes internes ({membre.notes.length})
        </h2>

        <form action={ajouterNoteMembreFormulaire} className="mt-3 space-y-2">
          <input type="hidden" name="id" value={membre.id} />
          <textarea
            name="contenu"
            rows={3}
            required
            placeholder="Note interne (visible uniquement par les admins)…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Ajouter la note
          </button>
        </form>

        <ul className="mt-4 space-y-3">
          {membre.notes.map((note) => (
            <li key={note.id} className="rounded-lg bg-slate-50 p-3">
              <p className="text-sm text-slate-800">{note.contenu}</p>
              <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                <span>{dateHeureFr(note.creeLe)}</span>
                <form action={supprimerNoteMembreFormulaire}>
                  <input type="hidden" name="noteId" value={note.id} />
                  <button type="submit" className="text-rose-600 hover:underline">
                    Supprimer
                  </button>
                </form>
              </div>
            </li>
          ))}
          {membre.notes.length === 0 && (
            <li className="text-sm text-slate-400">Aucune note pour le moment.</li>
          )}
        </ul>
      </div>
    </div>
  );
}