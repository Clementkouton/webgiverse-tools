// ============================================================
// WEBGIVERSE TOOLS — Préférences publiques (par token unique)
// Chemin : app/newsletter/preferences/[token]/page.tsx
//
// Le lien est de la forme /newsletter/preferences/<token>.
// C'est ce lien qui remplace {{lien_preferences}} dans les
// e-mails. L'abonné peut y corriger son prénom / nom et
// réactiver ou couper la réception de la newsletter.
// ============================================================

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type ClientPrisma = Record<string, any>;

type Abonne = {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  token: string;
  actif: boolean;
};

async function enregistrerPreferences(formData: FormData) {
  "use server";
  const token = String(formData.get("token") || "");
  const prenom = String(formData.get("prenom") || "").trim();
  const nom = String(formData.get("nom") || "").trim();
  const veutRecevoir = formData.get("actif") === "on";

  const client = prisma as ClientPrisma;
  const abonne = await client.abonneNewsletter?.findUnique({ where: { token } });
  if (abonne) {
    await client.abonneNewsletter.update({
      where: { token },
      data: {
        prenom: prenom || null,
        nom: nom || null,
        actif: veutRecevoir,
        desabonneLe: veutRecevoir ? null : new Date(),
      },
    });
  }
  revalidatePath("/admin/newsletter");
  redirect(`/newsletter/preferences/${token}?enregistre=1`);
}

export default async function PagePreferences({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const enregistre = sp.enregistre === "1";

  const client = prisma as ClientPrisma;
  const abonne = client.abonneNewsletter
    ? ((await client.abonneNewsletter.findUnique({ where: { token } })) as Abonne | null)
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Vos préférences newsletter</h1>

        {!client.abonneNewsletter ? (
          <p className="text-sm text-gray-500">
            La newsletter n'est pas encore configurée sur ce site (modèle AbonneNewsletter
            manquant : exécutez « npx prisma db push »).
          </p>
        ) : !abonne ? (
          <>
            <p className="text-sm text-gray-500">Ce lien est invalide ou n'existe plus.</p>
            <Link href="/newsletter/inscription" className="text-sm text-indigo-600 underline">
              S'inscrire à la newsletter
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500">
              E-mail : <strong className="text-gray-900">{abonne.email}</strong>
            </p>

            {enregistre && (
              <p className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
                Vos préférences ont bien été enregistrées.
              </p>
            )}

            <form action={enregistrerPreferences} className="space-y-3">
              <input type="hidden" name="token" value={token} />
              <input
                name="prenom"
                defaultValue={abonne.prenom || ""}
                placeholder="Prénom"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <input
                name="nom"
                defaultValue={abonne.nom || ""}
                placeholder="Nom"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="actif"
                  defaultChecked={abonne.actif}
                  className="h-4 w-4"
                />
                Je souhaite recevoir la newsletter
              </label>
              <button
                type="submit"
                className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                Enregistrer
              </button>
            </form>

            <p className="text-center">
              <Link
                href={`/newsletter/desabonnement/${token}`}
                className="text-sm text-red-600 underline"
              >
                Se désabonner de la newsletter
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}