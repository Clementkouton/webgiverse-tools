// app/a-propos/page.tsx
// Lot 8 — refonte « style Aixploria » : hero + chiffres réels, points
// numérotés 01/02/03, richesses du site, méthode, parcours, contacts, CTA.
// Nouvelle charte : bleu #0b1b3f + ciel #00d1ff sur blanc —
// AUCUN violet, AUCUN dégradé sur cette page.
import type { Metadata } from "next";
import Link from "next/link";
import {
  Bot,
  Compass,
  FolderHeart,
  LayoutGrid,
  Mail,
  Newspaper,
  Star,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "Webgiverse est l'annuaire francophone des outils IA : sélection testée, explications en français, assistant de recommandation. Découvre notre mission et nos chiffres.",
};

// Les chiffres sont recalculés à chaque visite (page dynamique).
export const dynamic = "force-dynamic";

export default async function PageAPropos() {
  // Compteurs réels tirés de la base : la page reflète le vrai site.
  const [outilsAgents, categories, avis, membres] = await Promise.all([
    prisma.tool.count({ where: { statut: "PUBLIE" } }),
    prisma.category.count(),
    prisma.avis.count(),
    prisma.user.count(),
  ]);

  const chiffres = [
    { valeur: outilsAgents, legende: "Outils & agents référencés", icone: Compass },
    { valeur: categories, legende: "Catégories couvertes", icone: LayoutGrid },
    { valeur: avis, legende: "Avis de la communauté", icone: Star },
    { valeur: membres, legende: "Membres inscrits", icone: Users },
  ];

  // Pourquoi Webgiverse existe — format 01 / 02 / 03
  const raisons = [
    {
      numero: "01",
      titre: "Trop d'outils, trop peu de temps",
      texte:
        "Chaque semaine, des dizaines d'outils IA sortent. Entre les promesses marketing et les fiches jamais mises à jour, impossible de tout trier seul : chaque fiche de Webgiverse est testée et vérifiée par l'équipe, à la main.",
    },
    {
      numero: "02",
      titre: "L'IA expliquée en français",
      texte:
        "La plupart des ressources IA sont en anglais. Ici, chaque outil est expliqué dans un français clair : à quoi il sert, combien ça coûte, par où commencer — sans jargon inutile.",
    },
    {
      numero: "03",
      titre: "Des conseils honnêtes",
      texte:
        "Les avis viennent de vrais utilisateurs, pas des marques. Certains liens sont affiliés : ils financent le site sans jamais changer ton prix ni influencer les classements.",
    },
  ];

  // Ce que tu trouves sur Webgiverse
  const richesses = [
    {
      icone: Compass,
      titre: "L'annuaire testé",
      texte:
        "Des outils et des agents IA triés sur le volet : fiche complète en français, tarifs, niveau requis.",
    },
    {
      icone: Bot,
      titre: "L'assistant IA",
      texte:
        "Dis-lui ce que tu veux faire, il te recommande les bons outils — 10 questions offertes chaque mois.",
    },
    {
      icone: FolderHeart,
      titre: "Favoris & listes",
      texte:
        "Enregistre tes découvertes, organise-les en listes et suis ta progression outil par outil.",
    },
    {
      icone: Newspaper,
      titre: "Guides & actualités",
      texte:
        "Des articles et des brèves pour comprendre les nouveautés de l'IA, sans jargon ni hype.",
    },
    {
      icone: Star,
      titre: "Avis réels",
      texte:
        "Des notes et des retours de membres vérifiés — pas des promotions déguisées.",
    },
    {
      icone: Users,
      titre: "Un espace membre",
      texte:
        "Un compte gratuit pour tout garder : favoris, listes, recommandations et progression.",
    },
  ];

  // Comment on choisit un outil
  const etapes = [
    {
      numero: "1",
      titre: "On teste l'outil",
      texte:
        "On l'utilise réellement sur des cas concrets avant de le référencer : inscription, fonctions principales, facturation.",
    },
    {
      numero: "2",
      titre: "On vérifie les infos",
      texte:
        "Tarifs, langues disponibles, niveau requis : la fiche est mise à jour régulièrement pour rester exacte.",
    },
    {
      numero: "3",
      titre: "On l'explique simplement",
      texte:
        "Points forts, limites, cas d'usage : tu sais en 2 minutes si l'outil est fait pour toi.",
    },
  ];

  // Notre parcours — sans dates inventées : le présent et la suite.
  const parcours = [
    {
      periode: "Le départ",
      titre: "Un annuaire francophone, testé à la main",
      texte:
        "Webgiverse naît d'un constat simple : trouver un bon outil IA en français était un parcours du combattant. La première version est un annuaire curaté, outil par outil.",
    },
    {
      periode: "Aujourd'hui",
      titre: "Comptes membres, assistant IA et Premium",
      texte:
        "L'annuaire s'est équipé d'un assistant de recommandation, de favoris et de listes, d'avis de la communauté, et de plans Premium pour soutenir le projet.",
    },
    {
      periode: "La suite",
      titre: "Plus de guides, plus d'agents, plus de membres",
      texte:
        "Prochaines étapes : enrichir les guides, couvrir les agents IA de bout en bout et grandir avec la communauté — sans jamais sacrifier la sélection humaine.",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-h2 font-titre font-semibold text-bleu">
          À propos de Webgiverse
        </h1>
        <p className="mt-3 text-[20px] leading-7 font-semibold text-ciel-fonce">
          Donner une vision claire, fiable et utile de l&apos;écosystème IA — en français.
        </p>
      </header>

      {/* ── Chiffres réels ──────────────────────────────────────── */}
      <section aria-labelledby="titre-chiffres" className="mt-12">
        <h2 id="titre-chiffres" className="sr-only">
          Webgiverse en chiffres
        </h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {chiffres.map((c) => (
            <div
              key={c.legende}
              className="rounded-carte border border-bordure bg-white p-5 text-center shadow-carte"
            >
              <span className="mx-auto grid size-11 place-items-center rounded-carte bg-ciel/10">
                <c.icone className="size-5 text-ciel-fonce" aria-hidden />
              </span>
              <p className="mt-3 font-titre text-[30px] leading-9 font-bold text-bleu">
                {c.valeur.toLocaleString("fr-FR")}
              </p>
              <p className="mt-0.5 text-[13px] leading-4 text-encre">
                {c.legende}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Notre mission ───────────────────────────────────────── */}
      <section aria-labelledby="titre-mission" className="mx-auto mt-16 max-w-3xl text-center">
        <h2 id="titre-mission" className="font-titre text-h3 font-semibold text-bleu">
          Notre mission
        </h2>
        <p className="mt-4 text-[16px] leading-7 text-encre">
          Chaque semaine, de nouveaux outils IA apparaissent. Entre les promesses marketing, les
          tutoriels en anglais et les fiches jamais mises à jour, difficile de savoir par où
          commencer. Webgiverse est né de ce constat : un annuaire francophone où chaque outil est
          testé, expliqué simplement et noté par la communauté — pour que tu passes moins de temps
          à chercher et plus de temps à créer.
        </p>
      </section>

      {/* ── Pourquoi Webgiverse existe (01 / 02 / 03) ───────────── */}
      <section aria-labelledby="titre-pourquoi" className="mt-16">
        <h2
          id="titre-pourquoi"
          className="text-center font-titre text-h3 font-semibold text-bleu"
        >
          Pourquoi Webgiverse existe
        </h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {raisons.map((r) => (
            <div key={r.numero} className="border-t-2 border-bleu pt-5">
              <span
                aria-hidden
                className="font-titre text-[40px] leading-10 font-bold text-ciel-fonce"
              >
                {r.numero}
              </span>
              <h3 className="mt-3 font-titre text-[18px] leading-6 font-semibold text-bleu">
                {r.titre}
              </h3>
              <p className="mt-2 text-[14px] leading-6 text-encre">{r.texte}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Ce que tu trouves sur Webgiverse ────────────────────── */}
      <section aria-labelledby="titre-richesses" className="mt-16">
        <h2
          id="titre-richesses"
          className="text-center font-titre text-h3 font-semibold text-bleu"
        >
          Ce que tu trouves sur Webgiverse
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {richesses.map((r) => (
            <div
              key={r.titre}
              className="rounded-carte border border-bordure bg-white p-6 shadow-carte"
            >
              <span className="grid size-11 place-items-center rounded-carte bg-ciel/10">
                <r.icone className="size-5 text-ciel-fonce" aria-hidden />
              </span>
              <h3 className="mt-4 font-titre text-[17px] leading-6 font-semibold text-bleu">
                {r.titre}
              </h3>
              <p className="mt-2 text-[14px] leading-6 text-encre">{r.texte}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Comment on choisit un outil ─────────────────────────── */}
      <section aria-labelledby="titre-methode" className="mt-16">
        <h2
          id="titre-methode"
          className="text-center font-titre text-h3 font-semibold text-bleu"
        >
          Comment on choisit un outil
        </h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {etapes.map((e) => (
            <li
              key={e.numero}
              className="rounded-carte border border-bordure bg-white p-6 shadow-carte"
            >
              <span className="grid size-9 place-items-center rounded-full bg-bleu font-titre text-[15px] font-bold text-white">
                {e.numero}
              </span>
              <h3 className="mt-4 font-titre text-[17px] leading-6 font-semibold text-bleu">
                {e.titre}
              </h3>
              <p className="mt-2 text-[14px] leading-6 text-encre">{e.texte}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Notre parcours ──────────────────────────────────────── */}
      <section aria-labelledby="titre-parcours" className="mx-auto mt-16 max-w-3xl">
        <h2
          id="titre-parcours"
          className="text-center font-titre text-h3 font-semibold text-bleu"
        >
          Notre parcours
        </h2>
        <ol className="mt-8 ml-2 border-l-2 border-bordure">
          {parcours.map((p) => (
            <li key={p.periode} className="relative pb-9 pl-8 last:pb-0">
              <span
                aria-hidden
                className="absolute top-1 -left-[9px] size-4 rounded-full border-2 border-bleu bg-ciel"
              />
              <p className="text-[13px] leading-4 font-bold tracking-wide uppercase text-ciel-fonce">
                {p.periode}
              </p>
              <h3 className="mt-1 font-titre text-[18px] leading-6 font-semibold text-bleu">
                {p.titre}
              </h3>
              <p className="mt-1.5 text-[14px] leading-6 text-encre">{p.texte}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Contacts & médias ───────────────────────────────────── */}
      <section
        aria-labelledby="titre-contacts"
        className="mt-16 rounded-carte border border-bordure bg-white p-6 shadow-carte sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-carte bg-ciel/10">
              <Mail className="size-5 text-ciel-fonce" aria-hidden />
            </span>
            <div>
              <h2 id="titre-contacts" className="font-titre text-[18px] leading-6 font-semibold text-bleu">
                Contacts &amp; médias
              </h2>
              <p className="mt-1 max-w-xl text-[14px] leading-6 text-encre">
                Une question, une interview, un partenariat ? L&apos;équipe répond sous 24 à 48 h
                ouvrées, en français.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-bleu px-6 text-[15px] leading-5 font-semibold text-white transition hover:bg-[#12295c]"
            >
              Nous écrire
            </Link>
            <Link
              href="/annonceurs"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-bleu bg-white px-6 text-[15px] leading-5 font-semibold text-bleu transition hover:bg-gris"
            >
              Espace annonceurs
            </Link>
          </div>
        </div>
      </section>

      {/* ── Appel à l'action ────────────────────────────────────── */}
      <section className="mt-14 overflow-hidden rounded-carte bg-bleu p-8 text-center sm:p-12">
        <h2 className="font-titre text-h3 font-semibold text-white">
          Prêt à trouver ton outil ?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-[15px] leading-6 text-white/70">
          Explore l&apos;annuaire, compare les outils et crée ton compte
          gratuit en moins d&apos;une minute.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/outils"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-ciel px-8 text-[16px] leading-5 font-semibold text-bleu transition hover:brightness-95"
          >
            Explorer les outils
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 bg-white/10 px-8 text-[16px] leading-5 font-semibold text-white transition hover:bg-white/20"
          >
            Nous contacter
          </Link>
        </div>
      </section>
    </div>
  );
}