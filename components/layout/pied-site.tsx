// components/layout/pied-site.tsx
// ─────────────────────────────────────────────────────────────────
// Masque le pied de page du site dans l'espace Dashboard.
// Le dashboard possède son PROPRE pied de page (pied-dashboard.tsx) :
// on n'y affiche donc pas le gros footer du site (Annuaire/Ressources/
// Légal), pour ne jamais voir deux footers l'un sous l'autre.
// ─────────────────────────────────────────────────────────────────
"use client";

import { usePathname } from "next/navigation";

export function PiedSite({ children }: { children: React.ReactNode }) {
  const chemin = usePathname();

  // Dans le Dashboard (toutes les pages commençant par /dashboard) :
  // on n'affiche pas le pied de page du site.
  if (chemin.startsWith("/dashboard")) return null;

  return <>{children}</>;
}