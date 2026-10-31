// app/prompts/[slug]/page.tsx
// Lot 17 — page de détail d'un prompt. La page reste accessible à
// TOUS (vitrine : titre, description, catégorie, métiers, conseils),
// mais le CONTENU COMPLET du prompt et la copie sont réservés aux
// utilisateurs connectés avec un abonnement Premium ACTIF (Pro ou
// Entreprise) — contrôle fait côté serveur via lib/premium.ts.
// Le bloc n'affiche qu'un extrait tronqué ET flouté pour les autres :
// le prompt complet n'est jamais envoyé au navigateur d'un non-abonné.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Crown,
  Eye,
  ListChecks,
  Lock,
  TerminalSquare,
  Variable,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as Premium from "@/lib/premium";
import { obtenirPrompt, promptsSimilaires } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Bouton } from "@/components/ui/bouton";
import { CartePrompt } from "@/components/prompts/carte-prompt";
import { BlocContenuPrompt, ActionsPrompt } from "@/components/prompts/bloc-contenu-prompt";
import { BoutonFavoriPrompt } from "@/components/prompts/bouton-favori-prompt";
import { PLANS } from "@/lib/plans";
import { LIBELLES_TYPE, MODELES_PAR_TYPE, nomRole } from "@/lib/prompts-utils";

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
  const prompt = await obtenirPrompt(slug);
  return {
    title: prompt
      ? `${prompt.emoji} ${prompt.titre} — Prompt IA | Webgiverse`
      : "Prompt introuvable",
    description: prompt?.description,
  };
}

export default async function PagePrompt({ params }: { params: Params }) {
  const { slug } = await params;
  const prompt = await obtenirPrompt(slug);
  if (!prompt) notFound();

  // ── Contrôle d'accès (côté serveur) ──────────────────────────────
  const session = await auth();
  const utilisateurId = session?.user?.id ?? null;
  const connecte = Boolean(utilisateurId);
  const premium = utilisateurId ? await verifierPremiumActif(utilisateurId) : false;
  // Lot 19 — le prompt est-il déjà sauvegardé par cet utilisateur ?
  // (défensif : si la table PromptFavori n'existe pas encore, on renvoie false)
  const prismaPromptFavori = (prisma as any).promptFavori;
  let favoriInitial = false;
  if (utilisateurId && prismaPromptFavori?.findUnique) {
    const favoriExistant = await prismaPromptFavori
      .findUnique({
        where: { userId_promptId: { userId: utilisateurId, promptId: prompt.id } },
        select: { id: true },
      })
      .catch(() => null);
    favoriInitial = Boolean(favoriExistant);
  }

  const similaires = await promptsSimilaires(prompt.id, prompt.categorieId);
  const modeles = prompt.modeles.length
    ? prompt.modeles
    : (MODELES_PAR_TYPE[prompt.type] ?? []);
  const ajouteLe = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(prompt.creeLe);

  return (
    <>
      {/* ── Fil d'Ariane ────────────────────────────────────────── */}
      <nav aria-label="Fil d'Ariane" className="mx-auto w-full max-w-7xl px-4 pt-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-[13px] leading-4 text-encre">
          <li><Link href="/" className="hover:text-sky-500">Accueil</Link></li>
          <li aria-hidden><ChevronRight className="size-3.5" /></li>
          <li><Link href="/prompts" className="hover:text-sky-500">Prompts</Link></li>
          <li aria-hidden><ChevronRight className="size-3.5" /></li>
          <li>
            <Link href={`/prompts/categorie/${prompt.categorie.slug}`} className="hover:text-sky-500">
              {prompt.categorie.nom}
            </Link>
          </li>
          <li aria-hidden><ChevronRight className="size-3.5" /></li>
          <li className="line-clamp-1 max-w-105 font-medium text-bleu">{prompt.titre}</li>
        </ol>
      </nav>

      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-10">
        {/* ── Colonne principale : titre + contenu ────────────────── */}
        <div>
          <h1 className="flex items-start gap-3 font-titre text-[24px] leading-8 font-bold tracking-tight text-bleu sm:text-[28px] sm:leading-9">
            <span aria-hidden className="text-[26px] leading-9 sm:text-[30px]">{prompt.emoji}</span>
            <span>{prompt.titre}</span>
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={`/prompts/categorie/${prompt.categorie.slug}`}
              className="rounded-full border border-sky-500/30 bg-sky-500/5 px-3 py-1 text-[12px] leading-4 font-semibold text-sky-500 transition hover:border-sky-500"
            >
              {prompt.categorie.nom}
            </Link>
            {prompt.sousCategorie && (
              <Badge variante="defaut">{prompt.sousCategorie}</Badge>
            )}
            <Badge variante="defaut">{LIBELLES_TYPE[prompt.type] ?? "Texte"}</Badge>
            <BoutonFavoriPrompt
              promptId={prompt.id}
              favoriInitial={favoriInitial}
              connecte={connecte}
              hrefConnexion={`/connexion?suite=/prompts/${prompt.slug}`}
            />
            {prompt.roles.map((r: string) => (
              <Link
                key={r}
                href={`/prompts/roles/${encodeURIComponent(r)}`}
                className="rounded-full border border-bordure bg-white px-3 py-1 text-[12px] leading-4 font-medium text-bleu transition hover:border-sky-500 hover:text-sky-500"
              >
                {nomRole(r)}
              </Link>
            ))}
          </div>

          <p className="mt-4 max-w-3xl text-[15px] leading-7 text-encre">{prompt.description}</p>

          {/* ── Contenu du prompt (gating Premium) ────────────────── */}
          <section aria-label="Contenu du prompt" className="mt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-titre text-[17px] leading-6 font-semibold text-bleu">
                <TerminalSquare className="size-4.5 text-sky-500" aria-hidden /> Le prompt
              </h2>
              <ActionsPrompt contenu={prompt.contenu} premium={premium} />
            </div>
            <BlocContenuPrompt
              contenu={prompt.contenu}
              premium={premium}
              connecte={connecte}
              slug={prompt.slug}
            />
          </section>

          {/* ── Comment l'utiliser ────────────────────────────────── */}
          {prompt.utilisation && (
            <section aria-label="Comment utiliser ce prompt" className="mt-8 rounded-carte border border-bordure bg-white p-5 shadow-carte sm:p-6">
              <h2 className="flex items-center gap-2 font-titre text-[17px] leading-6 font-semibold text-bleu">
                <Variable className="size-4.5 text-sky-500" aria-hidden /> Comment l&apos;utiliser
              </h2>
              <p className="mt-3 whitespace-pre-line text-[14px] leading-6 text-encre">
                {prompt.utilisation}
              </p>
            </section>
          )}

          {/* ── Conseils ──────────────────────────────────────────── */}
          {prompt.conseils && (
            <section aria-label="Conseils d'utilisation" className="mt-4 rounded-carte border border-bordure bg-white p-5 shadow-carte sm:p-6">
              <h2 className="flex items-center gap-2 font-titre text-[17px] leading-6 font-semibold text-bleu">
                <ListChecks className="size-4.5 text-sky-500" aria-hidden /> Conseils pour de meilleurs résultats
              </h2>
              <p className="mt-3 whitespace-pre-line text-[14px] leading-6 text-encre">
                {prompt.conseils}
              </p>
            </section>
          )}
        </div>

        {/* ── Colonne latérale : fiche résumé ─────────────────────── */}
        <aside className="space-y-4">
          <div className="rounded-carte border border-bordure bg-white p-5 shadow-carte">
            <h2 className="font-titre text-[15px] leading-5 font-semibold text-bleu">
              Ce prompt en résumé
            </h2>
            <dl className="mt-3 space-y-3 text-[14px] leading-5">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-encre">Catégorie</dt>
                <dd className="font-medium text-bleu">{prompt.categorie.nom}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-encre">Type</dt>
                <dd className="font-medium text-bleu">{LIBELLES_TYPE[prompt.type] ?? "Texte"}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-encre">Compatibilité</dt>
                <dd className="flex flex-wrap justify-end gap-1.5">
                  {modeles.map((m: string) => (
                    <Badge key={m} variante="defaut">{m}</Badge>
                  ))}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-encre">Vues</dt>
                <dd className="font-medium text-bleu">{prompt.vues.toLocaleString("fr-FR")}</dd>
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
                    la copie de tous les prompts + les tutoriels vidéo et l&apos;assistant IA sans quota.
                  </span>
                </p>
                <Bouton asChild taille="sm" className="mt-3 w-full">
                  <Link href="/tarifs">Voir les tarifs</Link>
                </Bouton>
              </div>
            )}
            {!premium && (
              <p className="mt-3 flex items-start gap-2 text-[12px] leading-5 text-encre/80">
                <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>Les variables {"{{entre accolades}}"} se remplacent avec tes propres informations.</span>
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* ── À essayer aussi ───────────────────────────────────────── */}
      {similaires.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 pb-12 lg:pb-16">
          <h2 className="font-titre text-[19px] leading-7 font-bold text-bleu">
            À essayer aussi
          </h2>
          <p className="mt-1 text-[14px] leading-6 text-encre">
            D&apos;autres prompts de la catégorie « {prompt.categorie.nom} », choisis par popularité.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similaires.map((s: any) => (
              <CartePrompt key={s.id} prompt={s} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
