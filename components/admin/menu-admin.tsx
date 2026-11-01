// components/admin/menu-admin.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 21 — Console d'administration redesignée « Spark » :
//   • Barre latérale VERT SAPIN pleine hauteur, repliable en rail
//     d'icônes (PC, état mémorisé dans localStorage) ;
//   • Topbar claire collante : menu (mobile), repli (PC), recherche
//     d'outils, bouton vert « + Outil » SANS dégradé, cloche des
//     propositions à modérer, avatar ;
//   • Sections : Pilotage / Catalogue (Outils, Tutoriels, Prompts,
//     Articles) / Modération (Propositions, Avis, Utilisateurs) /
//     Monétisation (Abonnements) — chaque contenu a sa page ;
//   • Mobile : tiroir coulissant animé (mêmes couleurs).
// Le header et le footer du site sont masqués sur /admin.
// ─────────────────────────────────────────────────────────────────
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  CreditCard,
  Gauge,
  Inbox,
  LayoutDashboard,
  Menu,
  MessageSquareQuote,
  MonitorPlay,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BoutonDeconnexionBarre } from "@/components/auth/bouton-deconnexion";

type Props = {
  prenom: string;
  image: string | null;
  /** Nombre de propositions d'outils en attente (cloche + badge menu). */
  propositionsEnAttente: number;
  /** Contenu serveur (ex. bouton de déconnexion) affiché en bas du menu. */
  pied?: React.ReactNode;
  children: React.ReactNode;
};

type LienAdmin = {
  href: string;
  libelle: string;
  icone: LucideIcon;
  /** Route exacte (sinon préfixe). */
  exacte?: boolean;
  /** Affiche le badge des propositions en attente sur ce lien. */
  notification?: boolean;
};

const SECTIONS: { titre: string; liens: LienAdmin[] }[] = [
  {
    titre: "Pilotage",
    liens: [
      { href: "/admin", libelle: "Tableau de bord", icone: Gauge, exacte: true },
    ],
  },
  {
    titre: "Catalogue",
    liens: [
      { href: "/admin/outils", libelle: "Outils", icone: Wrench },
      { href: "/admin/tutoriels", libelle: "Tutoriels", icone: MonitorPlay },
      { href: "/admin/prompts", libelle: "Prompts", icone: TerminalSquare },
      { href: "/admin/articles", libelle: "Articles", icone: Newspaper },
    ],
  },
  {
    titre: "Modération",
    liens: [
      { href: "/admin/propositions", libelle: "Propositions", icone: Inbox, notification: true },
      { href: "/admin/avis", libelle: "Avis", icone: MessageSquareQuote },
      { href: "/admin/utilisateurs", libelle: "Utilisateurs", icone: Users },
    ],
  },
  {
    titre: "Monétisation",
    liens: [
      { href: "/admin/abonnements", libelle: "Abonnements", icone: CreditCard },
    ],
  },
];

const LIENS_SORTIE = [
  { href: "/dashboard", libelle: "Mon espace", icone: LayoutDashboard },
  { href: "/", libelle: "Retour au site", icone: ArrowLeft },
];

export default function MenuAdmin({
  prenom,
  image,
  propositionsEnAttente,
  pied,
  children,
}: Props) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [reduit, setReduit] = useState(false);
  const chemin = usePathname();

  // Ferme le tiroir à chaque navigation
  useEffect(() => {
    setMenuOuvert(false);
  }, [chemin]);

  // Restaure l'état replié (PC) après le premier rendu
  useEffect(() => {
    try {
      setReduit(window.localStorage.getItem("admin-menu-reduit") === "1");
    } catch {
      /* stockage indisponible : menu déplié */
    }
  }, []);

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

  const basculerReduit = () => {
    setReduit((v) => {
      try {
        window.localStorage.setItem("admin-menu-reduit", v ? "0" : "1");
      } catch {
        /* stockage indisponible */
      }
      return !v;
    });
  };

  const initiale = (prenom || "A").trim().charAt(0).toUpperCase() || "A";

  const avatar = image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image}
      alt=""
      className="size-10 shrink-0 rounded-full border-2 border-lime/50 object-cover"
    />
  ) : (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-vert font-titre text-[15px] font-bold text-white">
      {initiale}
    </span>
  );

  /** Bloc identité (partagé entre la sidebar et le tiroir mobile). */
  const identite = (replie: boolean) => (
    <div className={cn("flex items-center border-b border-white/10 px-4 py-4", replie ? "justify-center gap-0" : "gap-3 px-5")}>
      {avatar}
      {!replie && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] leading-5 font-semibold text-white">
            {prenom ? prenom.trim().split(/\s+/)[0] : "Admin"}
          </p>
          <p className="inline-flex items-center gap-1 text-[12px] leading-4 font-semibold text-lime">
            <ShieldCheck className="size-3.5" aria-hidden /> Administrateur
          </p>
        </div>
      )}
    </div>
  );

  /** Liens des 4 sections (styles sombres, partagés sidebar + tiroir). */
  function liensAdmin(replie: boolean, surClic?: () => void) {
    return SECTIONS.map((section) => (
      <div key={section.titre} className="mt-5 first:mt-1">
        {replie ? (
          <div className="mx-3 my-2 border-t border-white/15" aria-hidden />
        ) : (
          <p className="px-3.5 pb-1.5 text-[11px] leading-4 font-bold uppercase tracking-[0.14em] text-lime/70">
            {section.titre}
          </p>
        )}
        <div className="grid gap-0.5">
          {section.liens.map((lien) => {
            const actif = lien.exacte
              ? chemin === lien.href
              : chemin.startsWith(lien.href);

            return (
              <Link
                key={lien.href}
                href={lien.href}
                onClick={surClic}
                title={replie ? lien.libelle : undefined}
                aria-current={actif ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-champ text-[14px] leading-5 font-semibold transition-all duration-200",
                  replie ? "mx-auto w-11 justify-center px-0 py-2.5" : "px-3.5 py-2.5",
                  actif
                    ? "bg-vert text-white shadow-[0_4px_14px_rgba(23,133,79,0.45)]"
                    : "text-white/75 hover:bg-white/10 hover:text-white active:scale-[0.98]",
                )}
              >
                <lien.icone
                  className={cn(
                    "size-[18px] shrink-0 transition-transform duration-200",
                    !actif && "group-hover:scale-110",
                  )}
                  aria-hidden
                />
                {!replie && (
                  <>
                    <span className="min-w-0 flex-1 truncate">{lien.libelle}</span>
                    {lien.notification && propositionsEnAttente > 0 && (
                      <span
                        title={`${propositionsEnAttente} proposition(s) à traiter`}
                        className="shrink-0 rounded-full bg-lime px-1.5 py-0.5 text-[10px] leading-3.5 font-bold text-sapin"
                      >
                        {propositionsEnAttente}
                      </span>
                    )}
                  </>
                )}
                {replie && lien.notification && propositionsEnAttente > 0 && (
                  <span
                    aria-hidden
                    className="absolute top-1.5 right-1.5 size-2 rounded-full bg-lime"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    ));
  }

  /** Liens de sortie : espace utilisateur + site public. */
  function liensSortie(replie: boolean, surClic?: () => void) {
    return (
      <div className="grid gap-0.5">
        {LIENS_SORTIE.map((lien) => (
          <Link
            key={lien.href}
            href={lien.href}
            onClick={surClic}
            title={replie ? lien.libelle : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-champ text-[14px] leading-5 font-semibold text-white/75 transition hover:bg-white/10 hover:text-white",
              replie ? "mx-auto w-11 justify-center px-0 py-2.5" : "px-3.5 py-2.5",
            )}
          >
            <lien.icone
              className="size-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110"
              aria-hidden
            />
            {!replie && lien.libelle}
          </Link>
        ))}
      </div>
    );
  }

  /** Marque de la console (partagée sidebar + tiroir). */
  const marque = (replie: boolean) => (
    <Link
      href="/admin"
      className={cn("flex items-center border-b border-white/10 py-4", replie ? "justify-center px-0" : "gap-2.5 px-5")}
    >
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-champ bg-vert shadow-[0_4px_14px_rgba(23,133,79,0.45)]"
      >
        <Sparkles className="size-5 text-lime" />
      </span>
      {!replie && (
        <span className="min-w-0">
          <span className="block font-titre text-[15px] leading-5 font-bold text-white">
            Webgiverse
          </span>
          <span className="block text-[11px] leading-4 font-bold uppercase tracking-[0.16em] text-lime">
            Console admin
          </span>
        </span>
      )}
    </Link>
  );

  const annee = new Date().getFullYear();

  return (
    <>
      {/* ═══ Barre latérale sapin — desktop (repliable) ═══ */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col bg-sapin transition-[width] duration-300 lg:flex",
          reduit ? "w-[76px]" : "w-[268px]",
        )}
      >
        {marque(reduit)}
        {identite(reduit)}

        <nav
          aria-label="Menu de la console d'administration"
          className="flex-1 overflow-y-auto px-3 py-2"
        >
          {liensAdmin(reduit)}
        </nav>

        {/* Bas du menu : sorties + déconnexion (contenu serveur) */}
        <div className={cn("grid gap-3 border-t border-white/10 p-3", reduit && "justify-items-center")}>
          {liensSortie(reduit)}
          {reduit ? (
            /* En mode rail : bouton rond icône (même logique de déconnexion réelle) */
            <BoutonDeconnexionBarre sombre />
          ) : (
            pied
          )}
        </div>
      </aside>

      {/* ═══ Colonne principale ═══ */}
      {/* w-full + overflow-x-clip : aucun enfant ne peut élargir la page
          au-delà de l'écran (même correctif que le Dashboard) */}
      <div
        className={cn(
          "flex min-h-dvh w-full flex-col overflow-x-clip bg-[#f3f6f4] transition-[padding] duration-300",
          reduit ? "lg:pl-[76px]" : "lg:pl-[268px]",
        )}
      >
        {/* ═══ Topbar Spark (toutes tailles) ═══ */}
        <header className="sticky top-0 z-40 border-b border-bordure bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">
            {/* Menu mobile */}
            <button
              type="button"
              onClick={() => setMenuOuvert(true)}
              aria-label="Ouvrir le menu de la console"
              aria-expanded={menuOuvert}
              className="relative grid size-10 shrink-0 place-items-center rounded-full border border-bordure bg-white text-bleu transition hover:bg-gris active:scale-95 lg:hidden"
            >
              <Menu className="size-5" aria-hidden />
              {propositionsEnAttente > 0 && (
                <span
                  aria-hidden
                  className="absolute top-1 right-1 size-2.5 rounded-full bg-lime ring-2 ring-white"
                />
              )}
            </button>

            {/* Repli du menu (PC) */}
            <button
              type="button"
              onClick={basculerReduit}
              aria-label={reduit ? "Déplier le menu de la console" : "Replier le menu de la console"}
              aria-pressed={reduit}
              className="hidden size-10 shrink-0 place-items-center rounded-full border border-bordure bg-white text-bleu transition hover:bg-gris active:scale-95 lg:grid"
            >
              {reduit ? (
                <PanelLeftOpen className="size-5" aria-hidden />
              ) : (
                <PanelLeftClose className="size-5" aria-hidden />
              )}
            </button>

            {/* Recherche d'outils */}
            <form action="/admin/outils" method="get" className="relative min-w-0 flex-1 sm:max-w-md">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-encre"
                aria-hidden
              />
              <input
                type="search"
                name="q"
                placeholder="Rechercher un outil…"
                aria-label="Rechercher un outil"
                className="h-10 w-full rounded-full border border-bordure bg-gris pl-10 pr-4 text-[14px] text-bleu placeholder:text-encre focus:border-vert focus:bg-white focus:outline-none"
              />
            </form>

            <span className="flex-1 hidden sm:block" aria-hidden />

            {/* Bouton vert « + Outil » (sans dégradé) */}
            <Link
              href="/admin/outils/nouveau"
              className="hidden h-10 shrink-0 items-center gap-1.5 rounded-full bg-vert px-4 text-[14px] font-semibold text-white shadow-[0_2px_10px_rgba(23,133,79,0.28)] transition hover:bg-vert-fonce active:scale-[0.98] md:inline-flex"
            >
              <Plus className="size-4" aria-hidden /> Outil
            </Link>

            {/* Cloche des propositions à modérer */}
            <Link
              href="/admin/propositions"
              aria-label={`Propositions d'outils à modérer${propositionsEnAttente > 0 ? ` : ${propositionsEnAttente} en attente` : ""}`}
              className="relative grid size-10 shrink-0 place-items-center rounded-full border border-bordure bg-white text-bleu transition hover:bg-gris active:scale-95"
            >
              <Bell className="size-[18px]" aria-hidden />
              {propositionsEnAttente > 0 && (
                <span className="absolute -top-1 -right-1 grid min-w-4.5 place-items-center rounded-full bg-lime px-1 py-0.5 text-[10px] leading-3 font-bold text-sapin ring-2 ring-white">
                  {propositionsEnAttente}
                </span>
              )}
            </Link>

            {/* Avatar */}
            <span className="shrink-0 [&>*]:cursor-pointer">{avatar}</span>
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </div>

        {/* Pied de page DÉDIÉ à la console */}
        <footer className="border-t border-bordure bg-white">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 lg:px-8">
            <p className="text-[12px] leading-4 text-encre">
              © {annee} Webgiverse — Console d'administration
            </p>
            <p className="flex items-center gap-1.5 text-[12px] leading-4 text-encre">
              <ShieldCheck className="size-3.5 text-vert" aria-hidden /> Espace réservé à
              l'équipe Webgiverse
            </p>
          </div>
        </footer>
      </div>

      {/* ═══ Tiroir mobile animé ═══ */}
      {/* Fond assombri */}
      <div
        aria-hidden
        onClick={() => setMenuOuvert(false)}
        className={cn(
          "fixed inset-0 z-[60] bg-sapin/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          menuOuvert ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      {/* Panneau coulissant */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu de la console d'administration"
        className={cn(
          "fixed inset-y-0 left-0 z-[61] flex w-[282px] max-w-[86vw] flex-col bg-sapin shadow-2xl transition-transform duration-300 ease-out lg:hidden",
          menuOuvert ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 pr-3">
          <div className="flex-1">{marque(false)}</div>
          <button
            type="button"
            onClick={() => setMenuOuvert(false)}
            aria-label="Fermer le menu"
            className="grid size-10 shrink-0 place-items-center rounded-full text-white transition hover:bg-white/10 active:scale-95"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {identite(false)}

        <nav
          aria-label="Menu de la console d'administration"
          className="flex-1 overflow-y-auto px-3 py-2"
        >
          {liensAdmin(false, () => setMenuOuvert(false))}
        </nav>

        <div className="grid gap-3 border-t border-white/10 p-3">
          {liensSortie(false, () => setMenuOuvert(false))}
          {pied}
        </div>
      </div>
    </>
  );
}