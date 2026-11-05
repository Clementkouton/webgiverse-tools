// ═══════════════════════════════════════════════════════════════
// app/desabonnement/page.tsx
// PAGE PUBLIQUE de gestion d'abonnement à la newsletter.
//
// Accès : /desabonnement?token=XXXX
// C'est la page vers laquelle pointent les variables
//   {{lien_desabonnement}}  et  {{lien_preferences}}
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PropsRecherche = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

type AbonneAffiche = {
  id: string;
  email: string;
  nom: string | null;
  token: string;
  statut: string;
};

type ClientPrisma = Record<string, any>;

/* ── Actions serveur ──────────────────────────────────────────── */

async function desabonner(formData: FormData) {
  "use server";

  const token = String(formData.get("token") ?? "").trim();
  if (token.length === 0) return;

  const client = prisma as unknown as ClientPrisma;
  if (!client.abonneNewsletter) return;

  const abonne = await client.abonneNewsletter
    .findUnique({ where: { token }, select: { id: true } })
    .catch(() => null);
  if (!abonne) return;

  await client.abonneNewsletter
    .update({ where: { id: abonne.id }, data: { statut: "DESABONNE" } })
    .catch(() => null);
  revalidatePath("/desabonnement");
  revalidatePath("/admin/newsletter");
}

async function reagir(formData: FormData) {
  "use server";

  const token = String(formData.get("token") ?? "").trim();
  if (token.length === 0) return;

  const client = prisma as unknown as ClientPrisma;
  if (!client.abonneNewsletter) return;

  const abonne = await client.abonneNewsletter
    .findUnique({ where: { token }, select: { id: true } })
    .catch(() => null);
  if (!abonne) return;

  await client.abonneNewsletter
    .update({ where: { id: abonne.id }, data: { statut: "ABONNE" } })
    .catch(() => null);
  revalidatePath("/desabonnement");
  revalidatePath("/admin/newsletter");
}

async function majPreferences(formData: FormData) {
  "use server";

  const token = String(formData.get("token") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim() || null;
  if (token.length === 0) return;

  const client = prisma as unknown as ClientPrisma;
  if (!client.abonneNewsletter) return;

  const abonne = await client.abonneNewsletter
    .findUnique({ where: { token }, select: { id: true } })
    .catch(() => null);
  if (!abonne) return;

  await client.abonneNewsletter
    .update({ where: { id: abonne.id }, data: { nom } })
    .catch(() => null);
  revalidatePath("/desabonnement");
  revalidatePath("/admin/newsletter");
}

/* ── Styles ───────────────────────────────────────────────────── */

const styleLabel = "block text-sm font-medium text-slate-700 mb-1";
const styleInput =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

/* ── Page ─────────────────────────────────────────────────────── */

export default async function PageDesabonnement({
  searchParams,
}: PropsRecherche) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  const client = prisma as unknown as ClientPrisma;

  // ── Modèle absent : message clair ─────────────────────────────
  if (!client.abonneNewsletter) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
          <p className="font-semibold">
            La gestion de la newsletter n&apos;est pas encore activée.
          </p>
          <p className="mt-2 text-sm">
            Ajoute le modèle <code>AbonneNewsletter</code> au schéma puis
            exécute <code>npx prisma db push</code>.
          </p>
        </div>
      </main>
    );
  }

  // ── Jeton absent ──────────────────────────────────────────────
  if (token.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Lien invalide
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Ce lien de désabonnement est incomplet. Utilise le lien exact
            figurant en bas de l&apos;e-mail que tu as reçu.
          </p>
        </div>
      </main>
    );
  }

  const abonneBrut = await client.abonneNewsletter
    .findUnique({
      where: { token },
      select: { id: true, email: true, nom: true, token: true, statut: true },
    })
    .catch(() => null);

  if (!abonneBrut) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Lien invalide
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Cet abonnement n&apos;existe pas ou a été supprimé.
          </p>
        </div>
      </main>
    );
  }

  const abonne = abonneBrut as AbonneAffiche;
  const estAbonne = abonne.statut === "ABONNE";

  // ── Rendu ─────────────────────────────────────────────────────
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Gestion de ton abonnement
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Abonnement lié à l&apos;adresse{" "}
          <strong className="text-slate-800">{abonne.email}</strong>
        </p>

        <div className="mt-4">
          <span
            className={
              estAbonne
                ? "inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700"
                : "inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600"
            }
          >
            {estAbonne ? "Abonné à la newsletter" : "Désabonné de la newsletter"}
          </span>
        </div>

        {estAbonne ? (
          <form action={desabonner} className="mt-6">
            <input type="hidden" name="token" value={abonne.token} />
            <button
              type="submit"
              className="w-full rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              Se désabonner
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">
              Tu ne recevras plus aucun e-mail de la newsletter.
            </p>
          </form>
        ) : (
          <form action={reagir} className="mt-6">
            <input type="hidden" name="token" value={abonne.token} />
            <button
              type="submit"
              className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              Se réabonner
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">
              Tu recevras à nouveau les e-mails de la newsletter.
            </p>
          </form>
        )}

        {/* Préférences */}
        <div className="mt-8 border-t border-slate-100 pt-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Tes préférences
          </h2>
          <form action={majPreferences} className="mt-4 space-y-4">
            <input type="hidden" name="token" value={abonne.token} />
            <div>
              <label htmlFor="nom" className={styleLabel}>
                Ton nom (optionnel)
              </label>
              <input
                id="nom"
                name="nom"
                defaultValue={abonne.nom ?? ""}
                placeholder="Ex. Claire Dupont"
                className={styleInput}
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Mettre à jour mes préférences
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          Ce lien est personnel et confidentiel : il est réservé à ton
          abonnement.
        </p>
      </div>
    </main>
  );
}