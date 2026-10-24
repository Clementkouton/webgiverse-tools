// components/layout/pied-site.tsx
// ─────────────────────────────────────────────────────────────────
// Masque le pied de page du site dans les espaces réservés.
// Le Dashboard et la Console Admin possèdent leur PROPRE pied de
// page : on n'y affiche donc pas le gros footer du site, pour ne
// jamais voir deux footers l'un sous l'autre.
// ─────────────────────────────────────────────────────────────────
"use client";

import { usePathname } from "next/navigation";

export function PiedSite({ children }: { children: React.ReactNode }) {
  const chemin = usePathname();

  // Dans le Dashboard et la Console Admin (pages commençant par
  // /dashboard ou /admin) : on n'affiche pas le pied de page du site.
  if (chemin.startsWith("/dashboard") || chemin.startsWith("/admin")) return null;

  return <>{children}</>;
}