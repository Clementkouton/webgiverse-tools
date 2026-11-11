// app/tutoriels/[slug]/page.tsx
// Lot 35 — ACCÈS PAR ABONNEMENT sur la page du tutoriel (grille réelle
// dans lib/acces-tutoriels.ts, verrouillage CÔTÉ SERVEUR) :
//   · Vidéo Débutant → membre connecté (offert) ;
//   · Vidéo Intermédiaire / Avancé → abonnés Premium (Pro / Entreprise) ;
//   · Chapitres & ressources, progression, notes et assistant IA
//     du tutoriel → réservés aux abonnés Premium, avec des cadres
//     verrouillés clairs (même charte) + bouton « Tarifs » ;
//   · L'assistant IA du tutoriel s'affiche SOUS le cadre de notes,
//     AU-DESSUS de « Chapitres & ressources ».
//   · Lot 65 — l'historique du chat de l'assistant est relu côté
//     serveur depuis la table MessageChatTutoriel (même principe que
//     noteInitiale) et transmis au composant : la conversation
//     réapparaît après actualisation de la page.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock,
  Crown,
  Eye,
  Gauge,
  Lock,
  LogIn,
  Play,
  Sparkles,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  accesTutoriels,
  peutRegarderTuto,
  tutoNiveauPremium,
} from "@/lib/acces-tutoriels";
import { obtenirTuto, tutosSuivants } from "@/lib/queries";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/badge";
import { CarteTuto } from "@/components/tutoriels/carte-tuto";
import { BoutonProgression } from "@/components/tutoriels/bouton-progression";
import { BlocNotesTutoriel } from "@/components/tutoriels/bloc-notes-tutoriel";
import { ChatTutoriel } from "@/components/tutoriels/chat-tutoriel";
import { RessourcesTuto } from "@/components/tutoriels/ressources-tuto";
import { PLANS } from "@/lib/plans";
import { LecteurYoutube } from "@/components/tutoriels/lecteur-youtube";
import { formaterDuree, urlMiniature, NIVEAUX } from "@/lib/tutos-utils";
import { parserDescriptionRaffinee } from "@/lib/description-youtube";
import { cn } from "@/lib/utils";

/**
 * Carte de repli (Premium connecté) — la description raffinée n'est pas
 * encore importée en base pour ce tutoriel : la zone reste occupée.
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

/**
 * Cadre verrouillé (Découverte / visiteur) — même vocabulaire visuel que
 * les cartes de la page : tuile icône violette, badge « Premium », texte
 * explicite et bouton vers /tarifs. Le contenu n'est JAMAIS rendu dessous.
 */
function CadreVerrouille({
  titre,
  className,
  children,
}: {
  titre: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={`${titre} — réservé aux abonnés Premium`}
      className={cn(
        "min-w-0 rounded-carte border border-bordure bg-white p-5 shadow-carte",
        className,
      )}
    >
      <p className="flex flex-wrap items-center gap-2.5 font-titre text-[15px] leading-5 font-bold text-bleu">
        <span
          className="grid size-8 place-items-center rounded-lg bg-violet/10 text-violet"
          aria-hidden
        >
          <Crown className="size-4" />
        </span>
        {titre}
        <span className="inline-flex items-center gap-1 rounded-full bg-violet/10 px-2 py-0.5 text-[10px] leading-3.5 font-bold text-violet">
          Premium
        </span>
      </p>
      <div className="mt-2 text-[13px] leading-5 text-encre">{children}</div>
      <Bouton asChild taille="sm" className="mt-3">
        <Link href="/tarifs">
          <Sparkles aria-hidden /> Débloquer avec Premium
        </Link>
      </Bouton>
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
      ? `Tutoriel vidéo (${formaterDuree(tuto.dureeMin)}, niveau ${NIVEAUX[tuto.niveau].libelle.toLowerCase()}) : ${tuto.titre}.`
      : undefined,
  };
}

export default async function PageTuto({ params }: { params: Params }) {
  const { slug } = await params;
  const tuto = await obtenirTuto(slug);
  if (!tuto) notFound();

  // ── Contrôle d'accès (côté serveur, grille lib/acces-tutoriels.ts) ─
  const session = await auth();
  const utilisateurId = session?.user?.id ?? null;
  const connecte = Boolean(utilisateurId);
  const acces = await accesTutoriels(utilisateurId);
  const premium = acces.premium;

  // La vidéo : Débutant = connecté · Inter/Avancé = Premium.
  const lectureAutorisee = peutRegarderTuto({
    niveau: tuto.niveau,
    connecte,
    premium,
  });
  const tutoPayant = tutoNiveauPremium(tuto.niveau);

  // ── Progression personnelle (Premium) — lecture défensive ────────
  let statutInitial: "AUCUN" | "EN_COURS" | "TERMINE" = "AUCUN";
  if (utilisateurId && acces.peut("progression")) {
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

  // ── Note personnelle existante (Premium) — lecture défensive ─────
  let noteInitiale: string | null = null;
  if (utilisateurId && acces.peut("notes")) {
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

  // ── Historique du chat de l'assistant (Lot 65) — lecture défensive ─
  // Même principe que la note personnelle : les 50 derniers messages
  // de CE membre sur CE tutoriel sont relus en base (table
  // MessageChatTutoriel) puis transmis au composant client. Si la
  // table n'existe pas encore (migration oubliée) ou que Neon échoue,
  // on démarre avec un fil vide — jamais d'erreur bloquante.
  let historiqueChat: { role: "user" | "assistant"; contenu: string }[] = [];
  if (utilisateurId && acces.peut("assistantTuto")) {
    try {
      const messagesBdd = await prisma.messageChatTutoriel.findMany({
        where: { userId: utilisateurId, tutoId: tuto.id },
        orderBy: { creeLe: "desc" },
        take: 50,
        select: { role: true, contenu: true },
      });
      historiqueChat = messagesBdd
        .reverse()
        .map((m) => ({
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          contenu: m.contenu,
        }));
    } catch {
      historiqueChat = [];
    }
  }

  // Description raffinée (affichage Premium ET compte du cadre verrouillé
  // — les TITRES ne fuient jamais vers les non-abonnés).
  const description = parserDescriptionRaffinee(tuto.descriptionRaffinee);

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
        {/* ── Lecteur vidéo (4 états) ─────────────────────────────── */}
        <div className="relative aspect-video w-full overflow-hidden rounded-carte border border-bordure bg-bleu shadow-carte">
          {lectureAutorisee && tuto.youtubeId ? (
            // Autorisé + vidéo disponible : lecture intégrée.
            <LecteurYoutube
              youtubeId={tuto.youtubeId}
              titre={tuto.titre}
              miniature={urlMiniature(tuto)}
            />
          ) : connecte && tutoPayant && !premium ? (
            // Membre connecté mais niveau Intermédiaire/Avancé sans abonnement.
            <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)]">
              <div className="max-w-md px-6 py-8 text-center text-white">
                <Lock className="mx-auto size-10" aria-hidden />
                <h2 className="mt-4 font-titre text-[20px] leading-7 font-bold">
                  Réservé aux abonnés Premium
                </h2>
                <p className="mx-auto mt-2 text-[14px] leading-6 opacity-90">
                  Les tutoriels <strong>Intermédiaires</strong> et{" "}
                  <strong>Avancés</strong> sont inclus dans les plans Pro et
                  Entreprise. Passe Premium pour regarder « {tuto.titre} »
                  ici même, avec les notes, les ressources et l&apos;assistant IA.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <Bouton asChild variante="secondaire">
                    <Link href="/tarifs">
                      <Sparkles aria-hidden /> Passer Premium
                    </Link>
                  </Bouton>
                </div>
              </div>
            </div>
          ) : connecte ? (
            // Membre autorisé (Débutant) mais vidéo pas encore complétée.
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
            // Visiteur non connecté : invitation (texte selon le niveau).
            <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)]">
              <div className="max-w-md px-6 py-8 text-center text-white">
                <Lock className="mx-auto size-10" aria-hidden />
                <h2 className="mt-4 font-titre text-[20px] leading-7 font-bold">
                  {tutoPayant
                    ? "Tutoriel réservé aux abonnés Premium"
                    : "Connecte-toi pour suivre ce tutoriel"}
                </h2>
                <p className="mx-auto mt-2 text-[14px] leading-6 opacity-90">
                  {tutoPayant
                    ? `« ${tuto.titre} » est un tutoriel ${niveau.libelle.toLowerCase()} inclus dans les plans Pro et Entreprise. Connecte-toi, puis passe Premium pour le regarder ici même.`
                    : `Les tutoriels Débutant sont offerts : crée un compte (ou connecte-toi) pour regarder « ${tuto.titre} » ici même.`}
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

        {/* ── Titre + notes + assistant + description / fiche résumé ─ */}
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
              {tutoPayant ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet/30 bg-violet/10 px-3 py-1 text-[12px] leading-4 font-semibold text-violet">
                  <Crown className="size-3.5" aria-hidden /> Premium
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[12px] leading-4 font-semibold text-sky-600">
                  Gratuit
                </span>
              )}
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

            {/* ── PROGRESSION — Premium uniquement ─────────────────── */}
            {acces.peut("progression") ? (
              <div className="mt-4">
                <BoutonProgression
                  tutoId={tuto.id}
                  statutInitial={statutInitial}
                  connecte={connecte}
                  premium={premium}
                  hrefConnexion={`/connexion?suite=/tutoriels/${tuto.slug}`}
                />
              </div>
            ) : (
              <CadreVerrouille titre="Suivre ma progression" className="mt-4">
                Marque ce tutoriel « En cours » ou « Terminé » et retrouve
                ton avancée dans ton espace, rubrique Mes tutoriels. Le suivi
                de progression est inclus dans les plans Pro et Entreprise.
              </CadreVerrouille>
            )}

            {/* ── NOTES PERSONNELLES — Premium uniquement ──────────── */}
            {acces.peut("notes") ? (
              <div className="mt-6">
                <BlocNotesTutoriel
                  tutoId={tuto.id}
                  tutoTitre={tuto.titre}
                  noteInitiale={noteInitiale}
                  connecte={connecte}
                  premium={premium}
                  hrefConnexion={`/connexion?suite=/tutoriels/${tuto.slug}`}
                />
              </div>
            ) : (
              <CadreVerrouille titre="Mes notes sur ce tutoriel" className="mt-6">
                Prends des notes privées pendant la vidéo, exporte-les en
                Markdown, TXT ou PDF et retrouve-les dans ton espace, rubrique
                Mes notes. Inclus dans les plans Pro et Entreprise.
              </CadreVerrouille>
            )}



            {/* ── DESCRIPTION & RESSOURCES — Premium uniquement ────── */}
            {acces.peut("descriptionRessources") ? (
              description ? (
                <RessourcesTuto description={description} />
              ) : (
                <SectionDescriptionIndisponible />
              )
            ) : (
              <CadreVerrouille titre="Chapitres & ressources" className="mt-8">
                {description
                  ? `Ce tutoriel comprend ${description.chapitres.length} chapitre${description.chapitres.length > 1 ? "s" : ""} horodaté${description.chapitres.length > 1 ? "s" : ""}, ${description.ressources.length} ressource${description.ressources.length > 1 ? "s" : ""} et des points clés tirés de la description de la vidéo. Débloque-les avec Premium.`
                  : "Les chapitres horodatés, les liens utiles et les points clés de ce tutoriel sont réservés aux abonnés Premium (Pro ou Entreprise)."}
              </CadreVerrouille>
            )}
          </div>

          {/* ── Colonne latérale : fiche résumé (design tuiles) ────── */}
          <aside className="min-w-0 self-start lg:sticky lg:top-24">
            <div className="flex flex-col gap-6">
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
                          Les tutoriels <strong className="text-bleu">Débutant</strong> sont
                          offerts. Passe Premium dès{" "}
                          <strong className="text-bleu">{PLANS.PRO.prix}/mois</strong> pour
                          débloquer les niveaux Intermédiaire et Avancé, les
                          chapitres &amp; ressources, les notes avec export, la
                          progression et l&apos;assistant IA des tutoriels.
                        </span>
                      </p>
                      <Bouton asChild taille="sm" className="mt-3 w-full">
                        <Link href="/tarifs">Voir les tarifs</Link>
                      </Bouton>
                    </div>
                  </div>
                )}
              </div>
              
              {/* ── ASSISTANT IA DU TUTORIEL — Premium uniquement ────── */}
              {acces.peut("assistantTuto") ? (
                <div className="mt-3">
                  <ChatTutoriel
                    slug={tuto.slug}
                    titre={tuto.titre}
                  />
                </div>
              ) : (
                <CadreVerrouille titre="Assistant IA du tutoriel" className="mt-3">
                  Pose tes questions sur ce tutoriel, demande un résumé ou un
                  plan d&apos;apprentissage : l&apos;assistant répond à partir du
                  contenu de la vidéo et de sa description. Inclus dans les
                  plans Pro et Entreprise.
                </CadreVerrouille>
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