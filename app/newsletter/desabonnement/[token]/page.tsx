// ============================================================
// WEBGIVERSE TOOLS — Désabonnement public (par token unique)
// Chemin : app/newsletter/desabonnement/[token]/page.tsx
//
// Le lien est de la forme /newsletter/desabonnement/<token>.
// Le token est unique PAR ABONNÉ : c'est ce lien qui remplace
// {{lien_desabonnement}} dans les e-mails.
// Le désabonnement se confirme par un clic (les antivirus qui
// pré-visitent les liens ne désabonnent personne par accident).
// ============================================================

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type ClientPrisma = Record<string, any>;

async function confirmerDesabonnement(formData: FormData) {
  "use server";
  const token = String(formData.get("token") || "");
  const client = prisma as ClientPrisma;
  const abonne = await client.abonneNewsletter?.findUnique({ where: { token } });
  if (abonne) {
    await client.abonneNewsletter.update({
      where: { token },
      data: { actif: false, desabonneLe: new Date() },
    });
  }
  revalidatePath("/admin/newsletter");
  redirect(`/newsletter/desabonnement/${token}?confirme=1`);
}

export default async function PageDesabonnement({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const confirme = sp.confirme === "1";

  const client = prisma as ClientPrisma;
  const abonne = client.abonneNewsletter
    ? await client.abonneNewsletter.findUnique({ where: { token } })
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-8 text-center shadow-sm">
        {!client.abonneNewsletter ? (
          <>
            <h1 className="text-xl font-bold text-gray-900">Newsletter non configurée</h1>
            <p className="text-sm text-gray-500">
              Le modèle AbonneNewsletter est manquant : ajoutez les modèles au schéma puis
              exécutez « npx prisma db push ».
            </p>
          </>
        ) : confirme ? (
          <>
            <h1 className="text-xl font-bold text-green-700">Vous êtes désabonné(e)</h1>
            <p className="text-sm text-gray-500">
              Vous ne recevrez plus la newsletter
              {abonne ? (
                <>
                  {" "}
                  à l'adresse <strong>{abonne.email}</strong>
                </>
              ) : null}
              .
            </p>
            <Link
              href={`/newsletter/preferences/${token}`}
              className="inline-block rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Se réabonner / gérer mes préférences
            </Link>
          </>
        ) : !abonne ? (
          <>
            <h1 className="text-xl font-bold text-gray-900">Lien invalide</h1>
            <p className="text-sm text-gray-500">
              Ce lien de désabonnement est invalide ou n'existe plus.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900">Se désabonner</h1>
            <p className="text-sm text-gray-500">
              E-mail concerné : <strong className="text-gray-900">{abonne.email}</strong>
            </p>
            <p className="text-sm text-gray-500">
              Confirmez-vous que vous ne souhaitez plus recevoir la newsletter ?
            </p>
            <form action={confirmerDesabonnement} className="space-y-3">
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
              >
                Confirmer le désabonnement
              </button>
            </form>
            <Link
              href={`/newsletter/preferences/${token}`}
              className="inline-block text-sm text-indigo-600 underline"
            >
              Non, gérer mes préférences plutôt
            </Link>
          </>
        )}
      </div>
    </main>
  );
}