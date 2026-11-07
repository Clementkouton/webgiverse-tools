// app/tutoriels/[slug]/page.tsx
// Lot 31 — LA DESCRIPTION ET LES RESSOURCES SOUS LE CADRE DE NOTES,
// JAMAIS SILENCIEUSES :
//   1. Le cadre « Mes notes sur ce tutoriel » reste JUSTE SOUS la
//      progression (prise de note pendant la vidéo) ;
//   2. « Chapitres & ressources » (description YouTube raffinée) reste
//      AU-DESSOUS du cadre de notes — MAIS si la colonne
//      descriptionRaffinee est encore vide en base (import non fait),
//      une carte de repli lisible s'affiche À LA MÊME PLACE au lieu de
//      ne rien montrer : la zone ne disparaît plus, et dès que les
//      84 descriptions sont importées (script ou SQL du lot 28/31), le
//      vrai contenu remplace automatiquement le repli — sans toucher
//      au code ;
//   3. Anti-débordement conservé : break-words sur le titre, min-w-0
//      sur la colonne principale, protection des chapitres/liens/
//      paragraphes (ressources-tuto.tsx durci).
// Design strictement inchangé : mêmes cartes, mêmes couleurs, mêmes
// espacements que le Lot 30.
// Le reste est inchangé : tutoriels GRATUITS pour les membres connectés,
// écran d'invitation pour les visiteurs, progression gratuite, notes
// privées retrouvées dans Dashboard → Mes notes, vidéo YouTube embarquée.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronRight, ClipboardList, Clock, Crown, Eye, Gauge, Lock, LogIn, Play } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { premiumActif } from "@/lib/premium";
import { obtenirTuto, tutosSuivants } from "@/lib/queries";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/badge";
import { CarteTuto } from "@/components/tutoriels/carte-tuto";
import { BoutonProgression } from "@/components/tutoriels/bouton-progression";
import { BlocNotesTutoriel } from "@/components/tutoriels/bloc-notes-tutoriel";
import { RessourcesTuto } from "@/components/tutoriels/ressources-tuto";
import { PLANS } from "@/lib/plans";
import { LecteurYoutube } from "@/components/tutoriels/lecteur-youtube";
import { formaterDuree, urlMiniature, NIVEAUX } from "@/lib/tutos-utils";
import { parserDescriptionRaffinee } from "@/lib/description-youtube";

/**
 * Carte de repli — affichée UNIQUEMENT tant que la description YouTube
 * raffinée n'est pas encore en base pour ce tutoriel (import non fait).
 * Même style que « Chapitres & ressources » : la zone sous le cadre de
 * notes reste toujours occupée et explicite.
 */
function SectionDescriptionIndisponible() {
  return (
    <section
      aria-label="Description et ressources du tutoriel"
      className="mt-8 min-w-0 rounded-carte border border-bordure bg-white p-5 shadow-carte sm:p-6"
    >
      <h2 className="break-words font-titre text-[17px] leading-6 font-bold text-bleu">
        Description &amp; ressources
      </h2>
      <p className="mt-1 text-[13px] leading-5 text-encre">
        Les chapitres, les liens utiles et les points clés tirés de la
        description YouTube de cette vidéo n&apos;ont pas encore été importés.
        Ils apparaîtront automatiquement ici dès que l&apos;import sera fait —
        aucune modification de code n&apos;est nécessaire.
      </p>
    </section>
  );
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const tuto = await obtenirTuto(slug);
  return {
    title: tuto ? `${tuto.titre} — Tutoriels IA Webgiverse` : "Tutoriel introuvable",
    description: tuto
      ? `Tutoriel vidéo gratuit (${formaterDuree(tuto.dureeMin)}, niveau ${NIVEAUX[tuto.niveau].libelle.toLowerCase()}) : ${tuto.titre}.`
      : undefined,
  };
}

export default async function PageTuto({ params }: { params: Params }) {
  const { slug } = await params;
  const tuto = await obtenirTuto(slug);
  if (!tuto) notFound();

  // ── Contrôle d'accès (côté serveur) : LA CONNEXION SUFFIT ────────
  const session = await auth();
  const utilisateurId = session?.user?.id ?? null;
  const connecte = Boolean(utilisateurId);
  // Premium n'est plus exigé pour la lecture : il ne sert qu'à
  // personnaliser l'encart « passe Premium » de la colonne latérale.
  const premium = utilisateurId ? await premiumActif(utilisateurId) : false;

  // ── Progression personnelle sur ce tutoriel (gratuite) ──────────
  // Défensif : si la table ProgressionTuto n'existe pas encore
  // (db push absent), « AUCUN » sans erreur — la page reste affichable.
  let statutInitial: "AUCUN" | "EN_COURS" | "TERMINE" = "AUCUN";
  if (utilisateurId) {
    try {
      const progression = await prisma.progressionTuto.findUnique({
        where: { userId_tutoId: { userId: utilisateurId, tutoId: tuto.id } },
        select: { statut: true },
      });
      statutInitial = progression?.statut ?? "AUCUN";
    } catch {
      statutInitial = "AUCUN";
    }
  }

  // ── Note personnelle existante sur ce tutoriel ──────────────────
  // Lecture défensive : si le modèle NoteTutoriel n'est pas encore
  // dans le client Prisma (schéma pas à jour), on renvoie null sans
  // faire planter la page — le bloc-notes affichera la marche à suivre
  // au moment de l'enregistrement.
  let noteInitiale: string | null = null;
  if (utilisateurId) {
    try {
      const delegue = prisma as unknown as {
        noteTutoriel?: {
          findUnique: (args: {
            where: { userId_tutoId: { userId: string; tutoId: string } };
            select: { contenu: true };
          }) => Promise<{ contenu: string } | null>;
        };
      };
      const note = (await delegue.noteTutoriel?.findUnique({
        where: { userId_tutoId: { userId: utilisateurId, tutoId: tuto.id } },
        select: { contenu: true },
      })) ?? null;
      noteInitiale = note?.contenu ?? null;
    } catch {
      noteInitiale = null;
    }
  }

  const suivants = await tutosSuivants(tuto.id, tuto.outils);
  const niveau = NIVEAUX[tuto.niveau];
  const ajouteLeCourt = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(tuto.creeLe);

  return (
    <>
      {/* ── Fil d'Ariane ────────────────────────────────────────── */}
      <nav aria-label="Fil d'Ariane" className="mx-auto w-full max-w-7xl px-4 pt-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-[13px] leading-4 text-encre">
          <li><Link href="/" className="hover:text-sky-500">Accueil</Link></li>
          <li aria-hidden><ChevronRight className="size-3.5" /></li>
          <li><Link href="/tutoriels" className="hover:text-sky-500">Tutoriels</Link></li>
          <li aria-hidden><ChevronRight className="size-3.5" /></li>
          <li className="line-clamp-1 font-medium text-bleu">{tuto.titre}</li>
        </ol>
      </nav>

      <div className="mx-auto w-full max-w-7xl px-4 py-8">
        {/* ── Lecteur vidéo (3 états) ─────────────────────────────── */}
        <div className="relative aspect-video w-full overflow-hidden rounded-carte border border-bordure bg-bleu shadow-carte">
          {connecte && tuto.youtubeId ? (
            // Membre connecté + vidéo disponible : lecture intégrée
            // (lecteur officiel YouTube, écran de secours « Voir sur YouTube »).
            <LecteurYoutube
              youtubeId={tuto.youtubeId}
              titre={tuto.titre}
              miniature={urlMiniature(tuto)}
            />
          ) : connecte ? (
            // Membre connecté mais vidéo pas encore complétée par l'équipe.
            <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)]">
              <div className="px-6 text-center text-white">
                <Play className="mx-auto size-12" aria-hidden />
                <p className="mt-4 font-titre text-[18px] leading-6 font-semibold">
                  Vidéo en cours d&apos;ajout
                </p>
                <p className="mx-auto mt-2 max-w-sm text-[14px] leading-6 opacity-90">
                  Ce tutoriel est déjà référencé — sa vidéo sera disponible ici très bientôt.
                </p>
              </div>
            </div>
          ) : (
            // Visiteur non connecté : invitation (les tutoriels sont gratuits).
            <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)]">
              <div className="max-w-md px-6 py-8 text-center text-white">
                <Lock className="mx-auto size-10" aria-hidden />
                <h2 className="mt-4 font-titre text-[20px] leading-7 font-bold">
                  Connecte-toi pour suivre ce tutoriel
                </h2>
                <p className="mx-auto mt-2 text-[14px] leading-6 opacity-90">
                  Les tutoriels Webgiverse sont <strong>gratuits</strong> : crée un compte
                  (ou connecte-toi) pour regarder « {tuto.titre} » ici même, suivre ta
                  progression et prendre des notes.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <Bouton asChild variante="secondaire">
                    <Link href={`/connexion?suite=/tutoriels/${tuto.slug}`}>
                      <LogIn aria-hidden /> Me connecter
                    </Link>
                  </Bouton>
                  <Bouton asChild>
                    <Link href="/inscription">Créer un compte gratuit</Link>
                  </Bouton>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Titre + notes + description / fiche résumé ──────────── */}
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* min-w-0 : la colonne peut rétrécir, aucun texte ne déborde */}
          <div className="min-w-0">
            <h1 className="break-words font-titre text-[24px] leading-8 font-bold tracking-tight text-bleu sm:text-[28px] sm:leading-9">
              {tuto.titre}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variante={niveau.variante}>{niveau.libelle}</Badge>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-bordure bg-white px-3 py-1 text-[12px] leading-4 font-medium text-bleu">
                <Clock className="size-3.5" aria-hidden /> {formaterDuree(tuto.dureeMin)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-bordure bg-white px-3 py-1 text-[12px] leading-4 font-medium text-bleu">
                <Eye className="size-3.5" aria-hidden /> {tuto.vues.toLocaleString("fr-FR")} vues
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[12px] leading-4 font-semibold text-sky-600">
                Gratuit
              </span>
              {tuto.outils.slice(0, 4).map((o: string) => (
                <Link
                  key={o}
                  href={`/tutoriels?outil=${encodeURIComponent(o)}`}
                  className="rounded-full border border-violet/30 bg-violet/5 px-3 py-1 text-[12px] leading-4 font-medium text-violet transition hover:border-violet"
                >
                  #{o}
                </Link>
              ))}
            </div>

            {/* ── Progression personnelle — gratuite pour tous les
                membres connectés depuis les tutoriels gratuits ─── */}
            <div className="mt-4">
              <BoutonProgression
                tutoId={tuto.id}
                statutInitial={statutInitial}
                connecte={connecte}
                hrefConnexion={`/connexion?suite=/tutoriels/${tuto.slug}`}
              />
            </div>

            {/* ── NOTES PERSONNELLES (juste sous la progression) :
                prise de note pendant la vidéo, retrouvées dans
                Dashboard → Mes notes ───────────────────────────── */}
            <div className="mt-6">
              <BlocNotesTutoriel
                tutoId={tuto.id}
                noteInitiale={noteInitiale}
                connecte={connecte}
                hrefConnexion={`/connexion?suite=/tutoriels/${tuto.slug}`}
              />
            </div>

            {/* ── DESCRIPTION & RESSOURCES — AU-DESSOUS du cadre de
                notes : chapitres horodatés, ressources externes et
                paragraphes utiles tirés de la description YouTube.
                Tant que l'import n'est pas fait en base, une carte de
                repli occupe la place (jamais de trou silencieux). ── */}
            {(() => {
              const description = parserDescriptionRaffinee(tuto.descriptionRaffinee);
              return description ? (
                <RessourcesTuto description={description} />
              ) : (
                <SectionDescriptionIndisponible />
              );
            })()}
          </div>

          {/* ── Colonne latérale : fiche résumé (design tuiles) ────── */}
          <aside className="min-w-0 self-start lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-carte border border-bordure bg-white shadow-carte">
              <div className="border-b border-bordure bg-gris/60 px-5 py-4">
                <h2 className="flex items-center gap-2.5 font-titre text-[15px] leading-5 font-bold text-bleu">
                  <span className="grid size-8 place-items-center rounded-lg bg-violet/10 text-violet" aria-hidden>
                    <ClipboardList className="size-4" />
                  </span>
                  Ce tutoriel en résumé
                </h2>
              </div>
              <dl className="grid grid-cols-2 gap-2.5 p-5">
                {[
                  { icone: Gauge, label: "Niveau", contenu: <Badge variante={niveau.variante}>{niveau.libelle}</Badge> },
                  { icone: Clock, label: "Durée", contenu: <span className="font-titre text-[15px] leading-5 font-bold text-bleu">{formaterDuree(tuto.dureeMin)}</span> },
                  { icone: Eye, label: "Vues", contenu: <span className="font-titre text-[15px] leading-5 font-bold text-bleu">{tuto.vues.toLocaleString("fr-FR")}</span> },
                  { icone: CalendarDays, label: "Ajouté le", contenu: <span className="font-titre text-[13px] leading-5 font-bold text-bleu">{ajouteLeCourt}</span> },
                ].map(({ icone: Icone, label, contenu }) => (
                  <div key={label} className="min-w-0 rounded-champ border border-bordure bg-gris/50 p-3">
                    <dt className="flex items-center gap-1.5 text-[10.5px] leading-3.5 font-bold uppercase tracking-wider text-encre/70">
                      <Icone className="size-3.5 text-violet" aria-hidden /> {label}
                    </dt>
                    <dd className="mt-1.5">{contenu}</dd>
                  </div>
                ))}
              </dl>
              {!premium && (
                <div className="mx-5 mb-5 rounded-carte bg-[linear-gradient(135deg,#6a3bff,#0091c2)] p-px">
                  <div className="rounded-[15px] bg-white px-4 py-4">
                    <p className="flex items-start gap-2.5 text-[13px] leading-5 text-encre">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet/10 text-violet" aria-hidden>
                        <Crown className="size-4" />
                      </span>
                      <span>
                        Les tutoriels sont <strong className="text-bleu">gratuits</strong>. Pour
                        les favoris illimités, la bibliothèque complète de prompts et
                        l&apos;assistant IA sans quota : Premium dès{" "}
                        <strong className="text-bleu">{PLANS.PRO.prix}/mois</strong>.
                      </span>
                    </p>
                    <Bouton asChild taille="sm" className="mt-3 w-full">
                      <Link href="/tarifs">Voir les tarifs</Link>
                    </Bouton>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* ── À suivre ensuite ────────────────────────────────────── */}
        {suivants.length > 0 && (
          <section className="mt-10" aria-label="Tutoriels à suivre ensuite">
            <h2 className="font-titre text-[19px] leading-7 font-bold text-bleu">
              À suivre ensuite
            </h2>
            <p className="mt-1 text-[14px] leading-6 text-encre">
              D&apos;autres tutoriels autour du même outil, choisis par popularité.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {suivants.map((t: (typeof suivants)[number]) => (
                <CarteTuto key={t.id} tuto={t} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}