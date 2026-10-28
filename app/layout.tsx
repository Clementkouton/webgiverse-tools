import type { Metadata } from "next";
import { inter, spaceGrotesk } from "@/lib/fonts";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PiedSite } from "@/components/layout/pied-site";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Webgiverse Outils IA — l'annuaire francophone des outils IA",
    template: "%s | Webgiverse Outils IA",
  },
  description:
    "Trouve le bon outil IA pour ton projet : annuaire testé et expliqué en français, favoris, comparateur et assistant de recommandation. Apprendre · Créer · Réussir.",
  keywords: ["outils IA", "annuaire IA", "agents IA", "IA française", "outils gratuits IA"],
  openGraph: {
    type: "website", locale: "fr_FR", siteName: "Webgiverse Outils IA",
    title: "Webgiverse Outils IA — l'annuaire francophone des outils IA",
    description: "Trouve le bon outil IA pour ton projet. Apprendre · Créer · Réussir.",
  },
  icons: {
    icon: "/logo.png", // Chemin vers ton logo dans le dossier public
  },
};

export default function LayoutRacine({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="flex min-h-screen flex-col">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-60 focus:rounded-full focus:bg-bleu focus:px-4 focus:py-2 focus:text-white">
          Aller au contenu
        </a>
        <Header />
        <main id="contenu" className="flex-1">{children}</main>
        {/* Footer du site masqué automatiquement dans l'espace Dashboard
            (le dashboard affiche son propre footer : pied-dashboard.tsx) */}
        <PiedSite>
          <Footer />
        </PiedSite>
      </body>
    </html>
  );
}