// app/not-found.tsx
// Page 404 personnalisée : s'affiche pour toute adresse inconnue du
// site, à l'intérieur du layout (header et footer inclus).

import Link from "next/link";
import { Compass, Home, LifeBuoy } from "lucide-react";

export default function PageIntrouvable() {
  return (
    <div className="mx-auto grid min-h-[60vh] w-full max-w-3xl place-items-center px-4 py-16 text-center">
      <div>
        <p
          aria-hidden
          className="font-titre texte-degrade text-[96px] font-bold leading-none sm:text-[120px]"
        >
          404
        </p>
        <h1 className="mt-4 font-titre text-h3 font-semibold text-bleu">
          Cette page n&apos;existe pas (ou plus)
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-6 text-encre">
          Le lien est peut-être ancien ou l&apos;adresse mal recopiée. Pas de
          panique : tout l&apos;annuaire t&apos;attend juste en dessous.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] px-7 text-[16px] leading-5 font-semibold text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)] transition hover:brightness-110"
          >
            <Home className="size-4" aria-hidden /> Retour à l&apos;accueil
          </Link>
          <Link
            href="/outils"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-violet bg-white px-7 text-[16px] leading-5 font-semibold text-bleu transition hover:bg-gris"
          >
            <Compass className="size-4" aria-hidden /> Explorer les outils
          </Link>
        </div>

        <p className="mt-6 text-[14px] leading-5 text-encre">
          Tu pensais qu&apos;une page devrait être ici ?{" "}
          <Link
            href="/contact"
            className="inline-flex items-center gap-1 font-medium text-violet hover:underline"
          >
            <LifeBuoy className="size-3.5" aria-hidden /> Dis-le nous
          </Link>
          , on corrige.
        </p>
      </div>
    </div>
  );
}