// components/layout/header.tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { LienLogo } from "@/components/commun/logo";
import { Bouton } from "@/components/ui/bouton";

const SUGGESTIONS = ["Code", "Vente", "Marketing", "SEO", "Vidéo", "Voix"];
const LIENS_ANNUAIRE = [
  { href: "/outils", label: "Outils IA" },
  { href: "/agents", label: "Agents" },
  { href: "/outils?tri=populaire", label: "Meilleurs outils" },
  { href: "/gratuits", label: "Gratuits" },
  { href: "/open-source", label: "Open source" },
  { href: "/comparer", label: "Comparer" },
  { href: "/categories", label: "Catégories" },
];

export function Header() {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [rechercheActive, setRechercheActive] = useState(false);
  const [connecte, setConnecte] = useState(false);
  const [estAdmin, setEstAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json())
      .then((s) => {
        setConnecte(Boolean(s?.user));
        setEstAdmin(s?.user?.role === "ADMIN");
      }).catch(() => {});
  }, []);

  // Le bouton s'adapte au rôle : « Espace Admin » → /admin pour les administrateurs,
  // « Mon espace » → /dashboard pour les utilisateurs connectés, « Connexion » sinon.
  const hrefEspace = estAdmin ? "/admin" : connecte ? "/dashboard" : "/connexion";
  const libelleEspace = estAdmin ? "Espace Admin" : connecte ? "Mon espace" : "Connexion";

  return (
    <header className="verre sticky top-0 z-50 border-b border-bordure">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 lg:h-[72px]">
        <LienLogo />

        {/* Recherche (desktop) avec suggestions rapides */}
        <form action="/outils" role="search"
          className="relative hidden flex-1 justify-center md:flex"
          onFocus={() => setRechercheActive(true)}
          onBlur={() => setRechercheActive(false)}>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-encre" aria-hidden />
            <input name="q" type="search" placeholder="Rechercher un outil, une tâche…"
              aria-label="Rechercher dans l'annuaire"
              className="min-h-11 w-full rounded-full border border-bordure bg-white/80 pr-4 pl-11 text-[15px] leading-5 text-bleu placeholder:text-encre/60 focus:border-violet focus:outline-none" />
            {rechercheActive && (
              <div className="absolute top-13 right-0 left-0 z-10 flex flex-wrap gap-2 rounded-carte border border-bordure bg-white p-3 shadow-carte"
                onMouseDown={(e) => e.preventDefault()}>
                <span className="w-full text-[12px] leading-4 font-medium tracking-wide text-encre uppercase">
                  Suggestions rapides
                </span>
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="submit" name="q" value={s}
                    className="rounded-full border border-bordure bg-gris px-3 py-1.5 text-[13px] leading-4 font-medium text-bleu hover:border-violet hover:text-violet">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Navigation desktop */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          <details className="group relative">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-full px-4 text-[15px] leading-5 font-medium text-bleu hover:bg-white/70 [&::-webkit-details-marker]:hidden">
              Annuaire
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="absolute top-full left-0 z-20 mt-1 grid w-56 gap-0.5 rounded-carte border border-bordure bg-white p-2 shadow-carte">
              {LIENS_ANNUAIRE.map((l) => (
                <Link key={l.href} href={l.href}
                  className="rounded-champ px-3 py-2 text-[15px] leading-5 text-bleu hover:bg-gris hover:text-violet">
                  {l.label}
                </Link>
              ))}
            </div>
          </details>
          <Link href="/actualites" className="rounded-full px-4 py-2.5 text-[15px] leading-5 font-medium text-bleu hover:bg-white/70">Actualités</Link>
          <Link href="/blog" className="rounded-full px-4 py-2.5 text-[15px] leading-5 font-medium text-bleu hover:bg-white/70">Blog</Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Bouton variante="secondaire" taille="sm" asChild className="hidden sm:inline-flex">
            <Link href="/proposer">Proposer un outil</Link>
          </Bouton>
          <Bouton taille="sm" asChild>
            <Link href={hrefEspace}>{libelleEspace}</Link>
          </Bouton>
          <button className="grid size-11 place-items-center rounded-full text-bleu hover:bg-white/70 lg:hidden"
            aria-expanded={menuOuvert} aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setMenuOuvert((v) => !v)}>
            {menuOuvert ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {menuOuvert && (
        <nav className="border-t border-bordure bg-white px-4 py-4 lg:hidden" aria-label="Navigation mobile">
          <form action="/outils" role="search" className="mb-4">
            <input name="q" type="search" placeholder="Rechercher un outil, une tâche…" aria-label="Rechercher"
              className="min-h-11 w-full rounded-full border border-bordure px-4 text-[15px] focus:border-violet focus:outline-none" />
          </form>
          <ul className="grid gap-1">
            {LIENS_ANNUAIRE.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setMenuOuvert(false)}
                  className="block rounded-champ px-3 py-2.5 text-[16px] leading-6 font-medium text-bleu hover:bg-gris">{l.label}</Link>
              </li>
            ))}
            <li><Link href="/actualites" onClick={() => setMenuOuvert(false)} className="block rounded-champ px-3 py-2.5 text-[16px] leading-6 font-medium text-bleu hover:bg-gris">Actualités</Link></li>
            <li><Link href="/blog" onClick={() => setMenuOuvert(false)} className="block rounded-champ px-3 py-2.5 text-[16px] leading-6 font-medium text-bleu hover:bg-gris">Blog</Link></li>
            <li><Link href="/proposer" onClick={() => setMenuOuvert(false)} className="block rounded-champ px-3 py-2.5 text-[16px] leading-6 font-medium text-violet hover:bg-gris">Proposer un outil</Link></li>
          </ul>
        </nav>
      )}
    </header>
  );
}