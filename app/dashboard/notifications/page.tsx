// app/dashboard/notifications/page.tsx
// Lot 20 — liste complète des notifications in-app (au-delà des 8
// dernières de la cloche). Tout marquer comme lu en un clic, chaque
// notification cliquable vers sa destination. Défensive : si la table
// Notification n'existe pas encore, la page s'affiche avec les
// instructions de mise à jour de la base.

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { dernieresNotifications } from "@/lib/notifications";
import { Carte } from "@/components/ui/carte";
import { BoutonToutLu } from "@/components/dashboard/bouton-tout-lu";

export const metadata: Metadata = { title: "Notifications — Webgiverse" };

export const dynamic = "force-dynamic";

const ICONES_TYPE: Record<string, string> = {
  tuto: "🎓",
  vote_avis: "👍",
  parrainage: "🤝",
  systeme: "🔔",
};

function dateCourte(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function PageNotifications() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Carte className="p-8 text-center">
          <p className="text-encre">Connecte-toi pour voir tes notifications.</p>
          <Link
            href="/connexion?suite=/dashboard/notifications"
            className="mt-4 inline-block font-semibold text-violet hover:underline"
          >
            Se connecter
          </Link>
        </Carte>
      </main>
    );
  }

  let notifications: any[] = [];
  let disponible = true;
  try {
    notifications = await dernieresNotifications(session.user.id, 60);
  } catch {
    disponible = false;
  }

  const nonLues = notifications.filter((n) => !n.lu).length;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-titre text-[22px] leading-7 font-bold text-bleu">Notifications</h1>
          <p className="mt-0.5 text-[13px] leading-4 text-encre">
            {disponible
              ? nonLues > 0
                ? `${nonLues} notification${nonLues > 1 ? "s" : ""} non lue${nonLues > 1 ? "s" : ""}.`
                : "Tu es à jour ✨"
              : "Base de données à mettre à jour (voir ci-dessous)."}
          </p>
        </div>
        {disponible && nonLues > 0 && <BoutonToutLu />}
      </div>

      {!disponible ? (
        <Carte className="mt-6 p-6">
          <p className="text-[14px] leading-6 text-encre">
            Le client Prisma ne connaît pas encore la table{" "}
            <code className="rounded bg-gris px-1">Notification</code>. Arrête le serveur puis lance :
          </p>
          <pre className="mt-3 overflow-x-auto rounded-champ bg-bleu p-3 text-[12px] leading-5 text-white">npx prisma db push
npx prisma generate</pre>
        </Carte>
      ) : notifications.length === 0 ? (
        <Carte className="mt-6 p-10 text-center">
          <p className="text-4xl">🔔</p>
          <p className="mt-3 font-semibold text-bleu">Aucune notification pour le moment</p>
          <p className="mt-1 text-[13px] leading-5 text-encre">
            Nouveaux tutoriels dans tes catégories, votes « Utile » sur tes avis,
            récompenses de parrainage… tout arrive ici.
          </p>
        </Carte>
      ) : (
        <ul className="mt-6 grid gap-2">
          {notifications.map((n) => {
            const corps = (
              <>
                <span aria-hidden className="mt-0.5 text-[18px] leading-6">
                  {ICONES_TYPE[n.type] ?? "🔔"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[14px] leading-5 font-semibold text-bleu">{n.titre}</span>
                    <span className="text-[11px] leading-4 text-encre/60">
                      {dateCourte(new Date(n.creeLe))}
                    </span>
                  </span>
                  {n.corps && (
                    <span className="mt-0.5 block text-[13px] leading-5 text-encre">{n.corps}</span>
                  )}
                </span>
                {!n.lu && (
                  <span aria-label="Non lue" className="mt-2 size-2 shrink-0 rounded-full bg-sky-500" />
                )}
              </>
            );
            return (
              <li key={n.id} className={n.lu ? "" : "rounded-carte bg-sky-500/5"}>
                {n.lien ? (
                  <Link
                    href={n.lien}
                    className="flex items-start gap-3 rounded-carte border border-bordure bg-white px-4 py-3.5 shadow-carte transition hover:border-violet"
                  >
                    {corps}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 rounded-carte border border-bordure bg-white px-4 py-3.5 shadow-carte">
                    {corps}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
