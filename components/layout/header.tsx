// components/layout/header.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 42 — reprend le header Lot 40 et ajoute whitespace-nowrap sur
// chaque lien de la nav : « Prompts IA » ne peut JAMAIS se couper
// sur deux lignes, même sur un écran PC juste à 1024 px.
//
//   1. CORRECTIF « L'ONGLET ANNUAIRE NE SE FERME PAS » : menu piloté
//      par état — fermeture au clic extérieur, Échap, changement de page.
//   2. NAVIGATION CENTRÉE SUR PC : les 5 liens (Annuaire, Prompts IA,
//      Tutoriels, Skills, Premium) sont PARFAITEMENT centrés dans la
//      barre (position absolue centrée).
//   3. CORRECTIF « TITRE MASQUÉ » : la barre est sticky DANS le flux
//      → elle ne recouvre plus jamais le contenu des pages.
// ⚠️ Fichier COMPLET : remplace TOUT le contenu de ton header.tsx.
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
  // Lot 40 — remplace le <details> du menu Annuaire
  const [annuaireOuvert, setAnnuaireOuvert] = useState(false);
  const [connecte, setConnecte] = useState(false);
  const [estAdmin, setEstAdmin] = useState(false);
  const chemin = usePathname();
  // Lot 40 — repère du bloc Annuaire pour détecter les clics extérieurs
  const blocAnnuaireRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json())
      .then((s) => {
        setConnecte(Boolean(s?.user));
        setEstAdmin(s?.user?.role === "ADMIN");
      }).catch(() => {});
  }, []);

  // ── Lot 40 · CORRECTIF 1 — fermeture fiable du menu Annuaire ────────
  // Clic à l'extérieur → ferme. Touche Échap → ferme tout.
  useEffect(() => {
    function clicExterieur(e: MouseEvent) {
      if (blocAnnuaireRef.current && !blocAnnuaireRef.current.contains(e.target as Node)) {
        setAnnuaireOuvert(false);
      }
    }
    function toucheEchap(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAnnuaireOuvert(false);
        setMenuOuvert(false);
      }
    }
    document.addEventListener("mousedown", clicExterieur);
    document.addEventListener("keydown", toucheEchap);
    return () => {
      document.removeEventListener("mousedown", clicExterieur);
      document.removeEventListener("keydown", toucheEchap);
    };
  }, []);

  // ── Lot 40 · changement de page → tout se referme ───────────────────
  useEffect(() => {
    setAnnuaireOuvert(false);
    setMenuOuvert(false);
  }, [chemin]);

  // ── Navigation unique dans le Dashboard ET la Console Admin ──────────
  // (hook usePathname et effets appelés AVANT ce retour anticipé :
  // les règles des hooks React sont respectées.)
  if (chemin.startsWith("/dashboard") || chemin.startsWith("/admin")) return null;

  // Le bouton s'adapte au rôle : « Espace Admin » → /admin pour les administrateurs,
  // « Mon espace » → /dashboard pour les utilisateurs connectés, « Connexion » sinon.
  const hrefEspace = estAdmin ? "/admin" : connecte ? "/dashboard" : "/connexion";
  const libelleEspace = estAdmin ? "Espace Admin" : connecte ? "Mon espace" : "Connexion";

  // ── États actifs : la section en cours est surlignée en violet ───────
  const annuaireActif = BASES_ANNUAIRE.some((b) => chemin.startsWith(b));
  const promptsActif = chemin === "/prompts" || chemin.startsWith("/prompts/");
  const tutorielsActif = chemin.startsWith("/tutoriels");
  const skillsActif = chemin.startsWith("/skills");
  const premiumActif = chemin.startsWith("/tarifs");

  /** Classe commune des liens simples : actif = pastille violette. */
  const classeLien = (actif: boolean) =>
    `rounded-[7px] -skew-x-[18deg] not-italic px-4 py-2.5 text-[15px] leading-5 font-medium whitespace-nowrap transition hover:bg-gris hover:text-sky-500 ${
      actif
        ? "bg-violet/10 text-sky-500"
        : "text-bleu hover:bg-violet/10 hover:text-sky-500"
    }`;

  return (
    <header className="verre sticky top-0 z-50 border-b border-bordure">
      {/* Lot 40 · CORRECTIF 2 — conteneur « relative » pour centrer la nav */}
      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-3 lg:h-[72px]">
        <LienLogo />

        {/* Navigation desktop — PARFAITEMENT CENTRÉE dans la barre (Lot 40) */}
        <nav
          className="absolute top-1/2 left-1/2 z-20 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 lg:flex"
          aria-label="Navigation principale"
        >
          {/* Lot 40 · menu Annuaire piloté par état (fini le <details>) */}
          <div className="relative" ref={blocAnnuaireRef}>
            <button
              type="button"
              onClick={() => setAnnuaireOuvert((v) => !v)}
              aria-expanded={annuaireOuvert}
              aria-haspopup="true"
              className={`flex min-h-11 cursor-pointer items-center gap-1 rounded-[7px] -skew-x-[18deg] not-italic px-4 text-[15px] leading-5 font-medium whitespace-nowrap transition hover:bg-gris hover:text-sky-500 ${
                annuaireActif
                  ? "bg-violet/10 text-violet"
                  : "text-bleu hover:bg-violet/10 hover:text-violet"
              }`}
            >
              Annuaire
              <ChevronDown
                className={`size-4 transition-transform ${annuaireOuvert ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            {annuaireOuvert && (
              <div className="absolute top-full left-0 z-30 mt-1 grid w-56 gap-0.5 rounded-carte border border-bordure bg-white p-2 shadow-carte">
                {LIENS_ANNUAIRE.map((l) => (
                  <Link key={l.href} href={l.href}
                    onClick={() => setAnnuaireOuvert(false)}
                    className="rounded-champ px-3 py-2 text-[15px] leading-5 text-bleu hover:bg-gris hover:text-violet">
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link href="/prompts" aria-current={promptsActif ? "page" : undefined} className={classeLien(promptsActif)}>
            Prompts IA
          </Link>
          <Link href="/tutoriels" aria-current={tutorielsActif ? "page" : undefined} className={classeLien(tutorielsActif)}>
            Tutoriels
          </Link>
          {/* Section Skills (réservée aux abonnés) */}
          <Link href="/skills" aria-current={skillsActif ? "page" : undefined}
            className={
              skillsActif
                ? "inline-flex items-center gap-1.5 rounded-[7px] -skew-x-[18deg] not-italic bg-violet/10 px-4 py-2.5 text-[15px] leading-5 font-semibold whitespace-nowrap text-violet hover:bg-violet/10 hover:text-sky-500"
                : "inline-flex items-center gap-1.5 rounded-[7px] -skew-x-[18deg] not-italic px-4 py-2.5 text-[15px] leading-5 font-semibold whitespace-nowrap text-violet/80 transition hover:bg-violet/10 hover:text-sky-500"
            }>
            <Sparkles className="size-4" aria-hidden /> Skills
          </Link>
          <Link href="/tarifs" aria-current={premiumActif ? "page" : undefined}
            className={
              premiumActif
                ? "inline-flex items-center gap-1.5 rounded-[7px] -skew-x-[18deg] not-italic bg-violet px-4 py-2.5 text-[15px] leading-5 font-semibold whitespace-nowrap text-sky-500 shadow-[0_2px_12px_rgba(106,59,255,0.28)] hover:bg-violet/90 hover:text-sky-500"
                : "inline-flex items-center gap-1.5 rounded-[7px] -skew-x-[18deg] not-italic bg-violet/10 px-4 py-2.5 text-[15px] leading-5 font-semibold whitespace-nowrap text-violet transition hover:bg-violet hover:text-sky-500"
            }>
            <Sparkles className="size-4" aria-hidden /> Premium
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Bouton taille="sm" asChild>
            <Link href={hrefEspace}>{libelleEspace}</Link>
          </Bouton>
          <button className="grid size-11 place-items-center rounded-[7px] -skew-x-[18deg] not-italic text-bleu hover:bg-violet/10 lg:hidden"
            aria-expanded={menuOuvert} aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setMenuOuvert((v) => !v)}>
            {menuOuvert ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Menu mobile — mêmes priorités que le desktop : l'annuaire est
          regroupé sous son étiquette, puis les vitrines (Prompts IA,
          Tutoriels, Skills) et Premium. */}
      {menuOuvert && (
        <nav className="border-t border-bordure bg-white px-4 py-4 lg:hidden" aria-label="Navigation mobile">
          <p className="px-3 pb-1 text-[12px] leading-4 font-semibold tracking-wide text-encre uppercase">
            Annuaire
          </p>
          <ul className="grid gap-1">
            {LIENS_ANNUAIRE.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setMenuOuvert(false)}
                  className="block rounded-champ px-3 py-2.5 text-[16px] leading-6 font-medium text-bleu hover:bg-gris hover:text-sky-500">{l.label}</Link>
              </li>
            ))}
            <li aria-hidden className="my-2 border-t border-bordure hover:bg-gris hover:text-sky-500" />
            <li>
              <Link href="/prompts" onClick={() => setMenuOuvert(false)}
                className="block rounded-champ px-3 py-2.5 text-[16px] leading-6 font-semibold text-violet hover:bg-gris hover:text-sky-500">
                Prompts IA
              </Link>
            </li>
            <li>
              <Link href="/tutoriels" onClick={() => setMenuOuvert(false)}
                className="block rounded-champ px-3 py-2.5 text-[16px] leading-6 font-medium text-bleu hover:bg-gris hover:text-sky-500">
                Tutoriels
              </Link>
            </li>
            <li>
              <Link href="/skills" onClick={() => setMenuOuvert(false)}
                className="flex items-center gap-2 rounded-champ px-3 py-2.5 text-[16px] leading-6 font-semibold text-violet hover:bg-gris hover:text-sky-500">
                <Sparkles className="size-4" aria-hidden /> Skills
                <span className="rounded-[7px] -skew-x-[18deg] not-italic bg-violet/10 px-2 py-0.5 text-[11px] leading-4 font-bold text-violet">Premium</span>
              </Link>
            </li>
            <li>
              <Link href="/tarifs" onClick={() => setMenuOuvert(false)}
                className="flex items-center gap-2 rounded-champ px-3 py-2.5 text-[16px] leading-6 font-semibold text-violet hover:bg-gris hover:text-sky-500">
                <Sparkles className="size-4" aria-hidden /> Passer Premium
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}