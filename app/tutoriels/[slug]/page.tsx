// app/tutoriels/[slug]/page.tsx
// Lot 12 — page de lecture d'un tutoriel vidéo. La vidéo YouTube est
// embarquée (iframe youtube-nocookie) : l'utilisateur regarde le tuto
// SANS quitter Webgiverse. L'accès à la lecture est réservé aux
// utilisateurs connectés avec un abonnement Premium ACTIF (Pro ou
// Entreprise) — contrôle fait côté serveur via lib/premium.ts, l'iframe
// n'est tout simplement pas rendue pour les autres.
// La liste des tutoriels reste publique (vitrine), comme sur Aixploria.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock, Crown, Eye, Lock, LogIn, Play, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as Premium from "@/lib/premium";
import { obtenirTuto, tutosSuivants } from "@/lib/queries";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/badge";
import { CarteTuto } from "@/components/tutoriels/carte-tuto";
import { BoutonProgression } from "@/components/tutoriels/bouton-progression";
import { PLANS } from "@/lib/plans";
import { LecteurYoutube } from "@/components/tutoriels/lecteur-youtube";
import { formaterDuree, urlMiniature, NIVEAUX } from "@/lib/tutos-utils";


type Params = Promise<{ slug: string }>;

async function verifierPremiumActif(utilisateurId: string): Promise<boolean> {
  const exports = Premium as unknown as Record<string, unknown>;
  const verifier = Object.entries(exports).find(
    ([nom, valeur]) =>
      typeof valeur === "function" &&
      /premium/i.test(nom) &&
      /(actif|active|abonne|abonnement)/i.test(nom),
  )?.[1];

  return typeof verifier === "function"
    ? Boolean(await (verifier as (id: string) => Promise<boolean> | boolean)(utilisateurId))
    : false;
}

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
  const premium = utilisateurId ? await verifierPremiumActif(utilisateurId) : false;
  // Lot 19 — progression personnelle sur ce tutoriel (défensif : table
  // ProgressionTuto absente avant db push → « AUCUN » sans erreur)
  const prismaProgression = (prisma as any).progressionTuto;
  let statutInitial: "AUCUN" | "EN_COURS" | "TERMINE" = "AUCUN";
  if (utilisateurId && prismaProgression?.findUnique) {
    const progression = await prismaProgression
      .findUnique({
        where: { userId_tutoId: { userId: utilisateurId, tutoId: tuto.id } },
        select: { statut: true },
      })
      .catch(() => null);
    statutInitial = progression?.statut ?? "AUCUN";
  }
  const suivants = await tutosSuivants(tuto.id, tuto.outils);
  const niveau = NIVEAUX[tuto.niveau];
  const ajouteLe = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(tuto.creeLe);

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

      <div className="mx-auto w-full max-w-7xl px-4 py-8 ">
        {/* ── Colonne principale : lecteur + titre ────────────────── */}
        <div>
          <div className="relative aspect-video w-full overflow-hidden rounded-carte border border-bordure bg-bleu shadow-carte">
            {premium && tuto.youtubeId ? (
              // Lecture intégrée (Lot 13) : lecteur officiel YouTube avec
              // détection d'erreurs + écran de secours « Voir sur YouTube ».
              // L'utilisateur ne quitte jamais le site quand la vidéo est lisible.
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
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-10">
            <div className="space-y-2">
              {/* ── Titre + méta ─────────────────────────────────────── */}
              <h1 className="mt-5 font-titre text-[24px] leading-8 font-bold tracking-tight text-bleu sm:text-[28px] sm:leading-9">
                {tuto.titre}
              </h1>
              <div className="mt-3 flex flex-wrap items-center ">
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

              {/* ── Progression personnelle (Lot 19) ─────────────────── */}
              <div className="mt-4">
                <BoutonProgression
                  tutoId={tuto.id}
                  statutInitial={statutInitial}
                  connecte={connecte}
                  hrefConnexion={`/connexion?suite=/tutoriels/${tuto.slug}`}
                />
              </div>
            </div>
            {/* ── Colonne latérale : fiche résumé ─────────────────────── */}
            <aside className="space-y-4">
              <div className="rounded-carte border border-bordure bg-white p-5 shadow-carte">
                <h2 className="font-titre text-[15px] leading-5 font-semibold text-bleu">
                  Ce tutoriel en résumé
                </h2>
                <dl className="mt-3 space-y-3 text-[14px] leading-5">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-encre">Niveau</dt>
                    <dd><Badge variante={niveau.variante}>{niveau.libelle}</Badge></dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-encre">Durée</dt>
                    <dd className="font-medium text-bleu">{formaterDuree(tuto.dureeMin)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-encre">Vues</dt>
                    <dd className="font-medium text-bleu">{tuto.vues.toLocaleString("fr-FR")}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-encre">Ajouté le</dt>
                    <dd className="font-medium text-bleu">{ajouteLe}</dd>
                  </div>
                </dl>
                {!premium && (
                  <div className="mt-4 rounded-carte border border-sky-500/30 bg-sky-500/5 p-3">
                    <p className="flex items-start gap-2 text-[13px] leading-5 text-encre">
                      <Crown className="mt-0.5 size-4 shrink-0 text-sky-500" aria-hidden />
                      <span>
                        L&apos;abonnement <strong className="text-bleu">{PLANS.PRO.prix}/mois</strong> débloque
                        tous les tutoriels + les favoris illimités et l&apos;assistant IA sans quota.
                      </span>
                    </p>
                    <Bouton asChild taille="sm" className="mt-3 w-full">
                      <Link href="/tarifs">Voir les tarifs</Link>
                    </Bouton>
                  </div>
                )}
              </div>
            </aside>
          </div>


        </div>

      </div>

      {/* ── À suivre ensuite ──────────────────────────────────────── */}
      {suivants.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 pb-12 lg:pb-16">
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
    </>
  );
}