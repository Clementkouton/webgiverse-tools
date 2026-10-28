import type { Metadata } from "next";
import Link from "next/link";
import {
  Compass,
  HeartHandshake,
  LayoutGrid,
  ListChecks,
  MessageCircle,
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

  const raisons = [
    {
      icone: ListChecks,
      titre: "Une sélection humaine",
      texte:
        "Chaque fiche est rédigée et vérifiée par l'équipe : pas de listings automatiques de 10 000 outils dont la moitié sont morts. On privilégie la qualité à la quantité.",
    },
    {
      icone: MessageCircle,
      titre: "100 % en français",
      texte:
        "La plupart des ressources IA sont en anglais. Webgiverse explique chaque outil dans un français clair : à quoi il sert, combien ça coûte, par où commencer.",
    },
    {
      icone: HeartHandshake,
      titre: "Des conseils honnêtes",
      texte:
        "Les avis viennent de vrais utilisateurs, pas des marques. Certains liens sont affiliés : ils financent le site sans jamais changer ton prix ni influencer les classements.",
    },
  ];

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

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12">
      {/* ── Mission ─────────────────────────────────────────────── */}
      <header className="max-w-3xl">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-violet/30 bg-violet/5 px-3 py-1 text-[12px] leading-4 font-semibold text-violet">
          Apprendre · Créer · Réussir
        </p>
        <h1 className="mt-4 font-titre text-h2 text-encre">
          Notre mission : t&apos;aider à trouver le{" "}
          <span className="texte-degrade">bon outil IA</span>, sans perdre de
          temps.
        </h1>
        <p className="mt-4 text-[16px] leading-7 text-encre">
          Chaque semaine, de nouveaux outils IA apparaissent. Entre les
          promesses marketing, les tutoriels en anglais et les fiches jamais
          mises à jour, difficile de savoir par où commencer. Webgiverse est
          né de ce constat : un annuaire francophone où chaque outil est
          testé, expliqué simplement et noté par la communauté — pour que tu
          passes moins de temps à chercher et plus de temps à créer.
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
              className="survol-carte rounded-carte border border-bordure bg-white p-5 text-center shadow-carte"
            >
              <span className="mx-auto grid size-11 place-items-center rounded-carte bg-violet/10">
                <c.icone className="size-5 text-violet" aria-hidden />
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

      {/* ── Pourquoi Webgiverse ─────────────────────────────────── */}
      <section aria-labelledby="titre-pourquoi" className="mt-14">
        <h2
          id="titre-pourquoi"
          className="font-titre text-h3 font-semibold text-bleu"
        >
          Pourquoi Webgiverse ?
        </h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {raisons.map((r) => (
            <div
              key={r.titre}
              className="survol-carte rounded-carte border border-bordure bg-white p-6 shadow-carte"
            >
              <span className="grid size-11 place-items-center rounded-carte bg-violet/10">
                <r.icone className="size-5 text-violet" aria-hidden />
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
      <section aria-labelledby="titre-methode" className="mt-14">
        <h2
          id="titre-methode"
          className="font-titre text-h3 font-semibold text-bleu"
        >
          Comment on choisit un outil
        </h2>
        <ol className="mt-6 grid gap-5 md:grid-cols-3">
          {etapes.map((e) => (
            <li
              key={e.numero}
              className="rounded-carte border border-bordure bg-white p-6 shadow-carte"
            >
              <span className="grid size-9 place-items-center rounded-full bg-violet font-titre text-[15px] font-bold text-white">
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
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] px-8 text-[16px] leading-5 font-semibold text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)] transition hover:brightness-110"
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