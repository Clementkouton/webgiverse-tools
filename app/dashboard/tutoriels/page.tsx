// app/dashboard/tutoriels/page.tsx
// Lot 19 — « Mes tutoriels » : la progression de l'utilisateur dans la
// collection vidéo (en cours / terminés), avec une barre de progression
// globale. Même vocabulaire visuel que le reste du dashboard Metis.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronLeft,
  CheckCircle2,
  CircleDashed,
  Clock,
  MonitorPlay,
  Play,
  Trash2,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/badge";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import { majProgressionFormulaire } from "@/app/actions/apprentissage";
import { formaterDuree, urlMiniature, NIVEAUX } from "@/lib/tutos-utils";

export const metadata: Metadata = { title: "Mes tutoriels — Webgiverse" };
export const dynamic = "force-dynamic";

type Progression = {
  id: string;
  statut: "EN_COURS" | "TERMINE";
  tuto: {
    id: string;
    slug: string;
    titre: string;
    miniature: string | null;
    youtubeId: string | null;
    dureeMin: number;
    niveau: keyof typeof NIVEAUX;
  };
};

export default async function PageMesTutoriels() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?suite=/dashboard/tutoriels");
  const userId = session.user.id;

  // Lectures défensives (tables absentes avant db push → état vide)
  let progressions: Progression[] = [];
  let totalTutos = 0;
  try {
    [progressions, totalTutos] = await Promise.all([
      prisma.progressionTuto.findMany({
        where: { userId },
        orderBy: { majLe: "desc" },
        select: {
          id: true,
          statut: true,
          tuto: {
            select: {
              id: true,
              slug: true,
              titre: true,
              miniature: true,
              youtubeId: true,
              dureeMin: true,
              niveau: true,
            },
          },
        },
      }) as unknown as Promise<Progression[]>,
      prisma.tuto.count(),
    ]);
  } catch {
    progressions = [];
    totalTutos = 0;
  }

  const enCours = progressions.filter((p) => p.statut === "EN_COURS");
  const termines = progressions.filter((p) => p.statut === "TERMINE");
  const pourcentage = totalTutos > 0 ? Math.round((termines.length / totalTutos) * 100) : 0;

  /** Ligne d'un tutoriel (partagée par les sections en cours / terminés). */
  function LigneTuto({ progression }: { progression: Progression }) {
    const t = progression.tuto;
    const miniature = urlMiniature(t);
    return (
      <li className="flex items-center gap-4 rounded-carte border border-bordure bg-white p-3.5 shadow-carte">
        {/* Miniature cliquable */}
        <Link
          href={`/tutoriels/${t.slug}`}
          className="relative block aspect-video w-28 shrink-0 overflow-hidden rounded-carte border border-bordure bg-bleu"
          aria-label={`Ouvrir le tutoriel ${t.titre}`}
        >
          {miniature ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={miniature} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <span className="grid size-full place-items-center text-white">
              <Play className="size-5" aria-hidden />
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-titre text-[15px] leading-5 font-semibold text-bleu">
            <Link href={`/tutoriels/${t.slug}`} className="transition hover:text-violet">
              {t.titre}
            </Link>
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge variante={NIVEAUX[t.niveau].variante}>{NIVEAUX[t.niveau].libelle}</Badge>
            <span className="inline-flex items-center gap-1 text-[12px] leading-4 text-encre">
              <Clock className="size-3.5" aria-hidden /> {formaterDuree(t.dureeMin)}
            </span>
            {progression.statut === "TERMINE" ? (
              <span className="inline-flex items-center gap-1 text-[12px] leading-4 font-semibold text-sky-500">
                <CheckCircle2 className="size-3.5" aria-hidden /> Terminé
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[12px] leading-4 font-semibold text-violet">
                <CircleDashed className="size-3.5" aria-hidden /> En cours
              </span>
            )}
          </div>
        </div>

        {/* Changement de statut rapide + retrait */}
        <div className="flex shrink-0 items-center gap-1.5">
          {progression.statut !== "TERMINE" && (
            <form action={majProgressionFormulaire}>
              <input type="hidden" name="tutoId" value={t.id} />
              <input type="hidden" name="statut" value="TERMINE" />
              <button
                type="submit"
                title="Marquer comme terminé"
                aria-label={`Marquer ${t.titre} comme terminé`}
                className="grid size-9 place-items-center rounded-full border border-bordure bg-white text-encre transition hover:border-sky-500/40 hover:text-sky-500 active:scale-95"
              >
                <CheckCircle2 className="size-4" aria-hidden />
              </button>
            </form>
          )}
          {progression.statut !== "EN_COURS" && (
            <form action={majProgressionFormulaire}>
              <input type="hidden" name="tutoId" value={t.id} />
              <input type="hidden" name="statut" value="EN_COURS" />
              <button
                type="submit"
                title="Reprendre / marquer en cours"
                aria-label={`Marquer ${t.titre} comme en cours`}
                className="grid size-9 place-items-center rounded-full border border-bordure bg-white text-encre transition hover:border-violet hover:text-violet active:scale-95"
              >
                <CircleDashed className="size-4" aria-hidden />
              </button>
            </form>
          )}
          <form action={majProgressionFormulaire}>
            <input type="hidden" name="tutoId" value={t.id} />
            <input type="hidden" name="statut" value="AUCUN" />
            <BoutonConfirmer
              message={`Retirer « ${t.titre} » de ta progression ?`}
              aria-label={`Retirer ${t.titre} de la progression`}
              className="grid size-9 place-items-center rounded-full border border-bordure bg-white text-encre transition hover:border-red-300 hover:text-red-500 active:scale-95"
            >
              <Trash2 className="size-4" aria-hidden />
            </BoutonConfirmer>
          </form>
        </div>
      </li>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:py-10">
      <Link
        href="/dashboard"
        className="inline-flex min-h-9 items-center gap-1 text-[13px] leading-4 font-semibold text-encre transition hover:text-violet"
      >
        <ChevronLeft className="size-4" aria-hidden /> Tableau de bord
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-h2 font-semibold">
          <MonitorPlay className="size-7 text-violet" aria-hidden /> Mes tutoriels
        </h1>
        <Bouton asChild variante="secondaire">
          <Link href="/tutoriels">Tous les tutoriels</Link>
        </Bouton>
      </div>

      {/* ── Résumé de progression (carte dégradée de marque) ──────── */}
      <Carte className="mt-6 overflow-hidden border-0 bg-[linear-gradient(110deg,#0b1b3f_0%,#4326a8_55%,#6a3bff_100%)] p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] leading-4 font-semibold text-white/70">
              Ta progression dans la collection
            </p>
            <p className="mt-1 font-titre text-[22px] leading-7 font-bold">
              {termines.length} tutoriel{termines.length > 1 ? "s" : ""} terminé
              {termines.length > 1 ? "s" : ""}
              {totalTutos > 0 && <span className="text-white/70"> sur {totalTutos} disponibles</span>}
            </p>
            {enCours.length > 0 && (
              <p className="mt-1 text-[13px] leading-5 text-white/75">
                {enCours.length} tutoriel{enCours.length > 1 ? "s" : ""} en cours de visionnage.
              </p>
            )}
          </div>
          <p className="font-titre text-[34px] leading-10 font-bold">{pourcentage}%</p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
          <div
            className="barre-progression h-full rounded-full bg-[linear-gradient(90deg,#00d1ff,#00e5c6)]"
            style={{ width: `${pourcentage}%` }}
          />
        </div>
      </Carte>

      {/* ── État vide ─────────────────────────────────────────────── */}
      {progressions.length === 0 && (
        <Carte className="mt-6 p-10 text-center">
          <MonitorPlay className="mx-auto size-10 text-violet" aria-hidden />
          <h2 className="mt-3 font-titre text-[18px] leading-6 font-semibold text-bleu">
            Aucune progression enregistrée
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-encre">
            Ouvre un tutoriel vidéo et clique sur « En cours » ou « Terminé » :
            ta progression apparaîtra ici, avec une reprise en un clic.
          </p>
          <Bouton asChild className="mt-5">
            <Link href="/tutoriels">Découvrir les tutoriels</Link>
          </Bouton>
        </Carte>
      )}

      {/* ── En cours ──────────────────────────────────────────────── */}
      {enCours.length > 0 && (
        <section className="mt-8" aria-label="Tutoriels en cours">
          <h2 className="flex items-center gap-2 font-titre text-[17px] leading-6 font-semibold text-bleu">
            <CircleDashed className="size-4.5 text-violet" aria-hidden /> En cours ({enCours.length})
          </h2>
          <ul className="mt-3 grid gap-3">
            {enCours.map((p) => (
              <LigneTuto key={p.id} progression={p} />
            ))}
          </ul>
        </section>
      )}

      {/* ── Terminés ──────────────────────────────────────────────── */}
      {termines.length > 0 && (
        <section className="mt-8" aria-label="Tutoriels terminés">
          <h2 className="flex items-center gap-2 font-titre text-[17px] leading-6 font-semibold text-bleu">
            <CheckCircle2 className="size-4.5 text-sky-500" aria-hidden /> Terminés ({termines.length})
          </h2>
          <ul className="mt-3 grid gap-3">
            {termines.map((p) => (
              <LigneTuto key={p.id} progression={p} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}