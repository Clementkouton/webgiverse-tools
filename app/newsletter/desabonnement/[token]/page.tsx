// ============================================================
// WEBGIVERSE TOOLS — Désabonnement public (par token unique)
// Chemin : app/newsletter/desabonnement/[token]/page.tsx
// Remplace la version précédente.
//
// Nouveautés :
//   - Ne plante PLUS si la base n'est pas à jour : encadré orange
//     avec les instructions au lieu d'une erreur 500.
//   - Style aux couleurs du site (bandeau navy, boutons indigo).
//   - Synchronise actif ET statut (compatibilité avec le système
//     existant du formulaire de la landing page).
//
// Le lien est de la forme /newsletter/desabonnement/<token>.
// Le token est unique PAR ABONNÉ : c'est ce lien qui remplace
// {{lien_desabonnement}} dans les e-mails. Le désabonnement se
// confirme par un clic (les antivirus qui pré-visitent les liens
// ne désabonnent personne par accident).
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

/** Met à jour un abonné en synchronisant statut (ancien système)
 *  et actif (nouveau système). Retente sans statut si la colonne
 *  n'existe pas encore dans la base. */
async function majAbonneAvecStatut(
  where: Record<string, any>,
  data: Record<string, any>
) {
  const client = prisma as ClientPrisma;
  const donnees = { ...data };
  if (data.actif !== undefined) {
    donnees.statut = data.actif === false ? "DESABONNE" : "ACTIF";
  }
  try {
    await client.abonneNewsletter.update({ where, data: donnees });
  } catch {
    const sansStatut: Record<string, any> = { ...donnees };
    delete sansStatut.statut;
    await client.abonneNewsletter.update({ where, data: sansStatut });
  }
}

async function confirmerDesabonnement(formData: FormData) {
  "use server";
  const token = String(formData.get("token") || "");
  const client = prisma as ClientPrisma;
  const abonne = await client.abonneNewsletter
    ?.findUnique({ where: { token } })
    .catch(() => null);
  if (abonne) {
    await majAbonneAvecStatut(
      { token },
      { actif: false, desabonneLe: new Date() }
    );
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
  let abonne: Abonne | null = null;
  let probleme = "";
  if (!client.abonneNewsletter) {
    probleme = "Le modèle AbonneNewsletter est absent du client Prisma.";
  } else {
    try {
      abonne = await client.abonneNewsletter.findUnique({ where: { token } });
    } catch (erreur: any) {
      probleme = erreur?.message || "Erreur de base de données.";
    }
  }

  const desynchronise = probleme.toLowerCase().includes("does not exist");

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="bg-slate-900 px-6 py-4">
        <p className="text-lg font-bold text-white">Webgiverse</p>
        <p className="text-xs text-slate-400">Newsletter</p>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center p-6">
        <div className="space-y-4 rounded-2xl border bg-white p-8 text-center shadow-sm">
          {probleme ? (
            <>
              <h1 className="text-xl font-bold text-gray-900">
                Newsletter momentanément indisponible
              </h1>
              <div className="rounded-lg border border-orange-300 bg-orange-50 p-3 text-left text-xs text-orange-900">
                <p className="font-semibold">La base de données n'est pas à jour.</p>
                {desynchronise && (
                  <p className="mt-1">
                    Sur votre machine : vérifiez que le modèle AbonneNewsletter dans
                    prisma/schema.prisma correspond exactement au fichier fourni (avec
                    le champ statut), puis exécutez « npx prisma format » et
                    « npx prisma db push ». Arrêtez ensuite le serveur, supprimez le
                    dossier .next et relancez « npm run dev ».
                  </p>
                )}
                <p className="mt-1 break-words text-orange-700">{probleme}</p>
              </div>
            </>
          ) : confirme ? (
            <>
              <h1 className="text-xl font-bold text-green-700">
                Vous êtes désabonné(e)
              </h1>
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
                className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
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
              <Link href="/" className="text-sm text-indigo-600 underline">
                Retour à l'accueil
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900">Se désabonner</h1>
              <p className="text-sm text-gray-500">
                E-mail concerné :{" "}
                <strong className="text-gray-900">{abonne.email}</strong>
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

      <footer className="bg-slate-900 py-4 text-center text-xs text-slate-400">
        Apprendre · Créer · Réussir
      </footer>
    </div>
  );
}