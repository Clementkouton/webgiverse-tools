// components/skills/bloc-verrou-skills.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 41 — Bloc « réservé aux abonnés Premium » de la section /skills.
// Affiché sur la liste et sur la fiche quand le visiteur n'a pas d'accès :
//   · non connecté        → boutons « Se connecter » / « Créer un compte » ;
//   · connecté non abonné → bouton « Passer Premium » vers /tarifs.
// Même vocabulaire visuel que les cadres verrouillés des tutoriels
// (lot 35) : tuile icône violette, badge « Premium », charte inchangée.
// Composant SERVEUR (aucun état) : le verrou est décidé côté serveur.
// ─────────────────────────────────────────────────────────────────
import Link from "next/link";
import { Crown, LogIn, Sparkles } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";

export function BlocVerrouSkills({ connecte }: { connecte: boolean }) {
  return (
    <section
      aria-label="Bibliothèque de skills réservée aux abonnés Premium"
      className="relative overflow-hidden rounded-carte border border-violet/30 bg-violet/5 p-6 sm:p-8"
    >
      <p className="flex flex-wrap items-center gap-2.5 font-titre text-[17px] leading-6 font-bold text-bleu">
        <span
          className="grid size-9 place-items-center rounded-lg bg-violet/10 text-violet"
          aria-hidden
        >
          <Crown className="size-4.5" />
        </span>
        Bibliothèque réservée aux abonnés Premium
        <span className="inline-flex items-center gap-1 rounded-full bg-violet/10 px-2 py-0.5 text-[10px] leading-3.5 font-bold text-violet">
          Premium
        </span>
      </p>
      <p className="mt-2 max-w-2xl text-[14px] leading-6 text-encre">
        Les <strong className="font-semibold text-bleu">skills IA</strong> (agents prêts à
        l&apos;emploi, traduits en français) sont réservées aux abonnés Premium : fiches complètes,
        images, commande d&apos;installation copiable et conseils d&apos;usage concrets.
      </p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {connecte ? (
          <Bouton asChild taille="sm">
            <Link href="/tarifs">
              <Sparkles aria-hidden /> Passer Premium
            </Link>
          </Bouton>
        ) : (
          <>
            <Bouton asChild taille="sm">
              <Link href="/connexion">
                <LogIn aria-hidden /> Se connecter
              </Link>
            </Bouton>
            <Bouton asChild variante="secondaire" taille="sm">
              <Link href="/inscription">Créer un compte gratuit</Link>
            </Bouton>
          </>
        )}
      </div>
    </section>
  );
}