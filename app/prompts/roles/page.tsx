// app/prompts/roles/page.tsx
// Lot 17 — index des 24 métiers : grille de pastilles avec le nombre
// réel de prompts par rôle. Permet à chaque visiteur de trouver la
// bibliothèque « de son métier » en deux clics.
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { compterPromptsParRole } from "@/lib/queries";
import { ROLES } from "@/lib/prompts-utils";

export const metadata: Metadata = {
  title: "Prompts par métier — 24 métiers couverts | Webgiverse",
  description:
    "Trouve les prompts IA faits pour ton métier : entrepreneurs, marketeurs, développeurs, enseignants, avocats, médecins… 24 métiers, un seul catalogue.",
};

export default async function PageRoles() {
  const compteurs = await compterPromptsParRole();
  const total = new Map(compteurs.map((c) => [c.slug, c.total]));

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mx-auto w-full max-w-7xl px-4 pt-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-[13px] leading-4 text-encre">
          <li><Link href="/" className="hover:text-violet">Accueil</Link></li>
          <li aria-hidden><ChevronRight className="size-3.5" /></li>
          <li><Link href="/prompts" className="hover:text-violet">Prompts</Link></li>
          <li aria-hidden><ChevronRight className="size-3.5" /></li>
          <li className="font-medium text-bleu">Métiers</li>
        </ol>
      </nav>

      <section className="hero-verre mt-4 border-b border-bordure">
        <div className="mx-auto max-w-7xl px-4 py-10 text-center lg:py-12">
          <h1 className="mx-auto max-w-[720px] text-[28px] leading-9 font-bold tracking-tight text-bleu sm:text-h2">
            Prompts par <span className="texte-degrade">métier</span>
          </h1>
          <p className="mesure mx-auto mt-3 text-[15px] leading-7 text-encre">
            24 métiers, des prompts testés pour chacun : choisis le tien et gagne des heures
            sur tes livrables récurrents.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 lg:py-12">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ROLES.map((r) => {
            const n = total.get(r.slug) ?? 0;
            return (
              <li key={r.slug}>
                <Link
                  href={`/prompts/roles/${r.slug}`}
                  className="survol-eleve flex min-h-11 items-center justify-between gap-3 rounded-carte border border-bordure bg-white px-4 py-3 shadow-carte transition hover:border-violet"
                >
                  <span className="font-titre text-[15px] leading-5 font-semibold text-bleu transition hover:text-violet">
                    {r.nom}
                  </span>
                  <span
                    className={
                      n > 0
                        ? "rounded-full bg-violet/10 px-2.5 py-0.5 text-[12px] leading-4 font-semibold text-violet"
                        : "rounded-full bg-gris px-2.5 py-0.5 text-[12px] leading-4 font-medium text-encre/60"
                    }
                  >
                    {n} prompt{n > 1 ? "s" : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
