// ═══════════════════════════════════════════════════════════════
// app/admin/parrainages/page.tsx
// Administration des parrainages : statistiques, classement des
// parrains, liste des parrainages, membres à relancer.
//
// ⚠️ UNE SEULE LIGNE À VÉRIFIER : l'import de « prisma » ci-dessous.
// Si ton projet importe le client Prisma depuis un autre chemin
// (par ex. import { prismaClient } from "@/lib/prismaClient"),
// garde TA ligne d'import actuelle à la place.
// ═══════════════════════════════════════════════════════════════

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/* ── Types locaux ───────────────────────────────────────────────
   Construits UNIQUEMENT à partir des champs réellement présents
   dans ton schéma (vérifiés dans le message d'erreur Prisma) :
   id, name, email, createdAt, suspenduLe, et les relations
   self « filleuls » / « parrainePar ». Aucun champ inventé.
   ─────────────────────────────────────────────────────────────── */

type UtilisateurLeger = {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
};

type ParrainAvecFilleuls = UtilisateurLeger & {
  filleuls: UtilisateurLeger[];
};

type PaireParrainage = {
  parrain: UtilisateurLeger | null;
  filleul: UtilisateurLeger;
};

// Accès « souple » au client Prisma (évite les erreurs de
// compilation quand les types générés ne sont pas à jour).
type ClientPrisma = Record<string, any>;

/* ── Utilitaires ──────────────────────────────────────────────── */

const formateurDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function nomAffiche(utilisateur: UtilisateurLeger | null): string {
  if (!utilisateur) return "—";
  if (utilisateur.name && utilisateur.name.trim().length > 0) {
    return utilisateur.name.trim();
  }
  return utilisateur.email;
}

function lettreAvatar(utilisateur: UtilisateurLeger | null): string {
  return nomAffiche(utilisateur).charAt(0).toUpperCase();
}

/* ── Page ─────────────────────────────────────────────────────── */

export default async function PageParrainagesAdmin() {
  const client = prisma as unknown as ClientPrisma;

  // ── Garde-fou : client Prisma pas encore régénéré ─────────────
  if (!client.user) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-bold text-slate-900">Parrainages</h1>
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
          <p className="font-semibold">
            Le client Prisma ne semble pas encore régénéré.
          </p>
          <p className="mt-2">
            Arrête le serveur de développement (Ctrl+C), puis exécute :
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm leading-6 text-slate-100">
            {"npx prisma format\nnpx prisma db push"}
          </pre>
          <p className="mt-3">Puis relance le serveur :</p>
          <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm leading-6 text-slate-100">
            npm run dev
          </pre>
        </div>
      </main>
    );
  }

  // ── Données ───────────────────────────────────────────────────
  // On n'utilise QUE le modèle User et ses relations self prouvées
  // (« filleuls » = membres parrainés via parraineParId).
  // Aucun appel à prisma.parrainage : impossible d'avoir une erreur
  // « Unknown argument » sur les champs du modèle Parrainage.
  const [parrainsBruts, eligiblesBruts] = await Promise.all([
    // Tous les membres ayant au moins un filleul (parrains actifs)
    client.user.findMany({
      where: { filleuls: { some: {} } },
      include: {
        filleuls: {
          select: { id: true, name: true, email: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Membres actifs n'ayant encore parrainé personne (à relancer)
    client.user.findMany({
      where: {
        suspenduLe: null, // membre non suspendu = actif
        filleuls: { none: {} },
      },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
  ]);

  const parrains = parrainsBruts as ParrainAvecFilleuls[];
  const eligibles = eligiblesBruts as UtilisateurLeger[];

  // ── Calculs côté code (pas de groupBy, pas de champs inconnus) ─

  // Classement : parrains triés par nombre de filleuls (top 10)
  const classement = [...parrains]
    .sort((a, b) => b.filleuls.length - a.filleuls.length)
    .slice(0, 10);

  // Liste plate des paires (parrain → filleul), triée par date
  // d'inscription du filleul (la plus récente d'abord)
  const pairesParrainages: PaireParrainage[] = [];
  for (const parrain of parrains) {
    for (const filleul of parrain.filleuls) {
      pairesParrainages.push({ parrain, filleul });
    }
  }
  pairesParrainages.sort(
    (a, b) =>
      new Date(b.filleul.createdAt).getTime() -
      new Date(a.filleul.createdAt).getTime()
  );

  const totalParrainages = pairesParrainages.length;

  // ── Rendu ─────────────────────────────────────────────────────
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Parrainages</h1>
      <p className="mt-1 text-sm text-slate-500">
        {totalParrainages} parrainage{totalParrainages > 1 ? "s" : ""} ·{" "}
        {parrains.length} parrain{parrains.length > 1 ? "s" : ""} ·{" "}
        {eligibles.length} membre{eligibles.length > 1 ? "s" : ""} à relancer
      </p>

      {/* Cartes de statistiques */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Parrains actifs</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {parrains.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Filleuls parrainés</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {totalParrainages}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Membres à relancer</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {eligibles.length}
          </p>
        </div>
      </div>

      {/* Classement des parrains */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Classement des parrains
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Top 10 des parrains, classés par nombre de filleuls.
        </p>
        {classement.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Aucun parrain pour l&apos;instant.
          </p>
        ) : (
          <ol className="mt-4 space-y-2">
            {classement.map((entree, index) => (
              <li
                key={entree.id}
                className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] -skew-x-[18deg] not-italic bg-indigo-100 text-sm font-bold text-indigo-700">
                  {index + 1}
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                  {lettreAvatar(entree)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">
                    {nomAffiche(entree)}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {entree.email}
                  </p>
                </div>
                <span className="inline-flex shrink-0 rounded-[7px] -skew-x-[18deg] not-italic bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  {entree.filleuls.length} filleul
                  {entree.filleuls.length > 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Liste des parrainages */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Liste des parrainages
        </h2>
        {pairesParrainages.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Aucun parrainage enregistré pour l&apos;instant.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Filleul</th>
                  <th className="px-4 py-3">Parrainé par</th>
                  <th className="px-4 py-3">Membre depuis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pairesParrainages.map((paire) => (
                  <tr key={`${paire.parrain?.id ?? "?"}-${paire.filleul.id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-700">
                          {lettreAvatar(paire.filleul)}
                        </span>
                        <div>
                          <p className="font-medium text-slate-900">
                            {nomAffiche(paire.filleul)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {paire.filleul.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                          {lettreAvatar(paire.parrain)}
                        </span>
                        <div>
                          <p className="font-medium text-slate-900">
                            {nomAffiche(paire.parrain)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {paire.parrain?.email ?? "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formateurDate.format(new Date(paire.filleul.createdAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Membres à relancer */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Membres à relancer
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Membres actifs (non suspendus) n&apos;ayant encore parrainé personne.
        </p>
        {eligibles.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Aucun membre à relancer : tout le monde a déjà parrainé.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100">
            {eligibles.map((membre) => (
              <li
                key={membre.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                  {lettreAvatar(membre)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">
                    {nomAffiche(membre)}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {membre.email}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  Inscrit le {formateurDate.format(new Date(membre.createdAt))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}