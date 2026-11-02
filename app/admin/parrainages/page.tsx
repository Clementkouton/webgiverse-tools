// app/admin/parrainages/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 23 — GESTION & CONTRÔLE des parrainages (console admin) :
//   • 4 tuiles : parrainages totaux, mois offerts versés, en attente,
//     inscrits ce mois-ci (pastilles pastel « TailwindAdmin ») ;
//   • filtres : Tous / En attente / Récompensés / Annulés (chips) ;
//   • tableau parrain → filleul avec statut, dates et actions de
//     contrôle : verser le mois offert manuellement (si le webhook a
//     raté), annuler un lien suspect, réactiver, supprimer.
// Défensif : si la table Parrainage n'est pas encore installée
// (`npx prisma db push`), une bannière explique quoi faire au lieu de
// planter la console.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarClock,
  Gift,
  Handshake,
  Hourglass,
  PartyPopper,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import { EtatVideAdmin } from "@/components/admin/etat-vide-admin";
import { PASTILLE_TUILE, type Ton } from "@/components/admin/carte-stat-admin";
import {
  annulerParrainageFormulaire,
  reactiverParrainageFormulaire,
  supprimerParrainageFormulaire,
  verserRecompenseFormulaire,
} from "@/app/actions/parrainages";

export const metadata: Metadata = { title: "Parrainages — Administration" };
export const dynamic = "force-dynamic";

const PASTILLE_STATUT: Record<string, string> = {
  EN_ATTENTE: "bg-adm-alerte-doux text-[#b26f00]",
  RECOMPENSE: "bg-adm-succes-doux text-[#0f9b85]",
  ANNULE: "bg-gris text-encre",
};
const LIBELLE_STATUT: Record<string, string> = {
  EN_ATTENTE: "En attente",
  RECOMPENSE: "🎁 Mois versé",
  ANNULE: "Annulé",
};

const Filtres = [
  { cle: "tous", libelle: "Tous" },
  { cle: "EN_ATTENTE", libelle: "En attente" },
  { cle: "RECOMPENSE", libelle: "Récompensés" },
  { cle: "ANNULE", libelle: "Annulés" },
] as const;

const formateur = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

/** Mini fiche membre (avatar initiale + nom + e-mail) cliquable. */
function Membre({
  id,
  nom,
  email,
  fort,
}: {
  id: string;
  nom: string | null;
  email: string;
  fort?: boolean;
}) {
  return (
    <Link
      href={`/admin/utilisateurs/${id}`}
      className="group flex min-w-0 items-center gap-2.5"
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-bold",
          fort ? "bg-primaire/15 text-primaire-texte" : "bg-gris text-encre",
        )}
        aria-hidden
      >
        {(nom ?? email).trim().charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] leading-4 font-semibold text-adm-sombre group-hover:text-primaire-texte">
          {nom?.trim() || "Membre"}
        </span>
        <span className="block truncate text-[12px] leading-4 text-adm-gris">{email}</span>
      </span>
    </Link>
  );
}

export default async function PageParrainagesAdmin({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string }>;
}) {
  const { filtre } = await searchParams;
  const filtreActif = Filtres.some((f) => f.cle === filtre) ? filtre! : "tous";

  const delegue = (prisma as any).parrainage;
  const installe = Boolean(delegue?.findMany);

  // Début du mois courant (tuile « inscrits ce mois-ci »)
  const debutMois = new Date();
  debutMois.setDate(1);
  debutMois.setHours(0, 0, 0, 0);

  let total = 0;
  let recompenses = 0;
  let enAttente = 0;
  let ceMois = 0;
  let liens: {
    id: string;
    statut: string;
    creeLe: Date;
    recompenseLe: Date | null;
    parrain: { id: string; name: string | null; email: string };
    filleul: { id: string; name: string | null; email: string };
  }[] = [];

  if (installe) {
    const [t, r, a, m, liste] = await Promise.all([
      delegue.count().catch(() => 0),
      delegue.count({ where: { statut: "RECOMPENSE" } }).catch(() => 0),
      delegue.count({ where: { statut: "EN_ATTENTE" } }).catch(() => 0),
      delegue.count({ where: { creeLe: { gte: debutMois } } }).catch(() => 0),
      delegue
        .findMany({
          where: filtreActif === "tous" ? {} : { statut: filtreActif },
          include: {
            parrain: { select: { id: true, name: true, email: true } },
            filleul: { select: { id: true, name: true, email: true } },
          },
          orderBy: { creeLe: "desc" },
          take: 300,
        })
        .catch(() => []),
    ]);
    total = t;
    recompenses = r;
    enAttente = a;
    ceMois = m;
    liens = liste;
  }

  const TUILES: { libelle: string; valeur: number; icone: typeof Gift; ton: Ton }[] = [
    { libelle: "Parrainages totaux", valeur: total, icone: Handshake, ton: "primaire" },
    { libelle: "Mois offerts versés", valeur: recompenses, icone: PartyPopper, ton: "succes" },
    { libelle: "En attente d'abonnement", valeur: enAttente, icone: Hourglass, ton: "alerte" },
    { libelle: "Inscrits ce mois-ci", valeur: ceMois, icone: CalendarClock, ton: "info" },
  ];

  return (
    <div>
      <div className="animate-apparition-haut">
        <h1 className="text-h3 font-semibold">Parrainages</h1>
        <p className="mt-1 text-[14px] leading-6 text-encre">
          Programme « 1 mois offert » : suis chaque lien parrain → filleul et garde la main
          sur les récompenses (versement manuel, annulation anti-fraude).
        </p>
      </div>

      {/* ── Tuiles de statistiques ──────────────────────────────────── */}
      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TUILES.map((t, i) => (
          <Carte
            key={t.libelle}
            className="animate-apparition-haut flex items-center gap-4 p-5"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", PASTILLE_TUILE[t.ton])}>
              <t.icone className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-titre text-[24px] leading-8 font-bold text-adm-sombre">{t.valeur}</span>
              <span className="block truncate text-[13px] leading-4 font-semibold text-adm-gris">{t.libelle}</span>
            </span>
          </Carte>
        ))}
      </section>

      {/* ── Table pas encore installée ──────────────────────────────── */}
      {!installe && (
        <p
          role="alert"
          className="animate-apparition-haut mt-5 rounded-carte border border-adm-alerte/40 bg-adm-alerte-doux px-4 py-3 text-[14px] leading-5 font-semibold text-[#b26f00]"
        >
          Table « Parrainage » pas encore installée : lance <code>npx prisma db push</code>{" "}
          puis redémarre le serveur pour activer le programme.
        </p>
      )}

      {/* ── Filtres ─────────────────────────────────────────────────── */}
      <div className="animate-apparition-haut delai-1 mt-6 flex flex-wrap items-center gap-2">
        {Filtres.map((f) => {
          const actif = f.cle === filtreActif;
          return (
            <Link
              key={f.cle}
              href={f.cle === "tous" ? "/admin/parrainages" : `/admin/parrainages?filtre=${f.cle}`}
              aria-current={actif ? "true" : undefined}
              className={cn(
                "inline-flex items-center rounded-full px-3.5 py-1.5 text-[13px] leading-4 font-semibold transition",
                actif
                  ? "bg-primaire text-white shadow-[0_2px_10px_rgba(93,135,255,0.35)]"
                  : "border border-adm-bordure bg-white text-adm-gris hover:border-primaire/40 hover:text-primaire-texte",
              )}
            >
              {f.libelle}
            </Link>
          );
        })}
      </div>

      {/* ── Tableau des parrainages ─────────────────────────────────── */}
      <Carte className="animate-apparition-haut delai-2 mt-4 overflow-x-auto p-0">
        <table className="w-full min-w-220 text-[14px] leading-5">
          <thead className="text-left text-legende text-encre">
            <tr>
              <th className="px-5 py-3">Parrain</th>
              <th className="px-3 py-3">Filleul</th>
              <th className="px-3 py-3">Statut</th>
              <th className="px-3 py-3">Inscrit le</th>
              <th className="px-3 py-3">Récompensé le</th>
              <th className="px-5 py-3 text-right">Contrôle</th>
            </tr>
          </thead>
          <tbody>
            {liens.map((lien) => (
              <tr key={lien.id} className="border-t border-bordure transition hover:bg-adm-fond/70">
                <td className="px-5 py-3.5">
                  <Membre id={lien.parrain.id} nom={lien.parrain.name} email={lien.parrain.email} fort />
                </td>
                <td className="px-3 py-3.5">
                  <Membre id={lien.filleul.id} nom={lien.filleul.name} email={lien.filleul.email} />
                </td>
                <td className="px-3 py-3.5">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-0.5 text-[12px] leading-4 font-semibold",
                      PASTILLE_STATUT[lien.statut] ?? PASTILLE_STATUT.ANNULE,
                    )}
                  >
                    {LIBELLE_STATUT[lien.statut] ?? lien.statut}
                  </span>
                </td>
                <td className="px-3 py-3.5 text-encre">{formateur.format(lien.creeLe)}</td>
                <td className="px-3 py-3.5 text-encre">
                  {lien.recompenseLe ? formateur.format(lien.recompenseLe) : "—"}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {lien.statut === "EN_ATTENTE" && (
                      <>
                        <form action={verserRecompenseFormulaire}>
                          <input type="hidden" name="parrainageId" value={lien.id} />
                          <Bouton type="submit" variante="indigoDoux" taille="sm" className="min-h-9 px-3 text-[13px]">
                            <Gift className="size-4" aria-hidden /> Verser le mois
                          </Bouton>
                        </form>
                        <form action={annulerParrainageFormulaire}>
                          <input type="hidden" name="parrainageId" value={lien.id} />
                          <button
                            type="submit"
                            className="inline-flex min-h-9 items-center rounded-full border border-adm-bordure bg-white px-3 text-[13px] leading-4 font-semibold text-adm-gris transition hover:border-adm-erreur/50 hover:text-[#c94f35]"
                          >
                            Annuler le lien
                          </button>
                        </form>
                      </>
                    )}
                    {lien.statut === "ANNULE" && (
                      <form action={reactiverParrainageFormulaire}>
                        <input type="hidden" name="parrainageId" value={lien.id} />
                        <Bouton type="submit" variante="indigoDoux" taille="sm" className="min-h-9 px-3 text-[13px]">
                          Réactiver
                        </Bouton>
                      </form>
                    )}
                    {lien.statut !== "RECOMPENSE" && (
                      <form action={supprimerParrainageFormulaire}>
                        <input type="hidden" name="parrainageId" value={lien.id} />
                        <BoutonConfirmer
                          message="Supprimer définitivement ce parrainage ? Le parrain ne recevra jamais de récompense pour ce filleul."
                          type="submit"
                          className="inline-flex min-h-9 items-center justify-center rounded-full border border-red-300 bg-white px-3 text-[13px] leading-4 font-semibold text-red-700 transition hover:bg-red-50"
                        >
                          Supprimer
                        </BoutonConfirmer>
                      </form>
                    )}
                    {lien.statut === "RECOMPENSE" && (
                      <span className="text-[12px] leading-4 text-adm-gris-clair">Rien à faire 🎉</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {installe && liens.length === 0 && (
              <tr>
                <td colSpan={6} className="p-0">
                  <EtatVideAdmin
                    icone={Handshake}
                    ton="primaire"
                    titre={filtreActif === "tous" ? "Aucun parrainage pour l'instant" : "Aucun parrainage dans ce filtre"}
                    description={
                      filtreActif === "tous"
                        ? "Les inscriptions via un lien ?ref=… apparaîtront ici automatiquement."
                        : "Change de filtre pour voir les autres parrainages."
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Carte>

      <p className="animate-apparition-haut delai-3 mt-4 flex items-start gap-2 text-[13px] leading-5 text-adm-gris">
        <Gift className="mt-0.5 size-4 shrink-0 text-primaire" aria-hidden />
        Rappel : la récompense est versée AUTOMATIQUEMENT quand un filleul souscrit un abonnement
        payant (webhook Chariow). Les boutons ci-dessus ne servent qu'en cas de contrôle manuel.
      </p>
    </div>
  );
}