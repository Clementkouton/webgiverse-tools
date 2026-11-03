// app/tutoriels/[slug]/page.tsx
// Lot 12 + Lot 19 (correctif) — page de lecture d'un tutoriel vidéo.
// ⚠ CE FICHIER AVAIT ÉTÉ SUPPRIMÉ PAR ACCIDENT lors du push du Lot 19 :
//   sans lui, chaque carte tutoriel menait à une 404 et le bouton
//   « Ma progression » (En cours / Terminé) n'existait plus nulle part.
// La vidéo YouTube est embarquée (iframe youtube-nocookie) : l'utilisateur
// regarde le tuto SANS quitter Webgiverse. L'accès à la lecture est
// réservé aux utilisateurs connectés avec un abonnement Premium ACTIF
// (Pro ou Entreprise) — contrôle côté serveur via lib/premium.ts, l'iframe
// n'est tout simplement pas rendue pour les autres.
// La liste des tutoriels reste publique (vitrine), comme sur Aixploria.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronRight, ClipboardList, Clock, Crown, Eye, Gauge, Lock, LogIn, Play, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { premiumActif } from "@/lib/premium";
import { obtenirTuto, tutosSuivants } from "@/lib/queries";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/badge";
import { CarteTuto } from "@/components/tutoriels/carte-tuto";
import { BoutonProgression } from "@/components/tutoriels/bouton-progression";
import { RessourcesTuto } from "@/components/tutoriels/ressources-tuto";
import { PLANS } from "@/lib/plans";
import { LecteurYoutube } from "@/components/tutoriels/lecteur-youtube";
import { formaterDuree, urlMiniature, NIVEAUX } from "@/lib/tutos-utils";
import { parserDescriptionRaffinee } from "@/lib/description-youtube";

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

  // ── Contrôle d'accès (côté serveur) ──────────────────────────────
  const session = await auth();
  const utilisateurId = session?.user?.id ?? null;
  const connecte = Boolean(utilisateurId);
  const premium = utilisateurId ? await premiumActif(utilisateurId) : false;

  // Lot 19 — progression personnelle sur ce tutoriel. Défensif : si la
  // table ProgressionTuto n'existe pas encore (db push absent), « AUCUN »
  // sans erreur — la page reste affichable.
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
          {premium && tuto.youtubeId ? (
            // Lecture intégrée (Lot 13) : lecteur officiel YouTube avec
            // détection d'erreurs + écran de secours « Voir sur YouTube ».
            <LecteurYoutube
              youtubeId={tuto.youtubeId}
              titre={tuto.titre}
              miniature={urlMiniature(tuto)}
            />
          ) : premium ? (
            // Premium connecté mais vidéo pas encore complétée par l'équipe.
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
            // Écran de contrôle d'accès (non connecté OU sans abonnement actif).
            <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)]">
              <div className="max-w-md px-6 py-8 text-center text-white">
                <Lock className="mx-auto size-10" aria-hidden />
                <h2 className="mt-4 font-titre text-[20px] leading-7 font-bold">
                  {connecte ? "Réservé aux abonnés Premium" : "Connecte-toi pour suivre ce tutoriel"}
                </h2>
                <p className="mx-auto mt-2 text-[14px] leading-6 opacity-90">
                  {connecte
                    ? `Les tutoriels vidéo sont inclus dans les plans Pro et Entreprise. Passe Premium pour regarder « ${tuto.titre} » ici même.`
                    : "La collection se parcours librement, mais la lecture des vidéos est réservée aux abonnés Premium (Pro ou Entreprise)."}
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  {connecte ? (
                    <Bouton asChild variante="secondaire">
                      <Link href="/tarifs">
                        <Sparkles aria-hidden /> Passer Premium
                      </Link>
                    </Bouton>
                  ) : (
                    <>
                      <Bouton asChild variante="secondaire">
                        <Link href={`/connexion?suite=/tutoriels/${tuto.slug}`}>
                          <LogIn aria-hidden /> Me connecter
                        </Link>
                      </Bouton>
                      <Bouton asChild>
                        <Link href="/inscription">Créer un compte gratuit</Link>
                      </Bouton>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Titre + progression / fiche résumé ──────────────────── */}
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <h1 className="font-titre text-[24px] leading-8 font-bold tracking-tight text-bleu sm:text-[28px] sm:leading-9">
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

            {/* ── Progression personnelle (Lot 19) — réservée aux
                abonnés Premium actifs depuis le Lot 28 ────────── */}
            <div className="mt-4">
              <BoutonProgression
                tutoId={tuto.id}
                statutInitial={statutInitial}
                connecte={connecte}
                premium={premium}
                hrefConnexion={`/connexion?suite=/tutoriels/${tuto.slug}`}
              />
            </div>

            {/* ── Chapitres & ressources (Lot 28) : description
                YouTube raffinée, juste sous la progression ───── */}
            {(() => {
              const description = parserDescriptionRaffinee(tuto.descriptionRaffinee);
              return description ? <RessourcesTuto description={description} /> : null;
            })()}
          </div>

          {/* ── Colonne latérale : fiche résumé (design tuiles) ────── */}
          <aside className="self-start lg:sticky lg:top-24">
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
                  <div key={label} className="rounded-champ border border-bordure bg-gris/50 p-3">
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
                        Pour <strong className="text-bleu">{PLANS.PRO.prix}/mois</strong> : tous les
                        tutoriels, les favoris illimités et l&apos;assistant IA sans quota.
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