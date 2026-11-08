// components/skills/bloc-verrou-skills.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 38 (réécriture lot 39) — BLOC « réservé aux abonnés » de la
// section Skills. Deux variantes selon l'état du visiteur :
//   · connecte = false → boutons « Se connecter » + « Voir les offres »
//   · connecte = true  → bouton « Passer Premium »
// Composant SERVEUR (liens uniquement, aucun JavaScript client).
// ─────────────────────────────────────────────────────────────────
import Link from "next/link";
import { Crown, LogIn, Lock } from "lucide-react";

export function BlocVerrouSkills({ connecte }: { connecte: boolean }) {
  return (
    <div className="rounded-carte border border-bordure bg-white p-8 text-center shadow-carte sm:p-10">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-violet/10">
        <Lock className="size-7 text-violet" aria-hidden />
      </span>
      <h2 className="mt-4 font-titre text-[22px] leading-7 font-bold text-bleu">
        Bibliothèque réservée aux abonnés
      </h2>
      <p className="mesure mx-auto mt-2 max-w-[540px] text-[14.5px] leading-6 text-encre">
        {connecte ? (
          <>
            Les skills IA (fiche complète en français, guide d&apos;installation, commande prête à copier)
            sont incluses dans l&apos;abonnement <strong className="font-semibold text-bleu">Premium</strong>.
            Passe Premium pour débloquer toute la bibliothèque.
          </>
        ) : (
          <>
            Connecte-toi ou crée un compte gratuitement, puis passe{" "}
            <strong className="font-semibold text-bleu">Premium</strong> pour débloquer toute la
            bibliothèque de skills : fiches traduites, images, commande d&apos;installation prête à copier.
          </>
        )}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {!connecte && (
          <Link
            href="/connexion"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-bordure bg-white px-5 text-[14px] leading-5 font-semibold text-bleu transition hover:border-violet hover:text-violet"
          >
            <LogIn className="size-4" aria-hidden /> Se connecter
          </Link>
        )}
        <Link
          href="/tarifs"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] px-5 text-[14px] leading-5 font-semibold text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)] transition hover:opacity-90"
        >
          <Crown className="size-4" aria-hidden />
          {connecte ? "Passer Premium" : "Voir les offres"}
        </Link>
      </div>
      <p className="mt-4 text-[12px] leading-4 text-encre/70">
        Inclus dans les plans Pro et Entreprise · Accès immédiat après paiement
      </p>
    </div>
  );
}