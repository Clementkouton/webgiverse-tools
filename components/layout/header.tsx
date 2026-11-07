// components/layout/header.tsx
// ─────────────────────────────────────────────────────────────────
// Header recentré sur l'essentiel : Annuaire, Prompts IA, Tutoriels,
// Premium + bouton d'espace. La barre de recherche, Actualités, Blog
// et « Proposer un outil » quittent le header (ils restent accessibles
// depuis l'accueil et le footer). Nouveau : état actif violet sur la
// section en cours de visite. Charte Webgiverse inchangée.
// Lot 37 — le menu déroulant « Annuaire » (élément <details> natif)
// RESTAIT OUVERT après un clic sur un de ses liens : la navigation
// Next.js ne recharge pas le header, donc le <details> conservait son
// attribut « open » sur la nouvelle page. Correctifs :
//   1. fermeture automatique à chaque changement de page (usePathname) ;
//   2. fermeture au clic sur un lien du menu ;
//   3. fermeture au clic en dehors du menu ;
//   4. fermeture avec la touche Échap.
// Le menu mobile se referme lui aussi à chaque changement de page.
// ─────────────────────────────────────────────────────────────────
"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X, Sparkles } from "lucide-react";
import { LienLogo } from "@/components/commun/logo";
import { Bouton } from "@/components/ui/bouton";

const LIENS_ANNUAIRE = [
  { href: "/outils", label: "Outils IA" },
  { href: "/agents", label: "Agents" },
  { href: "/outils?tri=populaire", label: "Meilleurs outils" },
  { href: "/gratuits", label: "Gratuits" },
  { href: "/open-source", label: "Open source" },
  { href: "/comparer", label: "Comparer" },
  { href: "/categories", label: "Catégories" },
];

/** Bases d'URL qui « allument » le menu Annuaire quand on y navigue. */
const BASES_ANNUAIRE = [
  "/outils",
  "/agents",
  "/gratuits",
  "/open-source",
  "/comparer",
  "/categories",
];

export function Header() {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [connecte, setConnecte] = useState(false);
  const [estAdmin, setEstAdmin] = useState(false);
  const chemin = usePathname();
  // Référence du <details> « Annuaire » pour pouvoir le refermer par code.
  const refMenuAnnuaire = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json())
      .then((s) => {
        setConnecte(Boolean(s?.user));
        setEstAdmin(s?.user?.role === "ADMIN");
      }).catch(() => {});
  }, []);

  // ── Lot 37 : refermer les menus à chaque changement de page ─────────
  // La navigation client (liens <Link>) ne remonte pas le header : sans
  // ce nettoyage, le <details> restait ouvert sur la nouvelle interface.
  useEffect(() => {
    refMenuAnnuaire.current?.removeAttribute("open");
    setMenuOuvert(false);
  }, [chemin]);

  // ── Lot 37 : clic en dehors du menu ou touche Échap → fermeture ─────
  useEffect(() => {
    function surClicHors(e: MouseEvent) {
      const cible = e.target as Node | null;
      if (refMenuAnnuaire.current && cible && !refMenuAnnuaire.current.contains(cible)) {
        refMenuAnnuaire.current.removeAttribute("open");
      }
    }
    function surEchap(e: KeyboardEvent) {
      if (e.key === "Escape") {
        refMenuAnnuaire.current?.removeAttribute("open");
        setMenuOuvert(false);
      }
    }
    document.addEventListener("click", surClicHors);
    window.addEventListener("keydown", surEchap);
    return () => {
      document.removeEventListener("click", surClicHors);
      window.removeEventListener("keydown", surEchap);
    };
  }, []);

  // ── Navigation unique dans le Dashboard ET la Console Admin ──────────
  // Ces deux espaces possèdent leur propre navigation professionnelle
  // (menu latéral fixe sur ordinateur, barre supérieure + tiroir sur mobile).
  // On masque donc ce header général du site sur toutes les pages
  // commençant par /dashboard ou /admin, pour ne jamais afficher deux barres.
  // (Le hook usePathname est appelé AVANT ce retour anticipé : les règles
  // des hooks React sont respectées.)
  if (chemin.startsWith("/dashboard") || chemin.startsWith("/admin")) return null;

  // Le bouton s'adapte au rôle : « Espace Admin » → /admin pour les administrateurs,
  // « Mon espace » → /dashboard pour les utilisateurs connectés, « Connexion » sinon.
  const hrefEspace = estAdmin ? "/admin" : connecte ? "/dashboard" : "/connexion";
  const libelleEspace = estAdmin ? "Espace Admin" : connecte ? "Mon espace" : "Connexion";

  // ── États actifs : la section en cours est surlignée en violet ───────
  const annuaireActif = BASES_ANNUAIRE.some((b) => chemin.startsWith(b));
  const promptsActif = chemin === "/prompts" || chemin.startsWith("/prompts/");
  const tutorielsActif = chemin.startsWith("/tutoriels");
  const premiumActif = chemin.startsWith("/tarifs");

  /** Classe commune des liens simples : actif = pastille violette. */
  const classeLien = (actif: boolean) =>
    `rounded-full px-4 py-2.5 text-[15px] leading-5 font-medium transition ${
      actif
        ? "bg-violet/10 text-violet"
        : "text-bleu hover:bg-violet/10 hover:text-violet"
    }`;

  return (
    <header className="verre  items-center sticky top-0 z-50 border-b border-bordure *:backdrop-blur-[2px]">
      <div className="mx-auto  flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-3 lg:h-[72px]">
        <LienLogo />

        {/* Navigation desktop */}
        <nav className="hidden items-center  lg:flex" aria-label="Navigation principale">
          <details ref={refMenuAnnuaire} className="group relative">
            <summary
              className={`flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-full px-4 text-[15px] leading-5 font-medium transition [&::-webkit-details-marker]:hidden  hover:text-sky-500-clair ${
                annuaireActif
                  ? "bg-violet/10 text-violet"
                  : "text-bleu hover:bg-violet/10 hover:text-violet"
              }`}
            >
              Annuaire
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="absolute top-full left-0 z-20 mt-1 grid w-56 gap-0.5 rounded-carte border border-bordure bg-white p-2 shadow-carte">
              {LIENS_ANNUAIRE.map((l) => (
                <Link key={l.href} href={l.href}
                  onClick={() => refMenuAnnuaire.current?.removeAttribute("open")}
                  className="rounded-champ px-3 py-2 text-[15px] leading-5 text-bleu hover:bg-gris hover:text-violet">
                  {l.label}
                </Link>
              ))}
            </div>
          </details>
          <Link href="/prompts" aria-current={promptsActif ? "page" : undefined} className={classeLien(promptsActif) + " hover:text-sky-500-clair"}>
            Prompts IA
          </Link>
          <Link href="/tutoriels" aria-current={tutorielsActif ? "page" : undefined} className={classeLien(tutorielsActif) + " hover:text-sky-500-clair"}>
            Tutoriels
          </Link>
          <Link href="/tarifs" aria-current={premiumActif ? "page" : undefined}
            className={
              premiumActif
                ? "inline-flex items-center gap-1.5 rounded-full bg-violet px-4 py-2.5 text-[15px] leading-5 font-semibold shadow-[0_2px_4px_rgba(109,59,255,0.10)]"
                : "inline-flex items-center gap-1.5 rounded-full bg-violet/10 px-4 py-2.5 text-[15px] leading-5 font-semibold text-black transition hover:text-sky-500-clair hover:shadow-[0_2px_12px_rgba(106,59,255,0.28)]"
            }>
            <Sparkles className="size-4" aria-hidden /> Premium
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          
          <Bouton taille="sm" asChild>
            <Link href={hrefEspace}>{libelleEspace}</Link>
          </Bouton>
          <button className="grid size-11 place-items-center rounded-full text-bleu hover:bg-violet/10 lg:hidden"
            aria-expanded={menuOuvert} aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setMenuOuvert((v) => !v)}>
            {menuOuvert ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Menu mobile — mêmes priorités que le desktop : l'annuaire est
          regroupé sous son étiquette, puis les deux vitrines (Prompts IA,
          Tutoriels) et Premium. Plus de recherche ni de liens secondaires. */}
      {menuOuvert && (
        <nav className="border-t border-bordure bg-white px-4 py-4 lg:hidden" aria-label="Navigation mobile">
          <p className="px-3 pb-1 text-[12px] leading-4 font-semibold tracking-wide text-encre uppercase">
            Annuaire
          </p>
          <ul className="grid gap-1">
            {LIENS_ANNUAIRE.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setMenuOuvert(false)}
                  className="block rounded-champ px-3 py-2.5 text-[16px] leading-6 font-medium text-bleu hover:bg-gris hover:text-violet">{l.label}</Link>
              </li>
            ))}
            <li aria-hidden className="my-2 border-t border-bordure" />
            <li>
              <Link href="/prompts" onClick={() => setMenuOuvert(false)}
                className="block rounded-champ px-3 py-2.5 text-[16px] leading-6 font-semibold text-violet hover:bg-gris">
                Prompts IA
              </Link>
            </li>
            <li>
              <Link href="/tutoriels" onClick={() => setMenuOuvert(false)}
                className="block rounded-champ px-3 py-2.5 text-[16px] leading-6 font-medium text-bleu hover:bg-gris hover:text-violet">
                Tutoriels
              </Link>
            </li>
            <li>
              <Link href="/tarifs" onClick={() => setMenuOuvert(false)}
                className="flex items-center gap-2 rounded-champ px-3 py-2.5 text-[16px] leading-6 font-semibold text-violet hover:bg-gris">
                <Sparkles className="size-4" aria-hidden /> Passer Premium
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}