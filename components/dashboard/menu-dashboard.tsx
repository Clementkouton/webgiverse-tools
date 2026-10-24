// components/dashboard/menu-dashboard.tsx
// ─────────────────────────────────────────────────────────────────
// Menu professionnel du dashboard — LA SEULE navigation de l'espace :
//   • Ordinateur : barre latérale fixe pleine hauteur (le header
//     général du site est masqué sur /dashboard).
//   • Mobile : barre supérieure collante + tiroir coulissant animé.
// L'état actif suit l'URL (/dashboard?onglet=…) et la route
// (/dashboard/abonnement).
// ─────────────────────────────────────────────────────────────────
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeftRight,
  Compass,
  Crown,
  History,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessageSquareQuote,
  Sparkles,
  Star,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LienLogo } from "@/components/commun/logo";

type Props = {
  prenom: string;
  image: string | null;
  premium: boolean;
  /** Contenu serveur (ex. bouton de déconnexion) affiché en bas du menu. */
  pied?: React.ReactNode;
  children: React.ReactNode;
};

type LienMenu = {
  href: string;
  libelle: string;
  icone: LucideIcon;
  /** Clé d'onglet attendue dans ?onglet=… (sections du dashboard uniquement). */
  onglet?: string;
  /** Route exacte (ex. /dashboard/abonnement). */
  route?: string;
};

const SECTIONS: { titre: string; liens: LienMenu[] }[] = [
  {
    titre: "Mon espace",
    liens: [
      { href: "/dashboard?onglet=apercu", libelle: "Aperçu", icone: LayoutDashboard, onglet: "apercu" },
      { href: "/dashboard?onglet=favoris", libelle: "Favoris", icone: Star, onglet: "favoris" },
      { href: "/dashboard?onglet=listes", libelle: "Mes listes", icone: ListChecks, onglet: "listes" },
      { href: "/dashboard?onglet=avis", libelle: "Mes avis", icone: MessageSquareQuote, onglet: "avis" },
      { href: "/dashboard?onglet=activite", libelle: "Activité", icone: History, onglet: "activite" },
    ],
  },
  {
    titre: "Abonnement",
    liens: [
      { href: "/dashboard/abonnement", libelle: "Mon abonnement", icone: Crown, route: "abonnement" },
    ],
  },
  {
    titre: "Explorer",
    liens: [
      { href: "/outils", libelle: "Annuaire d'outils", icone: Compass },
      { href: "/assistant", libelle: "Assistant IA", icone: Sparkles },
      { href: "/comparer", libelle: "Comparateur", icone: ArrowLeftRight },
    ],
  },
];

export default function MenuDashboard({ prenom, image, premium, pied, children }: Props) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const chemin = usePathname();
  const params = useSearchParams();

  // Onglet actif : paramètre d'URL (défaut « aperçu » sur /dashboard)
  const ongletActif =
    chemin === "/dashboard" ? (params.get("onglet") ?? "apercu") : null;
  const surAbonnement = chemin.startsWith("/dashboard/abonnement");

  // Ferme le tiroir à chaque navigation
  useEffect(() => {
    setMenuOuvert(false);
  }, [chemin, params]);

  // Verrouille le défilement + fermeture avec Échap quand le tiroir est ouvert
  useEffect(() => {
    if (!menuOuvert) return;
    document.body.style.overflow = "hidden";
    const fermer = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOuvert(false);
    };
    window.addEventListener("keydown", fermer);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", fermer);
    };
  }, [menuOuvert]);

  const initiale = (prenom || "W").trim().charAt(0).toUpperCase() || "W";

  const avatar = image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image}
      alt=""
      className="size-10 shrink-0 rounded-full border-2 border-violet/30 object-cover"
    />
  ) : (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[linear-gradient(120deg,#6a3bff,#00d1ff)] font-titre text-[15px] font-bold text-white">
      {initiale}
    </span>
  );

  /** Rend les liens d'une section (desktop et tiroir partagent le style). */
  function liensDeSection(section: (typeof SECTIONS)[number], surClic?: () => void) {
    return section.liens.map((lien) => {
      const actif = lien.onglet
        ? ongletActif === lien.onglet
        : lien.route === "abonnement"
          ? surAbonnement
          : false;

      return (
        <Link
          key={lien.libelle}
          href={lien.href}
          onClick={surClic}
          aria-current={actif ? "page" : undefined}
          className={cn(
            "group relative flex items-center gap-3 rounded-champ px-3.5 py-2.5 text-[14px] leading-5 font-semibold transition-all duration-200",
            actif
              ? "bg-[linear-gradient(100deg,#6a3bff,#8f6bff)] text-white shadow-[0_4px_14px_rgba(106,59,255,0.35)]"
              : "text-bleu hover:bg-gris hover:text-violet active:scale-[0.98]"
          )}
        >
          {/* Indicateur animé à gauche du lien actif */}
          {actif && (
            <span
              aria-hidden
              className="animate-tiret absolute -left-[3px] top-1/2 h-5 w-[3px] -translate-y-1/2 origin-top rounded-full bg-ciel"
            />
          )}
          <lien.icone
            className={cn(
              "size-[18px] shrink-0 transition-transform duration-200",
              !actif && "group-hover:scale-110"
            )}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate">{lien.libelle}</span>
          {lien.route === "abonnement" && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] leading-3.5 font-bold uppercase",
                premium ? "bg-magenta text-white" : "bg-gris text-encre"
              )}
            >
              {premium ? "Premium" : "Gratuit"}
            </span>
          )}
        </Link>
      );
    });
  }

  /** Carte « passe Premium » (ou remerciement) en bas du menu. */
  const cartePlan = premium ? (
    <div className="relative overflow-hidden rounded-carte bg-[linear-gradient(110deg,#0b1b3f_0%,#4326a8_55%,#6a3bff_100%)] p-4 text-white">
      <div
        aria-hidden
        className="animate-flottant-lent pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-ciel/25 blur-2xl"
      />
      <p className="relative flex items-center gap-1.5 text-[13px] leading-4 font-bold">
        <Crown className="size-4 text-ciel" aria-hidden /> Premium actif
      </p>
      <p className="relative mt-1 text-[12px] leading-4 text-white/75">
        Merci de soutenir Webgiverse ! Gère ton plan quand tu veux.
      </p>
      <Link
        href="/dashboard/abonnement"
        className="relative mt-2.5 inline-flex min-h-9 items-center rounded-full bg-white/15 px-3 text-[12px] leading-4 font-semibold transition hover:bg-white/25"
      >
        Gérer mon abonnement
      </Link>
    </div>
  ) : (
    <div className="relative overflow-hidden rounded-carte bg-[linear-gradient(110deg,#0b1b3f_0%,#4326a8_55%,#6a3bff_100%)] p-4 text-white">
      <div
        aria-hidden
        className="animate-flottant pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-ciel/25 blur-2xl"
      />
      <p className="relative flex items-center gap-1.5 text-[13px] leading-4 font-bold">
        <Sparkles className="size-4 text-ciel" aria-hidden /> Passe Premium
      </p>
      <p className="relative mt-1 text-[12px] leading-4 text-white/75">
        Favoris illimités, badge exclusif et export PDF dès $2,99/mois.
      </p>
      <Link
        href="/dashboard/abonnement#plans"
        className="relative mt-2.5 inline-flex min-h-9 items-center rounded-full bg-white px-3 text-[12px] leading-4 font-bold text-violet transition hover:bg-white/90 active:scale-95"
      >
        Voir les plans
      </Link>
    </div>
  );

  const contenuNav = (
    <nav aria-label="Menu de l'espace personnel" className="flex-1 overflow-y-auto px-3">
      {SECTIONS.map((section) => (
        <div key={section.titre} className="mt-4 first:mt-2">
          <p className="px-3.5 pb-1.5 text-[11px] leading-4 font-bold uppercase tracking-[0.12em] text-encre/70">
            {section.titre}
          </p>
          <div className="grid gap-0.5">{liensDeSection(section, () => setMenuOuvert(false))}</div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* ═══ Barre latérale fixe pleine hauteur — desktop ═══ */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] flex-col border-r border-bordure bg-white lg:flex">
        {/* Marque : retour à l'accueil du site (le header général est masqué ici) */}
        <div className="border-b border-bordure px-5 py-4">
          <LienLogo />
        </div>

        {/* Identité de l'utilisateur */}
        <div className="flex items-center gap-3 border-b border-bordure px-5 py-4">
          {avatar}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] leading-5 font-semibold">
              {prenom ? prenom.trim().split(/\s+/)[0] : "Membre"}
            </p>
            <p
              className={cn(
                "inline-flex items-center gap-1 text-[12px] leading-4 font-semibold",
                premium ? "text-violet" : "text-encre"
              )}
            >
              {premium ? (
                <>
                  <Crown className="size-3.5" aria-hidden /> Plan Premium
                </>
              ) : (
                "Plan Découverte"
              )}
            </p>
          </div>
        </div>

        {contenuNav}

        {/* Bas du menu : carte plan + déconnexion (contenu serveur) */}
        <div className="grid gap-3 border-t border-bordure p-3">
          {cartePlan}
          {pied}
        </div>
      </aside>

      {/* ═══ Contenu principal ═══ */}
      <main className="lg:pl-[268px]">
        {/* Barre supérieure mobile collante — le seul « navbar » du dashboard sur téléphone */}
        <header className="verre sticky top-0 z-40 border-b border-bordure lg:hidden">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
            <button
              type="button"
              onClick={() => setMenuOuvert(true)}
              aria-label="Ouvrir le menu de l'espace"
              aria-expanded={menuOuvert}
              className="grid size-11 shrink-0 place-items-center rounded-full border border-bordure bg-white/70 text-bleu transition hover:bg-white active:scale-95"
            >
              <Menu className="size-5" aria-hidden />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              {avatar}
              <div className="min-w-0">
                <p className="truncate text-[14px] leading-5 font-semibold">
                  {prenom ? `Espace de ${prenom.trim().split(/\s+/)[0]}` : "Mon espace"}
                </p>
                <p
                  className={cn(
                    "text-[12px] leading-4",
                    premium ? "font-semibold text-violet" : "text-encre"
                  )}
                >
                  {premium ? "Plan Premium" : "Plan Découverte"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {children}
      </main>

      {/* ═══ Tiroir mobile animé ═══ */}
      {/* Fond assombri */}
      <div
        aria-hidden
        onClick={() => setMenuOuvert(false)}
        className={cn(
          "fixed inset-0 z-[60] bg-bleu/45 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          menuOuvert ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      {/* Panneau coulissant */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu de l'espace personnel"
        className={cn(
          "fixed inset-y-0 left-0 z-[61] flex w-[282px] max-w-[86vw] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out lg:hidden",
          menuOuvert ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-bordure px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-champ bg-[linear-gradient(120deg,#6a3bff,#00d1ff)] font-titre text-[15px] font-bold text-white">
              W
            </span>
            <p className="font-titre text-[15px] font-bold">Webgiverse</p>
          </div>
          <button
            type="button"
            onClick={() => setMenuOuvert(false)}
            aria-label="Fermer le menu"
            className="grid size-10 place-items-center rounded-full text-bleu transition hover:bg-gris active:scale-95"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex items-center gap-3 px-4 py-4">
          {avatar}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] leading-5 font-semibold">
              {prenom ? prenom.trim().split(/\s+/)[0] : "Membre"}
            </p>
            <p className="text-[12px] leading-4 text-encre">
              {premium ? "Plan Premium" : "Plan Découverte"}
            </p>
          </div>
        </div>

        {contenuNav}

        <div className="grid gap-3 border-t border-bordure p-3">
          {cartePlan}
          {pied}
        </div>
      </div>
    </>
  );
}