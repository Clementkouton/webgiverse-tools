// lib/fonts.ts
// Polices auto-hébergées : plus AUCUN appel à Google Fonts pendant le build,
// le déploiement ne peut plus échouer à cause du réseau.
import localFont from "next/font/local";

/** Police du corps de texte (variable : tous les poids de 100 à 900). */
export const inter = localFont({
  src: "../app/fonts/Inter-Variable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

/** Police des titres (variable : poids de 300 à 700). */
export const spaceGrotesk = localFont({
  src: "../app/fonts/SpaceGrotesk-Variable.woff2",
  variable: "--font-space-grotesk",
  weight: "300 700",
  display: "swap",
});