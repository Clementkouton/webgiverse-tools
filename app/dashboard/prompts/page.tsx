// app/dashboard/prompts/page.tsx
// Lot 19 — « Mes prompts » : la liste des prompts IA sauvegardés par
// l'utilisateur (favoris de prompts). Page du dashboard (barre latérale
// Metis fournie par app/dashboard/layout.tsx), style cohérent avec
// /dashboard/abonnement : cartes blanches, font-titre, charte inchangée.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronLeft,
  Crown,
  Eye,
  Sparkles,
  TerminalSquare,
  Trash2,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { premiumActif, LIMITES_DECOUVERTE } from "@/lib/premium";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/badge";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import { retirerPromptFormulaire } from "@/app/actions/apprentissage";

export const metadata: Metadata = { title: "Mes prompts — Webgiverse" };
export const dynamic = "force-dynamic";

const formatteurDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export default async function PageMesPrompts() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?suite=/dashboard/prompts");
  const userId = session.user.id;

  const premium = await premiumActif(userId);

  // Lecture défensive : si le db push n'a pas encore créé la table
  // PromptFavori, la page reste affichable avec un état vide.
  type FavoriPrompt = {
    id: string;
    creeLe: Date;
    prompt: {
      id: string;
      slug: string;
      titre: string;
      emoji: string;
      description: string;
      vues: number;
      categorie: { nom: string; slug: string };
    };
  };
  let favoris: FavoriPrompt[] = [];
  try {
    favoris = (await prisma.promptFavori.findMany({
      where: { userId },
      orderBy: { creeLe: "desc" },
      select: {
        id: true,
        creeLe: true,
        prompt: {
          select: {
            id: true,
            slug: true,
            titre: true,
            emoji: true,
            description: true,
            vues: true,
            categorie: { select: { nom: true, slug: true } },
          },
        },
      },
    })) as FavoriPrompt[];
  } catch {
    favoris = [];
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
          <TerminalSquare className="size-7 text-violet" aria-hidden /> Mes prompts
          <Badge variante="defaut">{favoris.length}</Badge>
        </h1>
        <Bouton asChild variante="secondaire">
          <Link href="/prompts">
            <Sparkles className="size-4" aria-hidden /> Explorer la bibliothèque
          </Link>
        </Bouton>
      </div>
      <p className="mt-1 text-encre">
        {premium
          ? "Tes prompts sauvegardés, prêts à être copiés. Illimité avec ton plan Premium."
          : `Les prompts que tu as sauvegardés depuis la bibliothèque. Limite du plan Découverte : ${LIMITES_DECOUVERTE.prompts}.`}
      </p>

      {/* ── État vide ─────────────────────────────────────────────── */}
      {favoris.length === 0 && (
        <Carte className="mt-8 p-10 text-center">
          <span className="text-4xl" aria-hidden>
            ✨
          </span>
          <h2 className="mt-3 font-titre text-[18px] leading-6 font-semibold text-bleu">
            Aucun prompt sauvegardé pour l&apos;instant
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-encre">
            Parcours la bibliothèque de prompts IA et clique sur « Sauvegarder »
            sur une fiche : il apparaîtra ici, prêt à être copié en un clic.
          </p>
          <Bouton asChild className="mt-5">
            <Link href="/prompts">Découvrir les prompts IA</Link>
          </Bouton>
        </Carte>
      )}

      {/* ── Grille des prompts sauvegardés ────────────────────────── */}
      {favoris.length > 0 && (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favoris.map((favori) => (
            <li
              key={favori.id}
              className="survol-carte flex flex-col rounded-carte border border-bordure bg-white p-5 shadow-carte"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  aria-hidden
                  className="grid size-11 shrink-0 place-items-center rounded-carte bg-violet/10 text-[20px]"
                >
                  {favori.prompt.emoji}
                </span>
                {/* Retirer des favoris */}
                <form action={retirerPromptFormulaire}>
                  <input type="hidden" name="promptId" value={favori.prompt.id} />
                  <BoutonConfirmer
                    message={`Retirer « ${favori.prompt.titre} » de tes prompts sauvegardés ?`}
                    aria-label={`Retirer ${favori.prompt.titre}`}
                    className="grid size-9 place-items-center rounded-full border border-bordure bg-white text-encre transition hover:border-red-300 hover:text-red-500 active:scale-95"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </BoutonConfirmer>
                </form>
              </div>

              <h2 className="mt-3 font-titre text-[15px] leading-5 font-semibold text-bleu">
                <Link
                  href={`/prompts/${favori.prompt.slug}`}
                  className="transition hover:text-violet"
                >
                  {favori.prompt.titre}
                </Link>
              </h2>
              <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-encre">
                {favori.prompt.description}
              </p>

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                <Link
                  href={`/prompts/categorie/${favori.prompt.categorie.slug}`}
                  className="rounded-full border border-violet/30 bg-violet/5 px-2.5 py-0.5 text-[11px] leading-4 font-semibold text-violet transition hover:border-violet"
                >
                  {favori.prompt.categorie.nom}
                </Link>
                <span className="inline-flex items-center gap-1 text-[11px] leading-4 text-encre">
                  <Eye className="size-3" aria-hidden /> {favori.prompt.vues.toLocaleString("fr-FR")}
                </span>
                <span className="ml-auto text-[11px] leading-4 text-encre">
                  {formatteurDate.format(favori.creeLe)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ── Rappel upsell pour le plan Découverte ─────────────────── */}
      {!premium && favoris.length >= LIMITES_DECOUVERTE.prompts && (
        <Carte className="mt-8 flex flex-wrap items-center gap-4 border-violet/30 bg-violet/5 p-5">
          <Crown className="size-6 shrink-0 text-violet" aria-hidden />
          <p className="min-w-0 flex-1 text-[14px] leading-6 text-encre">
            Tu as atteint la limite de <strong className="text-bleu">{LIMITES_DECOUVERTE.prompts} prompts</strong> du
            plan Découverte. Passe Premium pour sauvegarder sans limite et copier tous les prompts.
          </p>
          <Bouton asChild taille="sm">
            <Link href="/tarifs">Voir les tarifs</Link>
          </Bouton>
        </Carte>
      )}
    </div>
  );
}