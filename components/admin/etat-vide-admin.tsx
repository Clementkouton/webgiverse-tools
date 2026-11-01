// components/admin/etat-vide-admin.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 23 — État vide illustré « TailwindAdmin » : icône sur pastille
// pastel arrondie (mêmes teintes que les tuiles de stats), titre,
// description et action optionnelle. S'utilise dans une Carte, à la
// place d'un tableau vide ou dans une cellule : il est centré, sans
// marge externe, et s'adapte à son conteneur.
// ─────────────────────────────────────────────────────────────────
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TonVide = "primaire" | "info" | "succes" | "alerte" | "erreur";

/** Pastilles pastel officielles du template, comme PASTILLE_TUILE. */
export const PASTILLE_VIDE: Record<TonVide, string> = {
  primaire: "bg-primaire/10 text-primaire-texte",
  info: "bg-adm-info-doux text-[#2b6be0]",
  succes: "bg-adm-succes-doux text-[#0f9b85]",
  alerte: "bg-adm-alerte-doux text-[#b26f00]",
  erreur: "bg-adm-erreur-doux text-[#c94f35]",
};

export function EtatVideAdmin({
  icone: Icone,
  titre,
  description,
  ton = "primaire",
  action,
  className,
}: {
  icone: LucideIcon;
  titre: string;
  description?: string;
  ton?: TonVide;
  /** Bouton(s) ou lien(s) d'action rendus sous la description. */
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <span className={cn("grid size-14 shrink-0 place-items-center rounded-2xl", PASTILLE_VIDE[ton])}>
        <Icone className="size-6" aria-hidden />
      </span>
      <p className="mt-3 font-titre text-[15px] leading-5 font-semibold text-adm-sombre">{titre}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-5 text-encre">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
