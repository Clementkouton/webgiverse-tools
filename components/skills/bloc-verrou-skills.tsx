// components/skills/bloc-verrou-skills.tsx
// Lot 40 — bloc « Bibliothèque réservée aux abonnés » (Pro ou Entreprise actif).
import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";

const CLASSE_CTA_PREMIUM =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full bg-violet px-5 text-[14px] leading-5 font-semibold text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)] transition hover:bg-violet/90";
const CLASSE_CTA_CONNEXION =
  "inline-flex min-h-11 items-center rounded-full border border-bordure bg-white px-5 text-[14px] leading-5 font-semibold text-bleu transition hover:border-violet hover:text-violet";

export function BlocVerrouSkills({
  connecte = false,
  compact = false,
}: {
  connecte?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "w-full max-w-md rounded-carte border border-violet/30 bg-white/95 p-6 text-center shadow-carte"
          : "mx-auto w-full max-w-xl rounded-carte border border-violet/30 bg-white p-8 text-center shadow-carte"
      }
    >
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-violet/10">
        <Lock className="size-5 text-violet" aria-hidden />
      </span>
      <h2 className="font-titre mt-4 text-[20px] leading-7 font-bold text-bleu">
        Bibliothèque réservée aux abonnés
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-encre">
        Les skills — reviews complètes, images, commandes d&apos;installation — sont
        incluses dans les plans Premium <strong className="font-semibold text-bleu">Pro</strong> et{" "}
        <strong className="font-semibold text-bleu">Entreprise</strong>.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {!connecte && (
          <Link href="/connexion" className={CLASSE_CTA_CONNEXION}>
            Se connecter
          </Link>
        )}
        <Link href="/tarifs" className={CLASSE_CTA_PREMIUM}>
          <Sparkles className="size-4" aria-hidden /> Passer Premium
        </Link>
      </div>
    </div>
  );
}