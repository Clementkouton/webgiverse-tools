// components/layout/pied-site.tsx
// ─────────────────────────────────────────────────────────────────
// Masque le pied de page du site dans l'espace Dashboard.
// Le dashboard possède sa propre navigation dédiée (menu latéral +
// tiroir mobile) : on n'y affiche ni le header général ni le footer
// du site, pour un espace vraiment professionnel et immersif.
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