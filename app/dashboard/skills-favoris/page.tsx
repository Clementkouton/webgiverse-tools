// app/dashboard/skills-favoris/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 43 — « Mes skills favoris » dans l'espace personnel (dashboard).
//   1. SKILLS ÉPINGLÉES — couverture, catégorie, vues, date + « Retirer ».
//   2. MES RETOURS D'USAGE — usage + résultat + note + « Supprimer ».
// Style Metis du dashboard (même structure que /dashboard/prompts).
// Lecture défensive : tables absentes → état vide, page affichable.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronLeft,
  Crown,
  Eye,
  MessageSquareQuote,
  Pin,
  Puzzle,
  Sparkles,
  Star,
  Terminal,
  Trash2,
} from "lucide-react";
import { auth } from "@/auth";
import { premiumActif } from "@/lib/premium";
import { listerFavorisSkills, listerMesRetoursSkills } from "@/lib/skills-favoris";
import {
  retirerFavoriFormulaire,
  supprimerRetourFormulaire,
} from "@/app/actions/skills-favoris";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/badge";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";

export const metadata: Metadata = { title: "Mes skills favoris — Webgiverse" };
export const dynamic = "force-dynamic";

const formatteurDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

/** Rangée de 5 étoiles (note d'un retour). */
function Etoiles({ note }: { note: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Note : ${note} sur 5`}>
      {[1, 2, 3, 4, 5].map((v) => (
        <Star
          key={v}
          className={
            v <= note ? "size-3.5 fill-amber-400 text-amber-400" : "size-3.5 text-encre/25"
          }
          aria-hidden
        />
      ))}
    </span>
  );
}

export default async function PageSkillsFavoris() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?suite=/dashboard/skills-favoris");
  const userId = session.user.id;

  const premium = await premiumActif(userId);

  // Lectures défensives : migration non passée → listes vides.
  const favoris = await listerFavorisSkills(userId);
  const retours = await listerMesRetoursSkills(userId);

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
          <Puzzle className="size-7 text-violet" aria-hidden /> Mes skills favoris
          <Badge variante="defaut">{favoris.length}</Badge>
        </h1>
        <Bouton asChild variante="secondaire">
          <Link href="/skills">
            <Sparkles className="size-4" aria-hidden /> Explorer la bibliothèque
          </Link>
        </Bouton>
      </div>
      <p className="mt-1 text-encre">
        Les skills que tu as épinglées depuis la bibliothèque, et les retours d&apos;usage que tu
        as partagés avec la communauté.
      </p>

      {/* ── Rappel pour les non-abonnés (ex. abonnement expiré) ──── */}
      {!premium && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-carte border border-violet/30 bg-violet/5 p-5">
          <Crown className="size-6 shrink-0 text-violet" aria-hidden />
          <p className="min-w-0 flex-1 text-[14px] leading-6 text-encre">
            Épingler de nouvelles skills et publier des retours d&apos;usage est{" "}
            <strong className="font-semibold text-bleu">réservé aux abonnés Premium</strong>.
          </p>
          <Bouton asChild taille="sm">
            <Link href="/tarifs">Voir les tarifs</Link>
          </Bouton>
        </div>
      )}

      {/* ── Section 1 : skills épinglées ──────────────────────────── */}
      <section aria-label="Skills épinglées" className="mt-8">
        <h2 className="flex items-center gap-2 font-titre text-[18px] leading-6 font-bold text-bleu">
          <Pin className="size-4.5 text-violet" aria-hidden /> Skills épinglées
        </h2>

        {favoris.length === 0 ? (
          <div className="mt-4 rounded-carte border border-bordure bg-white p-10 text-center shadow-carte">
            <span className="grid size-12 mx-auto place-items-center rounded-carte bg-violet/10" aria-hidden>
              <Puzzle className="size-6 text-violet" />
            </span>
            <h3 className="mt-3 font-titre text-[16px] leading-5 font-semibold text-bleu">
              Aucune skill épinglée pour l&apos;instant
            </h3>
            <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-encre">
              Parcours la bibliothèque, ouvre une fiche et clique sur{" "}
              <strong className="font-semibold text-bleu">« Épingler »</strong> en haut de la
              fiche : elle apparaîtra ici.
            </p>
            <Bouton asChild className="mt-5">
              <Link href="/skills">Découvrir les skills IA</Link>
            </Bouton>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favoris.map((favori) => (
              <li
                key={favori.id}
                className="flex min-w-0 flex-col overflow-hidden rounded-carte border border-bordure bg-white shadow-carte"
              >
                <Link
                  href={`/skills/${favori.skill.slug}`}
                  className="relative block aspect-video w-full bg-[linear-gradient(120deg,#efe9ff,#e6f7ff)]"
                >
                  {favori.skill.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={favori.skill.image}
                      alt={favori.skill.imageAlt || favori.skill.titre}
                      loading="lazy"
                      className="size-full object-cover transition duration-300 hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="grid size-full place-items-center text-violet/50" aria-hidden>
                      <Terminal className="size-8" />
                    </span>
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 font-titre text-[15px] leading-5 font-semibold text-bleu">
                      <Link href={`/skills/${favori.skill.slug}`} className="transition hover:text-violet">
                        {favori.skill.titre}
                      </Link>
                    </h3>
                    {/* Retirer des favoris */}
                    <form action={retirerFavoriFormulaire}>
                      <input type="hidden" name="skillId" value={favori.skill.id} />
                      <BoutonConfirmer
                        message={`Retirer « ${favori.skill.titre} » de tes skills épinglées ?`}
                        aria-label={`Retirer ${favori.skill.titre}`}
                        className="grid size-9 shrink-0 place-items-center rounded-full border border-bordure bg-white text-encre transition hover:border-red-300 hover:text-red-500 active:scale-95"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </BoutonConfirmer>
                    </form>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-encre">
                    {favori.skill.description}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                    <span className="rounded-full border border-violet/30 bg-violet/5 px-2.5 py-0.5 text-[11px] leading-4 font-semibold text-violet">
                      {favori.skill.categorie}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] leading-4 text-encre">
                      <Eye className="size-3" aria-hidden />{" "}
                      {favori.skill.vues.toLocaleString("fr-FR")}
                    </span>
                    <span className="ml-auto text-[11px] leading-4 text-encre">
                      {formatteurDate.format(favori.creeLe)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Section 2 : mes retours d'usage ───────────────────────── */}
      <section aria-label="Mes retours d'usage" className="mt-10">
        <h2 className="flex items-center gap-2 font-titre text-[18px] leading-6 font-bold text-bleu">
          <MessageSquareQuote className="size-4.5 text-violet" aria-hidden /> Mes retours
          d&apos;usage <Badge variante="defaut">{retours.length}</Badge>
        </h2>

        {retours.length === 0 ? (
          <div className="mt-4 rounded-carte border border-bordure bg-white p-10 text-center shadow-carte">
            <span className="grid size-12 mx-auto place-items-center rounded-carte bg-violet/10" aria-hidden>
              <MessageSquareQuote className="size-6 text-violet" />
            </span>
            <h3 className="mt-3 font-titre text-[16px] leading-5 font-semibold text-bleu">
              Aucun retour d&apos;usage partagé
            </h3>
            <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-encre">
              Après avoir testé une skill, raconte sur sa fiche{" "}
              <strong className="font-semibold text-bleu">dans quel contexte tu l&apos;as
              utilisée</strong> et <strong className="font-semibold text-bleu">le résultat
              obtenu</strong> : ton retour apparaîtra ici et guidera les autres membres.
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3">
            {retours.map((retour) => (
              <li
                key={retour.id}
                className="rounded-carte border border-bordure bg-white p-5 shadow-carte"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <Puzzle className="size-4 shrink-0 text-violet" aria-hidden />
                  <h3 className="min-w-0 font-titre text-[15px] leading-5 font-semibold text-bleu">
                    <Link
                      href={`/skills/${retour.skill.slug}`}
                      className="transition hover:text-violet"
                    >
                      {retour.skill.titre}
                    </Link>
                  </h3>
                  {typeof retour.note === "number" && <Etoiles note={retour.note} />}
                  <span className="ml-auto text-[12px] leading-4 text-encre">
                    {formatteurDate.format(retour.creeLe)}
                  </span>
                  <form action={supprimerRetourFormulaire}>
                    <input type="hidden" name="retourId" value={retour.id} />
                    <BoutonConfirmer
                      message="Supprimer ce retour d'usage ?"
                      aria-label={`Supprimer le retour sur ${retour.skill.titre}`}
                      className="grid size-9 place-items-center rounded-full border border-bordure bg-white text-encre transition hover:border-red-300 hover:text-red-500 active:scale-95"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </BoutonConfirmer>
                  </form>
                </div>
                <p className="mt-3 text-[14px] leading-6 text-encre">
                  <strong className="font-semibold text-bleu">Usage :</strong> {retour.usage}
                </p>
                <p className="mt-1.5 text-[14px] leading-6 text-encre">
                  <strong className="font-semibold text-bleu">Résultat :</strong>{" "}
                  {retour.resultat}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}