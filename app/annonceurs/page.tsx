import type { Metadata } from "next";
import { Check, Megaphone, ShieldCheck, Target, TrendingUp, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Carte } from "@/components/ui/carte";
import { FormulaireAnnonceur } from "@/components/annonceurs/formulaire-annonceur";

export const metadata: Metadata = {
  title: "Annonceurs — mettez votre outil IA en avant",
  description:
    "Affichez votre outil IA dans la section « À la une » de Webgiverse, devant une audience francophone qualifiée : freelances, étudiants et entrepreneurs. Emplacements limités, activation sous 24 h.",
};

// Les compteurs sont recalculés à chaque visite (page dynamique),
// comme sur la page À propos : on n'affiche que des chiffres réels.
export const dynamic = "force-dynamic";

export default async function PageAnnonceurs() {
  const [outils, categories, membres] = await Promise.all([
    prisma.tool.count({ where: { statut: "PUBLIE" } }),
    prisma.category.count(),
    prisma.user.count(),
  ]);

  const atouts = [
    {
      icone: Target,
      titre: "Une audience qualifiée",
      texte:
        "Tes visiteurs arrivent avec une intention précise : trouver un outil comme le tien. Pas du trafic aléatoire, mais des gens prêts à essayer — freelances, étudiants, entrepreneurs francophones.",
    },
    {
      icone: Megaphone,
      titre: "Une visibilité immédiate",
      texte:
        "Ta fiche remonte dans « À la une » sur la page d'accueil, et gagne la priorité dans les suggestions d'alternatives et le classement des outils populaires.",
    },
    {
      icone: ShieldCheck,
      titre: "Quatre emplacements seulement",
      texte:
        "La section « À la une » affiche au maximum 4 outils : ta visibilité n'est jamais noyée parmi des dizaines de bannières concurrentes.",
    },
  ];

  const formules = [
    {
      nom: "Une semaine",
      prix: "$19",
      periode: "/ 7 jours",
      recommande: false,
      avantages: [
        "Fiche dans « À la une » (accueil) pendant 7 jours",
        "Priorité dans les alternatives et les populaires",
        "Lien direct vers ton site officiel",
        "Sans engagement, sans reconduction",
      ],
    },
    {
      nom: "Un mois",
      prix: "$49",
      periode: "/ 30 jours",
      recommande: true,
      avantages: [
        "Fiche dans « À la une » (accueil) pendant 30 jours",
        "Priorité dans les alternatives et les populaires",
        "Lien direct vers ton site officiel",
        "Le meilleur tarif : l'équivalent de 2 semaines et demie",
      ],
    },
  ];

  const etapes = [
    {
      titre: "1. Envoie ta demande",
      texte:
        "Remplis le formulaire plus bas : ton outil, la formule choisie et ce que tu veux mettre en avant. Deux minutes suffisent.",
    },
    {
      titre: "2. Validation et paiement",
      texte:
        `On vérifie que ton outil correspond aux critères de l'annuaire (réel, fonctionnel, utilisable en français de préférence), puis tu reçois un lien de paiement sécurisé.`,
    },
    {
      titre: "3. Ta fiche passe à la une",
      texte:
        "Dès réception du paiement, ta fiche est placée dans « À la une » sous 24 h ouvrées, pour toute la durée de ta formule.",
    },
  ];

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero-verre border-b border-bordure">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center lg:py-20">
          <Badge variante="source"><Megaphone aria-hidden /> Espace annonceurs</Badge>
          <h1 className="mx-auto mt-4 max-w-[860px] text-[34px] leading-[42px] font-bold tracking-tight sm:text-h1">
            Ton outil IA, <span className="texte-degrade">devant les bonnes personnes</span>
          </h1>
          <p className="mesure mx-auto mt-5 text-[18px] leading-7 text-encre">
            Webgiverse aide chaque semaine des francophones à choisir leur prochain
            outil IA. Mets ta fiche en avant au moment exact où ils décident.
          </p>
          <dl className="mt-10 flex flex-wrap justify-center gap-8 sm:gap-14">
            <div className="text-center">
              <dt className="sr-only">Outils référencés</dt>
              <dd className="font-titre text-[32px] leading-10 font-bold text-violet">{outils}</dd>
              <dd className="text-legende text-encre">outils référencés</dd>
            </div>
            <div className="text-center">
              <dt className="sr-only">Catégories</dt>
              <dd className="font-titre text-[32px] leading-10 font-bold text-violet">{categories}</dd>
              <dd className="text-legende text-encre">catégories</dd>
            </div>
            <div className="text-center">
              <dt className="sr-only">Membres inscrits</dt>
              <dd className="font-titre text-[32px] leading-10 font-bold text-violet">{membres}</dd>
              <dd className="text-legende text-encre">membres inscrits</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ── Pourquoi annoncer ────────────────────────────────── */}
      <section className="py-14 lg:py-18">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-[26px] leading-8 font-semibold sm:text-h2">Pourquoi annoncer sur Webgiverse ?</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {atouts.map((a) => (
              <Carte key={a.titre} className="p-6">
                <a.icone className="size-7 text-violet" aria-hidden />
                <h3 className="mt-3 font-titre text-[17px] leading-6 font-semibold">{a.titre}</h3>
                <p className="mt-2 text-[14px] leading-6 text-encre">{a.texte}</p>
              </Carte>
            ))}
          </div>
        </div>
      </section>

      {/* ── Formules ─────────────────────────────────────────── */}
      <section className="bg-white py-14 lg:py-18">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <h2 className="text-[26px] leading-8 font-semibold sm:text-h2">Formules de mise en avant</h2>
            <Badge variante="nouveau"><TrendingUp aria-hidden /> Sans engagement</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {formules.map((f) => (
              <Carte key={f.nom} className={`flex flex-col p-6 ${f.recommande ? "border-violet ring-1 ring-violet" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-titre text-h3 font-semibold">{f.nom}</h3>
                  {f.recommande && <Badge variante="source">Le plus choisi</Badge>}
                </div>
                <p className="mt-3">
                  <span className="font-titre text-[40px] leading-10 font-bold text-violet">{f.prix}</span>
                  <span className="ml-1 text-[14px] text-encre">{f.periode}</span>
                </p>
                <ul className="mt-5 grid gap-3">
                  {f.avantages.map((av) => (
                    <li key={av} className="flex gap-3 text-[15px] leading-6 text-encre">
                      <Check className="mt-1 size-4 shrink-0 text-violet" aria-hidden /> {av}
                    </li>
                  ))}
                </ul>
              </Carte>
            ))}
          </div>
          <p className="mt-4 text-[13px] leading-5 text-encre">
            Paiement par lien sécurisé (carte bancaire). Ta mise en avant s&apos;arrête
            automatiquement à la fin de la période payée : rien à résilier.
          </p>
        </div>
      </section>

      {/* ── Comment ça marche ────────────────────────────────── */}
      <section className="py-14 lg:py-18">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-[26px] leading-8 font-semibold sm:text-h2">Comment ça marche ?</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {etapes.map((e) => (
              <Carte key={e.titre} className="p-6">
                <h3 className="font-titre text-[17px] leading-6 font-semibold text-violet">{e.titre}</h3>
                <p className="mt-2 text-[14px] leading-6 text-encre">{e.texte}</p>
              </Carte>
            ))}
          </div>
        </div>
      </section>

      {/* ── Formulaire ───────────────────────────────────────── */}
      <section id="demande" className="bg-white py-14 lg:py-18">
        <div className="mx-auto max-w-2xl px-4">
          <div className="mb-6 flex items-center gap-3">
            <Users className="size-6 text-violet" aria-hidden />
            <h2 className="text-[26px] leading-8 font-semibold sm:text-h2">Réserver mon emplacement</h2>
          </div>
          <FormulaireAnnonceur />
        </div>
      </section>
    </>
  );
}