// components/dashboard/pied-dashboard.tsx
// ─────────────────────────────────────────────────────────────────
// Pied de page DÉDIÉ au dashboard — différent du footer du site.
// Compact et professionnel : marque + badge de plan, lien de retour
// au site et liens légaux. Il vit à l'intérieur du MenuDashboard,
// donc il apparaît sous le contenu de toutes les pages /dashboard.
// ─────────────────────────────────────────────────────────────────
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const LIENS = [
  { href: "/tarifs", label: "Tarifs" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cgu", label: "CGU" },
];

export default function PiedDashboard({ premium = false }: { premium?: boolean }) {
  const annee = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-bordure bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        {/* Marque + badge de plan */}
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-champ bg-[linear-gradient(120deg,#6a3bff,#00d1ff)] font-titre text-[14px] font-bold text-white"
          >
            W
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-titre text-[13px] leading-4 font-bold text-bleu">
              Webgiverse
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] leading-3.5 font-bold uppercase",
                  premium ? "bg-magenta text-white" : "bg-gris text-encre"
                )}
              >
                {premium ? "Premium" : "Découverte"}
              </span>
            </p>
            <p className="text-[11px] leading-4 text-encre">
              © {annee} Webgiverse — Ton espace personnel
            </p>
          </div>
        </div>

        {/* Liens du dashboard */}
        <nav
          aria-label="Liens de l'espace personnel"
          className="flex flex-wrap items-center gap-x-4 gap-y-2"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-bleu px-3 py-1.5 text-[12px] leading-4 font-semibold text-white transition hover:bg-violet active:scale-95"
          >
            <ArrowLeft className="size-3.5" aria-hidden /> Retour au site
          </Link>
          {LIENS.map((lien) => (
            <Link
              key={lien.href}
              href={lien.href}
              className="text-[12px] leading-4 font-medium text-encre transition hover:text-violet"
            >
              {lien.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}