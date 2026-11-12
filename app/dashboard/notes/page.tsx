// app/dashboard/notes/page.tsx
// Lot 30 — « MES NOTES » RESPONSIVE sur toutes les tailles d'écran
// (même comportement que /dashboard/prompts) :
//   • Chaque note s'empile proprement sur mobile : miniature pleine
//     largeur 16:9, titre + niveau + durée, boutons d'action, puis le
//     contenu de la note — plus aucune carte coupée au bord droit ;
//   • Sur desktop : même rangée qu'avant (miniature, titre, actions,
//     note en dessous) ;
//   • min-w-0 sur toute la chaîne + break-words sur le contenu : les
//     notes longues ou les URL collées ne débordent plus jamais.
// Les notes restent accompagnées du tutoriel suivi (miniature, titre
// cliquable, niveau, durée, date de mise à jour) et les lectures
// défensives sont conservées (encadré orange au lieu de planter si la
// base n'est pas à jour).
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronLeft,
  Clock,
  MonitorPlay,
  NotebookPen,
  Play,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/badge";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import { supprimerNoteFormulaire } from "@/app/actions/notes";
import { formaterDuree, urlMiniature, NIVEAUX } from "@/lib/tutos-utils";

export const metadata: Metadata = { title: "Mes notes — Webgiverse" };
export const dynamic = "force-dynamic";

type NoteTuto = {
  id: string;
  contenu: string;
  creeLe: Date;
  majLe: Date;
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

export default async function PageMesNotes() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?suite=/dashboard/notes");
  const userId = session.user.id;

  // ── Lecture défensive des notes ─────────────────────────────────
  let notes: NoteTuto[] = [];
  let probleme: "base" | "client" | null = null;
  try {
    const delegue = prisma as unknown as {
      noteTutoriel?: {
        findMany: (args: {
          where: { userId: string };
          orderBy: { majLe: "desc" };
          select: Record<string, boolean | object>;
        }) => Promise<NoteTuto[]>;
      };
    };
    if (!delegue.noteTutoriel?.findMany) {
      probleme = "client";
    } else {
      notes = await delegue.noteTutoriel.findMany({
        where: { userId },
        orderBy: { majLe: "desc" },
        select: {
          id: true,
          contenu: true,
          creeLe: true,
          majLe: true,
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
      });
    }
  } catch (erreur) {
    const code = (erreur as { code?: string } | null)?.code ?? "";
    probleme = code === "P2021" || code === "P2022" ? "base" : "client";
    console.error("[dashboard/notes] Lecture impossible :", erreur);
  }

  const formateurDate = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-8 lg:py-10">
      <Link
        href="/dashboard"
        className="inline-flex min-h-9 items-center gap-1 text-[13px] leading-4 font-semibold text-encre transition hover:text-violet"
      >
        <ChevronLeft className="size-4" aria-hidden /> Tableau de bord
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-h2 font-semibold">
          <NotebookPen className="size-7 shrink-0 text-violet" aria-hidden /> Mes notes
        </h1>
        <Bouton asChild variante="secondaire">
          <Link href="/tutoriels">Tous les tutoriels</Link>
        </Bouton>
      </div>

      {/* ── Résumé (carte dégradée de marque) ─────────────────────── */}
      <Carte className="mt-6 overflow-hidden border-0 bg-[linear-gradient(110deg,#0b1b3f_0%,#4326a8_55%,#6a3bff_100%)] p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] leading-4 font-semibold text-white/70">
              Ton carnet de notes
            </p>
            <p className="mt-1 break-words font-titre text-[22px] leading-7 font-bold">
              {notes.length} note{notes.length > 1 ? "s" : ""} prise
              {notes.length > 1 ? "s" : ""}
              {notes.length > 0 && <span className="text-white/70"> pendant tes tutoriels</span>}
            </p>
            {notes.length > 0 && (
              <p className="mt-1 text-[13px] leading-5 text-white/75">
                Chaque note reste liée à son tutoriel : rouvre la vidéo pour la compléter.
              </p>
            )}
          </div>
          <NotebookPen className="size-10 shrink-0 text-white/60" aria-hidden />
        </div>
      </Carte>

      {/* ── Encadré d'installation (base ou client Prisma) ────────── */}
      {probleme && (
        <div className="mt-6 flex items-start gap-2 rounded-carte border border-amber-300 bg-amber-50 p-4 text-[13px] leading-5 text-encre">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
          <span>
            {probleme === "base"
              ? "La table des notes n'existe pas encore : lance « npx prisma db push » dans le terminal du projet, puis recharge la page."
              : "Le client Prisma ne connaît pas encore le modèle NoteTutoriel : arrête le serveur (Ctrl+C), lance « npx prisma db push » puis « npx prisma generate », et relance « npm run dev »."}
          </span>
        </div>
      )}

      {/* ── État vide ─────────────────────────────────────────────── */}
      {!probleme && notes.length === 0 && (
        <Carte className="mt-6 p-10 text-center">
          <NotebookPen className="mx-auto size-10 text-violet" aria-hidden />
          <h2 className="mt-3 font-titre text-[18px] leading-6 font-semibold text-bleu">
            Aucune note pour l&apos;instant
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-encre">
            Ouvre un tutoriel (gratuit) et écris ce que tu retiens dans le bloc
            « Mes notes sur ce tutoriel », sous la vidéo : ta note apparaîtra ici,
            accompagnée du tutoriel suivi.
          </p>
          <Bouton asChild className="mt-5">
            <Link href="/tutoriels">Découvrir les tutoriels</Link>
          </Bouton>
        </Carte>
      )}

      {/* ── Liste des notes ───────────────────────────────────────── */}
      {notes.length > 0 && (
        <section className="mt-8" aria-label="Notes prises pendant les tutoriels">
          <h2 className="flex items-center gap-2 font-titre text-[17px] leading-6 font-semibold text-bleu">
            <NotebookPen className="size-4.5 shrink-0 text-violet" aria-hidden /> Tes notes ({notes.length})
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {notes.map((note) => {
              const t = note.tuto;
              const miniature = urlMiniature(t);
              return (
                // min-w-0 : la carte ne peut jamais forcer la page à déborder
                <li
                  key={note.id}
                  className="min-w-0 rounded-carte border border-bordure bg-white p-3.5 shadow-carte"
                >
                  {/* Rangée du tutoriel associé : empilée sur mobile,
                      horizontale sur desktop */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Link
                      href={`/tutoriels/${t.slug}`}
                      className="relative block aspect-video w-full shrink-0 overflow-hidden rounded-carte border border-bordure bg-bleu sm:w-28"
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
                        <span className="inline-flex items-center gap-1 text-[12px] leading-4 text-encre">
                          <MonitorPlay className="size-3.5" aria-hidden /> Tutoriel suivi
                        </span>
                        <span className="text-[12px] leading-4 text-encre/70">
                          mise à jour le {formateurDate.format(new Date(note.majLe))}
                        </span>
                      </div>
                    </div>

                    {/* Actions : ouvrir la vidéo + supprimer la note */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Bouton asChild variante="secondaire" taille="sm">
                        <Link href={`/tutoriels/${t.slug}`}>Reprendre</Link>
                      </Bouton>
                      <form action={supprimerNoteFormulaire}>
                        <input type="hidden" name="tutoId" value={t.id} />
                        <BoutonConfirmer
                          message={`Supprimer ta note sur « ${t.titre} » ?`}
                          aria-label={`Supprimer la note sur ${t.titre}`}
                          className="grid size-9 place-items-center rounded-[7px] -skew-x-[18deg] border border-bordure bg-white text-encre transition hover:border-red-300 hover:text-red-500 active:scale-95"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </BoutonConfirmer>
                      </form>
                    </div>
                  </div>

                  {/* Contenu de la note — break-words : même une URL très
                      longue collée dans la note ne déborde plus */}
                  <p className="mt-3 break-words whitespace-pre-wrap rounded-champ border border-bordure bg-gris/40 p-3 text-[13.5px] leading-6 text-encre">
                    {note.contenu}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}