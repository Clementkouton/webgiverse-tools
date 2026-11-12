// app/dashboard/parrainage/page.tsx
// Lot 20 — 🤝 Programme de parrainage : « 1 mois offert ».
//   • Le membre récupère SON lien https://…/inscription?ref=<son id>
//     (bouton copier) et le partage.
//   • Un filleul qui s'inscrit avec ce lien crée un parrainage
//     « en attente » ; quand il souscrit un abonnement payant, le
//     parrain reçoit automatiquement 1 mois offert (extension de son
//     accès) + une notification.
// Page serveur : statistiques + liste des filleuls, défensive si la
// table Parrainage n'existe pas encore (db push à faire).

import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { statsParrainage } from "@/lib/parrainage";
import { Carte } from "@/components/ui/carte";
import { BoutonCopierLien } from "@/components/dashboard/bouton-copier-lien";
import { Gift, Handshake, Hourglass, PartyPopper } from "lucide-react";

export const metadata: Metadata = { title: "Parrainage — Webgiverse" };

export const dynamic = "force-dynamic";

const formateurDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export default async function PageParrainage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Carte className="p-8 text-center">
          <p className="text-encre">Connecte-toi pour accéder à ton lien de parrainage.</p>
          <Link
            href="/connexion?suite=/dashboard/parrainage"
            className="mt-4 inline-block font-semibold text-violet hover:underline"
          >
            Se connecter
          </Link>
        </Carte>
      </main>
    );
  }

  // URL du site (production : webgiverse-tools.vercel.app, local : localhost…)
  const entetes = await headers();
  const hote = entetes.get("x-forwarded-host") ?? entetes.get("host") ?? "webgiverse-tools.vercel.app";
  const protocole = hote.startsWith("localhost") || hote.startsWith("127.0.0.1") ? "http" : "https";
  const lienParrainage = `${protocole}://${hote}/inscription?ref=${session.user.id}`;

  const stats = await statsParrainage(session.user.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 lg:py-10">
      {/* ── En-tête ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-carte bg-[linear-gradient(110deg,#0b1b3f_0%,#4326a8_55%,#6a3bff_100%)] p-6 text-white sm:p-8">
        <div aria-hidden className="animate-flottant pointer-events-none absolute -right-12 -top-12 size-44 rounded-[7px] -skew-x-[18deg] not-italic bg-ciel/20 blur-3xl" />
        <p className="relative flex items-center gap-2 text-legende text-white/70">
          <Handshake className="size-4 text-ciel" aria-hidden /> Programme de parrainage
        </p>
        <h1 className="relative mt-2 font-titre text-[22px] leading-7 font-bold sm:text-[26px] sm:leading-8">
          1 mois offert pour chaque filleul Premium 🎁
        </h1>
        <p className="relative mt-2 max-w-xl text-[14px] leading-6 text-white/80">
          Partage ton lien : quand quelqu'un crée son compte avec, il est lié à toi.
          Dès qu'il souscrit un abonnement Premium, ton propre accès est prolongé
          de 30 jours automatiquement.
        </p>
      </div>

      {/* ── Ton lien ────────────────────────────────────────────── */}
      <Carte className="animate-apparition-haut mt-6 p-6">
        <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">Ton lien de parrainage</h2>
        <p className="mt-0.5 mb-4 text-[13px] leading-4 text-encre">
          Envoie-le à tes amis, colle-le dans tes groupes, tes newsletters… Le
          compte créé avec ce lien sera ton filleul pour toujours.
        </p>
        <BoutonCopierLien lien={lienParrainage} />
      </Carte>

      {/* ── Statistiques ────────────────────────────────────────── */}
      <section aria-label="Tes statistiques de parrainage" className="mt-6 grid gap-4 sm:grid-cols-3">
        <Carte className="animate-apparition-haut delai-1 p-5">
          <p className="flex items-center gap-1.5 text-[12px] leading-4 font-bold uppercase tracking-wide text-encre/70">
            <Gift className="size-3.5 text-violet" aria-hidden /> Filleuls inscrits
          </p>
          <p className="mt-2 font-titre text-[26px] leading-8 font-bold text-bleu">{stats.total}</p>
        </Carte>
        <Carte className="animate-apparition-haut delai-2 p-5">
          <p className="flex items-center gap-1.5 text-[12px] leading-4 font-bold uppercase tracking-wide text-encre/70">
            <PartyPopper className="size-3.5 text-emerald-600" aria-hidden /> Mois offerts gagnés
          </p>
          <p className="mt-2 font-titre text-[26px] leading-8 font-bold text-bleu">{stats.recompenses}</p>
        </Carte>
        <Carte className="animate-apparition-haut delai-3 p-5">
          <p className="flex items-center gap-1.5 text-[12px] leading-4 font-bold uppercase tracking-wide text-encre/70">
            <Hourglass className="size-3.5 text-amber-600" aria-hidden /> En attente d'abonnement
          </p>
          <p className="mt-2 font-titre text-[26px] leading-8 font-bold text-bleu">{stats.enAttente}</p>
        </Carte>
      </section>

      {/* ── Comment ça marche ──────────────────────────────────── */}
      <Carte className="mt-6 p-6">
        <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">Comment ça marche ?</h2>
        <ol className="mt-3 grid gap-2 text-[13px] leading-5 text-encre">
          {[
            "Tu copies ton lien ci-dessus et tu le partages.",
            "Ton ami crée son compte GRATUIT via le lien — il apparaît dans « Filleuls inscrits ».",
            "Il souscrit un abonnement Premium (Pro ou Entreprise).",
            "Boom 🎉 : ton accès est prolongé de 30 jours, sans rien faire, et tu reçois une notification.",
          ].map((etape, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-[7px] -skew-x-[18deg] not-italic bg-[linear-gradient(120deg,#6a3bff,#00d1ff)] text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <span>{etape}</span>
            </li>
          ))}
        </ol>
      </Carte>

      {/* ── Liste des filleuls ─────────────────────────────────── */}
      <Carte className="mt-6 p-6">
        <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">Tes filleuls</h2>
        {stats.filleuls.length === 0 ? (
          <p className="mt-3 text-[13px] leading-5 text-encre">
            Aucun filleul pour l'instant. Partage ton lien pour commencer 🚀
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {stats.filleuls.map((f, i) => (
              <li
                key={`${f.nom}-${i}`}
                className="flex flex-wrap items-center gap-2 rounded-champ border border-bordure bg-white px-3 py-2.5"
              >
                <span className="min-w-0 flex-1 truncate text-[13px] leading-4 font-semibold text-bleu">
                  {f.nom}
                </span>
                <span className="text-[11px] leading-4 text-encre/60">
                  Inscrit le {formateurDate.format(f.creeLe)}
                </span>
                <span
                  className={`rounded-[7px] -skew-x-[18deg] not-italic px-2 py-0.5 text-[11px] leading-4 font-bold ${
                    f.statut === "RECOMPENSE"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {f.statut === "RECOMPENSE" ? "🎁 1 mois offert versé" : "En attente d'abonnement"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Carte>
    </main>
  );
}
