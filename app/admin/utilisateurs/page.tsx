import Link from "next/link";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  bannirMembreFormulaire,
  impersonerFormulaire,
  rendreAdminFormulaire,
  reactiverMembreFormulaire,
  revenirAdminFormulaire,
  suspendreMembreFormulaire,
} from "../../actions/gestion-utilisateurs";

export const dynamic = "force-dynamic";

/* ────────────────────────── Éléments d'affichage ────────────────────────── */

function dateFr(date: Date | null | undefined) {
  if (!date) return "—";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
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

function Avatar({ image, name }: { image: string | null; name: string | null }) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt="" className="h-9 w-9 shrink-0 rounded-[7px] -skew-x-[18deg] not-italic object-cover" />
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] -skew-x-[18deg] not-italic bg-slate-200 text-sm font-semibold text-slate-600">
      {(name ?? "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

function FormulaireAction({
  action,
  id,
  classe,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  classe?: string;
  children: ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
          classe ?? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        {children}
      </button>
    </form>
  );
}

/* ──────────────────────────────── Page ──────────────────────────────── */

export default async function PageUtilisateursAdmin({
  searchParams,
}: {
  searchParams: Promise<{ [cle: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const qBrut = typeof params.q === "string" ? params.q : "";
  const statutBrut = typeof params.statut === "string" ? params.statut : "";
  const statutFiltre =
    statutBrut === "ACTIF" || statutBrut === "SUSPENDU" || statutBrut === "BANNI" ? statutBrut : null;

  const session = await auth();
  const moi = session?.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
    : null;
  const monId = moi?.id ?? null;

  // Une impersonation est-elle en cours ? (cookie posé par « Se connecter en tant que… »)
  const jar = await cookies();
  const impersonationEnCours = Boolean(jar.get("impersonateurId")?.value);

  // Filtre intelligent : TOUS les mots doivent correspondre (ET),
  // dans le nom OU l'e-mail (OU) — pas une succession de mots.
  const mots = qBrut.trim().split(/\s+/).filter(Boolean);
  const where: Prisma.UserWhereInput = {};
  if (statutFiltre) where.statut = statutFiltre;
  if (mots.length > 0) {
    where.AND = mots.map((mot) => ({
      OR: [
        { name: { contains: mot, mode: "insensitive" } },
        { email: { contains: mot, mode: "insensitive" } },
      ],
    }));
  }

  const [utilisateurs, repartition] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { favorites: true, avis: true, lists: true, votes: true, conversations: true } },
        abonnement: { select: { statut: true, plan: true, expireLe: true } },
      },
    }),
    prisma.user.groupBy({
      by: ["statut"],
      _count: { _all: true },
    }),
  ]);

  const nombre = (statutRecherche: string) =>
    repartition.find((r) => r.statut === statutRecherche)?._count._all ?? 0;
  const total = repartition.reduce((somme, r) => somme + r._count._all, 0);

  const lienOnglet = (statut: string | null) => {
    const criteres = new URLSearchParams();
    if (qBrut) criteres.set("q", qBrut);
    if (statut) criteres.set("statut", statut);
    const requete = criteres.toString();
    return requete ? `/admin/utilisateurs?${requete}` : "/admin/utilisateurs";
  };

  const pillClasse = (actif: boolean) =>
    `rounded-[7px] -skew-x-[18deg] not-italic px-3 py-1.5 text-xs font-medium transition ${
      actif
        ? "bg-slate-900 text-white"
        : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Utilisateurs</h1>
        <p className="mt-1 text-sm text-slate-500">
          {total} compte{total > 1 ? "s" : ""} au total — tous les mots de la recherche doivent
          correspondre au nom ou à l'e-mail.
        </p>
      </div>

      {impersonationEnCours && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>
            Session « Se connecter en tant que » active ({session?.user?.email ?? "membre"}).
            Pour retrouver votre compte admin, déconnectez-vous puis reconnectez-vous.
          </span>
          <form action={revenirAdminFormulaire}>
            <button
              type="submit"
              className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
            >
              Revenir en admin
            </button>
          </form>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form action="/admin/utilisateurs" method="get" className="flex flex-wrap items-center gap-2">
          {statutFiltre ? <input type="hidden" name="statut" value={statutFiltre} /> : null}
          <input
            name="q"
            defaultValue={qBrut}
            placeholder="Rechercher un nom ou un e-mail…"
            className="w-72 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Rechercher
          </button>
          {qBrut ? (
            <Link
              href={lienOnglet(statutFiltre)}
              className="text-xs text-slate-500 underline hover:text-slate-700"
            >
              Effacer
            </Link>
          ) : null}
        </form>

        <div className="flex flex-wrap gap-2">
          <Link href={lienOnglet(null)} className={pillClasse(!statutFiltre)}>
            Tous ({total})
          </Link>
          <Link href={lienOnglet("ACTIF")} className={pillClasse(statutFiltre === "ACTIF")}>
            Actifs ({nombre("ACTIF")})
          </Link>
          <Link href={lienOnglet("SUSPENDU")} className={pillClasse(statutFiltre === "SUSPENDU")}>
            Suspendus ({nombre("SUSPENDU")})
          </Link>
          <Link href={lienOnglet("BANNI")} className={pillClasse(statutFiltre === "BANNI")}>
            Bannis ({nombre("BANNI")})
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Utilisateur</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Rôle</th>
              <th className="px-4 py-3 font-medium">Abonnement</th>
              <th className="px-4 py-3 font-medium">Inscrit le</th>
              <th className="px-4 py-3 font-medium">Activité</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {utilisateurs.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar image={u.image} name={u.name} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium text-slate-900">
                        <span className="truncate">{u.name ?? "Sans nom"}</span>
                        {u.id === monId && (
                          <span className="shrink-0 text-xs text-slate-400">C'est ton compte 👋</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-slate-500">{u.email}</p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <span
                    title={
                      u.motifSuspension
                        ? u.motifSuspension
                        : undefined
                    }
                  >
                    <BadgeStatut statut={u.statut} />
                  </span>
                </td>

                <td className="px-4 py-3">
                  {u.role === "ADMIN" ? (
                    <span className="inline-flex rounded-[7px] -skew-x-[18deg] not-italic bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                      Admin
                    </span>
                  ) : (
                      <span className="inline-flex rounded-[7px] -skew-x-[18deg] not-italic bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      Membre
                    </span>
                  )}
                </td>

                <td className="px-4 py-3">
                  {u.abonnement ? (
                    <span className="inline-flex rounded-[7px] -skew-x-[18deg] not-italic bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      {u.abonnement.plan ?? "Abonnement"}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                <td className="px-4 py-3 text-slate-600">{dateFr(u.createdAt)}</td>

                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5 text-xs text-slate-500">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5">{u._count.favorites} favoris</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5">{u._count.avis} avis</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5">{u._count.lists} listes</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5">{u._count.votes} votes</span>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link
                      href={`/admin/utilisateurs/${u.id}`}
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Fiche
                    </Link>

                    {u.id !== monId && u.role !== "ADMIN" && u.statut === "ACTIF" && (
                      <FormulaireAction
                        action={impersonerFormulaire}
                        id={u.id}
                        classe="border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      >
                        Se connecter en tant que…
                      </FormulaireAction>
                    )}

                    {u.id !== monId && u.role !== "ADMIN" && u.statut === "ACTIF" && (
                      <FormulaireAction
                        action={suspendreMembreFormulaire}
                        id={u.id}
                        classe="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      >
                        Suspendre
                      </FormulaireAction>
                    )}

                    {u.id !== monId && u.role !== "ADMIN" && u.statut === "SUSPENDU" && (
                      <>
                        <FormulaireAction
                          action={reactiverMembreFormulaire}
                          id={u.id}
                          classe="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        >
                          Réactiver
                        </FormulaireAction>
                        <FormulaireAction
                          action={bannirMembreFormulaire}
                          id={u.id}
                          classe="border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                        >
                          Bannir
                        </FormulaireAction>
                      </>
                    )}

                    {u.id !== monId && u.role !== "ADMIN" && u.statut === "BANNI" && (
                      <FormulaireAction
                        action={reactiverMembreFormulaire}
                        id={u.id}
                        classe="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      >
                        Réactiver
                      </FormulaireAction>
                    )}

                    {u.id !== monId && u.role !== "ADMIN" && (
                      <FormulaireAction action={rendreAdminFormulaire} id={u.id}>
                        Rendre admin
                      </FormulaireAction>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {utilisateurs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                  Aucun utilisateur ne correspond à ces critères.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}