// components/admin/menu-admin.tsx
// ─────────────────────────────────────────────────────────────────
// Console d'administration — LA SEULE navigation de l'espace /admin.
//   • Ordinateur : barre latérale sombre pleine hauteur (bleu nuit),
//     sections groupées : Pilotage / Catalogue / Modération / Monétisation.
//   • Mobile : barre supérieure collante + tiroir coulissant animé.
// Le header et le footer du site sont masqués sur /admin.
// L'état actif suit l'URL (/admin, /admin/outils, /admin/articles…).
// ─────────────────────────────────────────────────────────────────
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareQuote,
  Newspaper,
  ShieldCheck,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { deconnexionAction } from "@/app/actions/authentification";

type Props = {
  prenom: string;
  image: string | null;
  /** Nombre de propositions d'outils en attente (badge du menu). */
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
      { href: "/admin", libelle: "Tableau de bord", icone: Gauge, exacte: true, notification: true },
    ],
  },
  {
    titre: "Catalogue",
    liens: [
      { href: "/admin/outils", libelle: "Outils", icone: Wrench },
      { href: "/admin/articles", libelle: "Articles", icone: Newspaper },
    ],
  },
  {
    titre: "Modération",
    liens: [
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
  const chemin = usePathname();

  // Ferme le tiroir à chaque navigation
  useEffect(() => {
    setMenuOuvert(false);
  }, [chemin]);

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

  const initiale = (prenom || "A").trim().charAt(0).toUpperCase() || "A";

  const avatar = image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image}
      alt=""
      className="size-10 shrink-0 rounded-full border-2 border-ciel/40 object-cover"
    />
  ) : (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[linear-gradient(120deg,#6a3bff,#00d1ff)] font-titre text-[15px] font-bold text-white">
      {initiale}
    </span>
  );

  /** Bloc identité (partagé entre la sidebar et le tiroir mobile). */
  const identite = (
    <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
      {avatar}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] leading-5 font-semibold text-white">
          {prenom ? prenom.trim().split(/\s+/)[0] : "Admin"}
        </p>
        <p className="inline-flex items-center gap-1 text-[12px] leading-4 font-semibold text-ciel">
          <ShieldCheck className="size-3.5" aria-hidden /> Administrateur
        </p>
      </div>
    </div>
  );

  /** Liens des 4 sections (styles sombres, partagés sidebar + tiroir). */
  function liensAdmin(surClic?: () => void) {
    return SECTIONS.map((section) => (
      <div key={section.titre} className="mt-5 first:mt-1">
        <p className="px-3.5 pb-1.5 text-[11px] leading-4 font-bold uppercase tracking-[0.14em] text-ciel/70">
          {section.titre}
        </p>
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
                aria-current={actif ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-champ px-3.5 py-2.5 text-[14px] leading-5 font-semibold transition-all duration-200",
                  actif
                    ? "bg-[linear-gradient(100deg,#6a3bff,#8f6bff)] text-white shadow-[0_4px_14px_rgba(106,59,255,0.4)]"
                    : "text-white/75 hover:bg-white/10 hover:text-white active:scale-[0.98]"
                )}
              >
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
                {lien.notification && propositionsEnAttente > 0 && (
                  <span
                    title={`${propositionsEnAttente} proposition(s) à traiter`}
                    className="animate-pulse shrink-0 rounded-full bg-magenta px-1.5 py-0.5 text-[10px] leading-3.5 font-bold text-white"
                  >
                    {propositionsEnAttente}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    ));
  }

  /** Liens de sortie : espace utilisateur + site public. */
  function liensSortie(surClic?: () => void) {
    return (
      <div className="grid gap-0.5">
        {LIENS_SORTIE.map((lien) => (
          <Link
            key={lien.href}
            href={lien.href}
            onClick={surClic}
            className="group flex items-center gap-3 rounded-champ px-3.5 py-2.5 text-[14px] leading-5 font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <lien.icone
              className="size-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110"
              aria-hidden
            />
            {lien.libelle}
          </Link>
        ))}
      </div>
    );
  }

  const annee = new Date().getFullYear();

  return (
    <>
      {/* ═══ Barre latérale sombre pleine hauteur — desktop ═══ */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] flex-col bg-bleu lg:flex">
        {/* Marque de la console */}
        <div className="border-b border-white/10 px-5 py-4">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-champ bg-[linear-gradient(120deg,#6a3bff,#00d1ff)] shadow-[0_4px_14px_rgba(106,59,255,0.4)]"
            >
              <ShieldCheck className="size-5 text-white" />
            </span>
            <span className="min-w-0">
              <span className="block font-titre text-[15px] leading-5 font-bold text-white">
                Webgiverse
              </span>
              <span className="block text-[11px] leading-4 font-bold uppercase tracking-[0.16em] text-ciel">
                Console admin
              </span>
            </span>
          </Link>
        </div>

        {identite}

        <nav
          aria-label="Menu de la console d'administration"
          className="flex-1 overflow-y-auto px-3 py-2"
        >
          {liensAdmin()}
        </nav>

        {/* Bas du menu : sorties + déconnexion (contenu serveur) */}
        <div className="grid gap-3 border-t border-white/10 p-3">
          {liensSortie()}
          {pied}
        </div>
      </aside>

      {/* ═══ Contenu principal ═══ */}
      {/* w-full + overflow-x-clip : aucun enfant ne peut élargir la page
          au-delà de l'écran (même correctif que le Dashboard) */}
      <div className="flex min-h-dvh w-full flex-col overflow-x-clip lg:pl-[268px]">
        {/* Barre supérieure mobile collante (sombre, identité admin) */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-bleu lg:hidden">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
            <button
              type="button"
              onClick={() => setMenuOuvert(true)}
              aria-label="Ouvrir le menu de la console"
              aria-expanded={menuOuvert}
              className="relative grid size-11 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
            >
              <Menu className="size-5" aria-hidden />
              {propositionsEnAttente > 0 && (
                <span
                  aria-hidden
                  className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-magenta"
                />
              )}
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <ShieldCheck className="size-5 shrink-0 text-ciel" aria-hidden />
              <p className="truncate font-titre text-[15px] leading-5 font-bold text-white">
                Administration
              </p>
            </div>
            {/* Déconnexion en un tap, directement depuis la barre mobile */}
            <form action={deconnexionAction}>
              <button
                type="submit"
                aria-label="Se déconnecter"
                className="grid size-11 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 hover:text-magenta active:scale-95"
              >
                <LogOut className="size-5" aria-hidden />
              </button>
            </form>
            {avatar}
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-10">
          {children}
        </div>

        {/* Pied de page DÉDIÉ à la console */}
        <footer className="border-t border-bordure bg-white">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 lg:px-8">
            <p className="text-[12px] leading-4 text-encre">
              © {annee} Webgiverse — Console d'administration
            </p>
            <p className="flex items-center gap-1.5 text-[12px] leading-4 text-encre">
              <ShieldCheck className="size-3.5 text-violet" aria-hidden /> Espace réservé à
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
          "fixed inset-0 z-[60] bg-bleu/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          menuOuvert ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      {/* Panneau coulissant */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu de la console d'administration"
        className={cn(
          "fixed inset-y-0 left-0 z-[61] flex w-[282px] max-w-[86vw] flex-col bg-bleu shadow-2xl transition-transform duration-300 ease-out lg:hidden",
          menuOuvert ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="grid size-9 place-items-center rounded-champ bg-[linear-gradient(120deg,#6a3bff,#00d1ff)]"
            >
              <ShieldCheck className="size-5 text-white" />
            </span>
            <div>
              <p className="font-titre text-[15px] leading-4 font-bold text-white">Webgiverse</p>
              <p className="text-[11px] leading-3.5 font-bold uppercase tracking-[0.16em] text-ciel">
                Console admin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMenuOuvert(false)}
            aria-label="Fermer le menu"
            className="grid size-10 place-items-center rounded-full text-white transition hover:bg-white/10 active:scale-95"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {identite}

        <nav
          aria-label="Menu de la console d'administration"
          className="flex-1 overflow-y-auto px-3 py-2"
        >
          {liensAdmin(() => setMenuOuvert(false))}
        </nav>

        <div className="grid gap-3 border-t border-white/10 p-3">
          {liensSortie(() => setMenuOuvert(false))}
          {pied}
        </div>
      </div>
    </>
  );
}