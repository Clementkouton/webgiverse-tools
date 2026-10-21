// components/admin/nav-admin.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ONGLETS = [
  { href: "/admin", libelle: "Tableau de bord", exacte: true },
  { href: "/admin/outils", libelle: "Outils" },
  { href: "/admin/avis", libelle: "Avis" },
  { href: "/admin/utilisateurs", libelle: "Utilisateurs" },
];

export function NavAdmin() {
  const chemin = usePathname();

  return (
    <nav aria-label="Navigation de l'espace admin" className="mt-6 flex flex-wrap gap-2">
      {ONGLETS.map((onglet) => {
        const actif = onglet.exacte ? chemin === onglet.href : chemin.startsWith(onglet.href);
        return (
          <Link
            key={onglet.href}
            href={onglet.href}
            aria-current={actif ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-[14px] leading-5 font-semibold transition",
              actif
                ? "bg-violet text-white shadow-[0_2px_10px_rgba(106,59,255,0.3)]"
                : "text-encre hover:bg-white hover:text-bleu"
            )}
          >
            {onglet.libelle}
          </Link>
        );
      })}
    </nav>
    
  );

}