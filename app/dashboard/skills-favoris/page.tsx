// app/dashboard/skills-favoris/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 44 — « MES SKILLS » : les skills que l'abonné a épinglées
// depuis la bibliothèque /skills, avec son retour d'usage associé
// (contexte d'usage, résultat obtenu, note 1-5).
//
// · Page du dashboard (barre latérale fournie par app/dashboard/layout.tsx),
//   style cohérent avec /dashboard/prompts : cartes blanches, font-titre,
//   charte inchangée.
// · URL : /dashboard/skills-favoris (l'entrée du menu dashboard pointe
//   déjà ici — le lot 43 avait le dossier app/dashboard/skills, d'où un
//   404 depuis le menu ; corrigé dans ce lot).
// · RÉSERVÉE AUX ABONNÉS PREMIUM (même règle que la bibliothèque
//   /skills, verrou calculé côté serveur via lib/acces-skills.ts) :
//   un membre non abonné voit une carte « Passe Premium », jamais la
//   liste ni le formulaire.
// · Lecture défensive : tables absentes (db push non lancé) → état
//   vide affichable, jamais de crash.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Crown, Eye, Pin, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { accesSkills } from "@/lib/acces-skills";
import { favorisSkills, retoursMembrePourSkills } from "@/lib/queries-skills";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/badge";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import { retirerFavoriFormulaire } from "@/app/actions/skills-favoris";
import {
  FormulaireRetourSkill,
  type RetourInitialSkill,
} from "@/components/skills/formulaire-retour-skill";

export const metadata: Metadata = { title: "Mes skills — Webgiverse" };
export const dynamic = "force-dynamic";

const formatteurDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

type FavoriAvecSkill = Awaited<ReturnType<typeof favorisSkills>>[number];

export default async function PageMesSkills() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?suite=/dashboard/skills-favoris");
  const userId = session.user.id;

  // ── Accès : mêmes règles que la bibliothèque /skills ────────────
  const acces = await accesSkills(userId);

  // ── Skills épinglées + retours d'usage associés ──────────────────
  const favoris: FavoriAvecSkill[] = acces.peutAcceder ? await favorisSkills(userId) : [];
  const retours: Map<string, RetourInitialSkill> = acces.peutAcceder
    ? ((await retoursMembrePourSkills(userId, favoris.map((f) => f.skill.id))) as Map<string, RetourInitialSkill>)
    : new Map<string, RetourInitialSkill>();

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
          <Pin className="size-7 text-violet" aria-hidden /> Mes skills
          {acces.peutAcceder && <Badge variante="defaut">{favoris.length}</Badge>}
        </h1>
        <Bouton asChild variante="secondaire">
          <Link href="/skills">Explorer la bibliothèque</Link>
        </Bouton>
      </div>
      <p className="mt-1 text-encre">
        {acces.peutAcceder
          ? "Les skills IA que tu as épinglées, avec ton retour d'usage pour chacune. Illimité avec ton plan Premium."
          : "Épingle les skills de la bibliothèque et note le résultat obtenu — une fonctionnalité réservée aux abonnés Premium."}
      </p>

      {/* ── NON PREMIUM : invitation à s'abonner ──────────────────── */}
      {!acces.peutAcceder && (
        <Carte className="mt-8 flex flex-wrap items-center gap-4 p-8">
          <span className="grid size-14 shrink-0 place-items-center rounded-carte bg-violet/10">
            <Crown className="size-7 text-violet" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">
              La bibliothèque de skills est réservée aux abonnés
            </h2>
            <p className="mt-1 max-w-xl text-[14px] leading-6 text-encre">
              Avec le plan Premium, tu accèdes aux dizaines de skills IA traduites en français, tu épingles tes
              préférées ici et tu gardes une trace du résultat obtenu sur chaque usage.
            </p>
          </div>
          <Bouton asChild>
            <Link href="/tarifs">Voir les plans</Link>
          </Bouton>
        </Carte>
      )}

      {/* ── PREMIUM · état vide ───────────────────────────────────── */}
      {acces.peutAcceder && favoris.length === 0 && (
        <Carte className="mt-8 p-10 text-center">
          <span className="text-4xl" aria-hidden>
            📌
          </span>
          <h2 className="mt-3 font-titre text-[18px] leading-6 font-semibold text-bleu">
            Aucune skill épinglée pour l&apos;instant
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-encre">
            Parcours la bibliothèque de skills IA et clique sur « Épingler » d&apos;une carte, ou sur
            « Épingler » sur sa fiche : elle apparaîtra ici, avec ton retour d&apos;usage.
          </p>
          <Bouton asChild className="mt-5">
            <Link href="/skills">
              <Sparkles className="size-4" aria-hidden /> Découvrir les skills IA
            </Link>
          </Bouton>
        </Carte>
      )}

      {/* ── PREMIUM · grille des skills épinglées ─────────────────── */}
      {acces.peutAcceder && favoris.length > 0 && (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {favoris.map((favori) => {
            const skillId = String(favori.skill.id);
            const retour = retours.get(skillId) ?? null;
            return (
              <li
                key={favori.id}
                className="flex flex-col overflow-hidden rounded-carte border border-bordure bg-white shadow-carte"
              >
                {/* Couverture 16:9 (URL distante, dégradé de marque en secours) */}
                <Link
                  href={`/skills/${favori.skill.slug}`}
                  className="group relative block aspect-video w-full overflow-hidden bg-[linear-gradient(120deg,#00d1ff_0%,#6a3bff_70%)]"
                >
                  {favori.skill.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={favori.skill.image}
                      alt={favori.skill.imageAlt || favori.skill.titre}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center">
                      <Sparkles className="size-8 text-white/80" aria-hidden />
                    </span>
                  )}
                  <span className="absolute bottom-3 left-3 rounded-full bg-bleu/80 px-2.5 py-1 text-[11px] leading-3 font-semibold text-white backdrop-blur">
                    {favori.skill.categorie}
                  </span>
                </Link>

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-titre text-[15px] leading-5 font-semibold text-bleu">
                      <Link href={`/skills/${favori.skill.slug}`} className="transition hover:text-violet">
                        {favori.skill.titre}
                      </Link>
                    </h2>
                    {/* Retirer des skills épinglées */}
                    <form action={retirerFavoriFormulaire}>
                      <input type="hidden" name="skillId" value={skillId} />
                      <BoutonConfirmer
                        message={`Retirer « ${favori.skill.titre} » de tes skills épinglées ?`}
                        aria-label={`Retirer ${favori.skill.titre}`}
                        className="grid size-9 place-items-center rounded-full border border-bordure bg-white text-encre transition hover:border-red-300 hover:text-red-500 active:scale-95"
                      >
                        <Pin className="size-4" aria-hidden />
                      </BoutonConfirmer>
                    </form>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-encre">{favori.skill.description}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] leading-4 text-encre">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="size-3" aria-hidden /> {favori.skill.vues.toLocaleString("fr-FR")}
                    </span>
                    <span>· épinglée le {formatteurDate.format(favori.creeLe)}</span>
                  </div>

                  {/* Retour d'usage : affichage ou formulaire (client) */}
                  <div className="mt-auto pt-3">
                    <FormulaireRetourSkill skillId={skillId} retourInitial={retour} variante="dashboard" />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
