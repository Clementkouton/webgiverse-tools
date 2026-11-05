// ═══════════════════════════════════════════════════════════════
// app/admin/codes-promo/page.tsx
// Administration des codes promo : liste, création, activation,
// suppression.
//
// ⚠️ UNE SEULE LIGNE À VÉRIFIER : l'import de « prisma » ci-dessous.
// Si ton projet importe le client Prisma depuis un autre chemin,
// garde TA ligne d'import actuelle à la place.
//
// Cette page est AUTONOME : les actions serveur sont définies ici.
// L'ancien fichier app/actions/codes-promo.ts n'est plus utilisé
// par cette page (ne le supprime pas si d'autres fichiers
// l'importent encore).
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/* ── Types locaux ───────────────────────────────────────────────
   Construits UNIQUEMENT sur les champs prouvés de TON modèle
   CodePromo (donnés par le message d'erreur Prisma) :
   id, description, typeRemise, valeur, dateDebut, dateFin,
   actif, creeLe, majLe, conversions.
   Il n'y a PAS de champ « code » : le code promo EST l'id.
   ─────────────────────────────────────────────────────────────── */

type CodePromoAffiche = {
  id: string;
  description: string | null;
  typeRemise: string;
  valeur: number;
  dateDebut: Date | null;
  dateFin: Date | null;
  actif: boolean;
  creeLe: Date;
  _count?: { conversions: number };
};

type ClientPrisma = Record<string, any>;

/* ── Utilitaires ──────────────────────────────────────────────── */

const formateurDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formaterDateOuTiret(date: Date | null): string {
  if (!date) return "—";
  return formateurDate.format(new Date(date));
}

function remiseAffichee(code: CodePromoAffiche): string {
  if (code.typeRemise === "POURCENTAGE") {
    return `${code.valeur} %`;
  }
  return `${code.valeur} (montant fixe)`;
}

/* ── Actions serveur ──────────────────────────────────────────── */

async function creerCodePromo(formData: FormData) {
  "use server";

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const valeurBrute = Number.parseInt(String(formData.get("valeur") ?? ""), 10);
  if (code.length === 0 || Number.isNaN(valeurBrute) || valeurBrute <= 0) {
    return;
  }

  const typeRemise =
    String(formData.get("typeRemise") ?? "POURCENTAGE") === "MONTANT"
      ? "MONTANT"
      : "POURCENTAGE";
  const description = String(formData.get("description") ?? "").trim() || null;
  const dateDebutBrute = String(formData.get("dateDebut") ?? "").trim();
  const dateFinBrute = String(formData.get("dateFin") ?? "").trim();
  const actif = formData.get("actif") === "on";

  const dateDebut = dateDebutBrute.length > 0 ? new Date(dateDebutBrute) : null;
  const dateFin = dateFinBrute.length > 0 ? new Date(dateFinBrute) : null;

  const client = prisma as unknown as ClientPrisma;
  if (!client.codePromo) return;

  // Doublon ? On vérifie d'abord l'id (le code EST l'identifiant),
  // puis, si ton modèle possède un champ « code » distinct, celui-ci.
  let dejaPris = await client.codePromo.findUnique({ where: { id: code } });
  if (!dejaPris) {
    dejaPris = await client.codePromo
      .findFirst({ where: { code } })
      .catch(() => null);
  }
  if (dejaPris) return;

  const donnees = {
    description,
    typeRemise,
    valeur: valeurBrute,
    dateDebut,
    dateFin,
    actif,
  };

  try {
    // Ton modèle n'a pas de champ « code » : le code = l'id.
    await client.codePromo.create({ data: { id: code, ...donnees } });
  } catch {
    // Si ton modèle possède finalement un champ « code » distinct
    // obligatoire, on retente en le renseignant aussi.
    await client.codePromo
      .create({ data: { id: code, code, ...donnees } })
      .catch(() => null);
  }
  revalidatePath("/admin/codes-promo");
}

async function basculerCodeActif(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  const actifActuel = String(formData.get("actif") ?? "") === "true";
  if (id.length === 0) return;

  const client = prisma as unknown as ClientPrisma;
  if (!client.codePromo) return;

  await client.codePromo
    .update({ where: { id }, data: { actif: !actifActuel } })
    .catch(() => null);
  revalidatePath("/admin/codes-promo");
}

async function supprimerCodePromo(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  if (id.length === 0) return;

  const client = prisma as unknown as ClientPrisma;
  if (!client.codePromo) return;

  await client.codePromo.delete({ where: { id } }).catch(() => null);
  revalidatePath("/admin/codes-promo");
}

/* ── Styles partagés ──────────────────────────────────────────── */

const styleLabel = "block text-sm font-medium text-slate-700 mb-1";
const styleInput =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";
const styleBoutonPrimaire =
  "inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700";

/* ── Page ─────────────────────────────────────────────────────── */

export default async function PageCodesPromoAdmin() {
  const client = prisma as unknown as ClientPrisma;

  // ── Garde-fou : client Prisma pas encore régénéré ─────────────
  if (!client.codePromo) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-bold text-slate-900">Codes promo</h1>
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
          <p className="font-semibold">
            Le client Prisma ne connaît pas encore le modèle « CodePromo ».
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
  const codesBruts = await client.codePromo.findMany({
    include: { _count: { select: { conversions: true } } },
    orderBy: { creeLe: "desc" },
  });

  const codes = codesBruts as CodePromoAffiche[];

  // ── Rendu ─────────────────────────────────────────────────────
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Codes promo</h1>
      <p className="mt-1 text-sm text-slate-500">
        {codes.length} code{codes.length > 1 ? "s" : ""} promo
      </p>

      {/* Formulaire de création */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Créer un code promo
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Le code saisi devient l&apos;identifiant unique du code promo. Il
          est mis en majuscules automatiquement.
        </p>
        <form
          action={creerCodePromo}
          className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <div>
            <label htmlFor="code" className={styleLabel}>
              Code *
            </label>
            <input
              id="code"
              name="code"
              required
              placeholder="Ex. BIENVENUE10"
              className={`${styleInput} font-mono uppercase`}
            />
          </div>
          <div>
            <label htmlFor="typeRemise" className={styleLabel}>
              Type de remise
            </label>
            <select
              id="typeRemise"
              name="typeRemise"
              className={styleInput}
              defaultValue="POURCENTAGE"
            >
              <option value="POURCENTAGE">Pourcentage</option>
              <option value="MONTANT">Montant fixe</option>
            </select>
          </div>
          <div>
            <label htmlFor="valeur" className={styleLabel}>
              Valeur * (ex. 20 pour -20 %)
            </label>
            <input
              id="valeur"
              name="valeur"
              type="number"
              min={1}
              required
              placeholder="20"
              className={styleInput}
            />
          </div>
          <div>
            <label htmlFor="description" className={styleLabel}>
              Description
            </label>
            <input
              id="description"
              name="description"
              placeholder="Ex. Offre de bienvenue"
              className={styleInput}
            />
          </div>
          <div>
            <label htmlFor="dateDebut" className={styleLabel}>
              Début de validité
            </label>
            <input
              id="dateDebut"
              name="dateDebut"
              type="datetime-local"
              className={styleInput}
            />
          </div>
          <div>
            <label htmlFor="dateFin" className={styleLabel}>
              Fin de validité
            </label>
            <input
              id="dateFin"
              name="dateFin"
              type="datetime-local"
              className={styleInput}
            />
          </div>
          <div className="flex items-center justify-between gap-4 md:col-span-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="actif"
                defaultChecked
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              Code actif (utilisable immédiatement)
            </label>
            <button type="submit" className={styleBoutonPrimaire}>
              Créer le code
            </button>
          </div>
        </form>
      </section>

      {/* Liste des codes */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Liste des codes promo
        </h2>
        {codes.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Aucun code promo pour l&apos;instant. Utilise le formulaire
            ci-dessus pour en créer un.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Remise</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Validité</th>
                  <th className="px-4 py-3">Utilisations</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {codes.map((codePromo) => (
                  <tr key={codePromo.id}>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-800">
                        {codePromo.id}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {remiseAffichee(codePromo)}
                    </td>
                    <td className="max-w-48 truncate px-4 py-3 text-slate-500">
                      {codePromo.description ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formaterDateOuTiret(codePromo.dateDebut)} →{" "}
                      {formaterDateOuTiret(codePromo.dateFin)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {codePromo._count?.conversions ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <form action={basculerCodeActif}>
                        <input type="hidden" name="id" value={codePromo.id} />
                        <input
                          type="hidden"
                          name="actif"
                          value={codePromo.actif ? "true" : "false"}
                        />
                        <button
                          type="submit"
                          className={
                            codePromo.actif
                              ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                              : "inline-flex rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-300"
                          }
                        >
                          {codePromo.actif ? "Actif" : "Inactif"}
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={supprimerCodePromo}>
                        <input type="hidden" name="id" value={codePromo.id} />
                        <button
                          type="submit"
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}