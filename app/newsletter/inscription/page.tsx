// ============================================================
// WEBGIVERSE TOOLS — Inscription publique à la newsletter
// Chemin : app/newsletter/inscription/page.tsx
// Page publique : les visiteurs s'inscrivent eux-mêmes.
// Un abonné déjà inscrit et désabonné est réactivé.
// ============================================================

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type ClientPrisma = Record<string, any>;

async function sinscrire(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const prenom = String(formData.get("prenom") || "").trim();
  const nom = String(formData.get("nom") || "").trim();

  if (!email || !email.includes("@")) {
    redirect("/newsletter/inscription?erreur=1");
  }

  const client = prisma as ClientPrisma;
  if (!client.abonneNewsletter) {
    redirect("/newsletter/inscription?erreur=2");
  }

  const existant = await client.abonneNewsletter.findUnique({ where: { email } });
  if (existant) {
    await client.abonneNewsletter.update({
      where: { email },
      data: {
        prenom: prenom || existant.prenom,
        nom: nom || existant.nom,
        actif: true,
        desabonneLe: null,
      },
    });
  } else {
    await client.abonneNewsletter.create({
      data: { email, prenom: prenom || null, nom: nom || null, actif: true },
    });
  }

  revalidatePath("/admin/newsletter");
  redirect("/newsletter/inscription?ok=1");
}

export default async function PageInscription({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const ok = params.ok === "1";
  const erreur =
    params.erreur === "1"
      ? "Adresse e-mail invalide."
      : params.erreur === "2"
        ? "La newsletter n'est pas encore configurée sur ce site (modèle AbonneNewsletter manquant : exécutez « npx prisma db push »)."
        : "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Inscription à la newsletter</h1>
        <p className="text-sm text-gray-500">
          Recevez nos actualités directement dans votre boîte mail. Vous pourrez vous
          désabonner à tout moment depuis chaque e-mail.
        </p>

        {ok && (
          <p className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
            Merci ! Votre inscription est confirmée.
          </p>
        )}
        {erreur && (
          <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {erreur}
          </p>
        )}

        <form action={sinscrire} className="space-y-3">
          <input
            name="email"
            type="email"
            required
            placeholder="Votre e-mail *"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <input
            name="prenom"
            placeholder="Votre prénom"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <input
            name="nom"
            placeholder="Votre nom"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Je m'inscris
          </button>
        </form>
      </div>
    </main>
  );
}