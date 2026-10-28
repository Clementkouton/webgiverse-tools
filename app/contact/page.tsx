import type { Metadata } from "next";
import Link from "next/link";
import { Clock, LifeBuoy, ShieldCheck } from "lucide-react";
import { FormulaireContact } from "@/components/commun/formulaire-contact";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Une question sur un outil, ton abonnement ou un partenariat ? Écris à l'équipe Webgiverse : réponse sous 24 à 48 h ouvrées.",
};

export default function PageContact() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12">
      <header className="mb-10">
        <h1 className="font-titre text-h2 text-encre">Contact</h1>
        <p className="mt-2 max-w-2xl text-encre/70">
          Une question, une suggestion, un souci ? L&apos;équipe Webgiverse te
          lit vraiment. Nous répondons sous 24 à 48 h ouvrées.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Formulaire (2/3 de la largeur sur grand écran) */}
        <div className="lg:col-span-3">
          <FormulaireContact />
        </div>

        {/* Informations pratiques (1/3) */}
        <aside className="grid content-start gap-4 lg:col-span-2">
          <div className="survol-carte rounded-carte border border-bordure bg-white p-5 shadow-carte">
            <span className="grid size-10 place-items-center rounded-carte bg-violet/10">
              <Clock className="size-5 text-violet" aria-hidden />
            </span>
            <h2 className="mt-3 font-titre text-[16px] leading-6 font-semibold text-bleu">
              Délai de réponse
            </h2>
            <p className="mt-1 text-[14px] leading-5 text-encre">
              Nous lisons chaque message et répondons sous 24 à 48 h ouvrées,
              du lundi au vendredi.
            </p>
          </div>

          <div className="survol-carte rounded-carte border border-bordure bg-white p-5 shadow-carte">
            <span className="grid size-10 place-items-center rounded-carte bg-violet/10">
              <LifeBuoy className="size-5 text-violet" aria-hidden />
            </span>
            <h2 className="mt-3 font-titre text-[16px] leading-6 font-semibold text-bleu">
              Abonnés Entreprise : priorité
            </h2>
            <p className="mt-1 text-[14px] leading-5 text-encre">
              Le support prioritaire par e-mail est inclus dans le plan{" "}
              <Link
                href="/tarifs"
                className="font-medium text-violet hover:underline"
              >
                Entreprise
              </Link>{" "}
              : tes messages passent devant la file d&apos;attente.
            </p>
          </div>

          <div className="survol-carte rounded-carte border border-bordure bg-white p-5 shadow-carte">
            <span className="grid size-10 place-items-center rounded-carte bg-violet/10">
              <ShieldCheck className="size-5 text-violet" aria-hidden />
            </span>
            <h2 className="mt-3 font-titre text-[16px] leading-6 font-semibold text-bleu">
              Tes données restent chez nous
            </h2>
            <p className="mt-1 text-[14px] leading-5 text-encre">
              Ton message sert uniquement à te répondre. Jamais de revente,
              jamais de spam — promis.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}