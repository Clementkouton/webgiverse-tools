// app/contact/page.tsx
// Lot 8 — refonte « style Aixploria » : grand titre + promesses rapides,
// formulaire fonctionnel (inchangé côté logique), demandes fréquentes,
// FAQ en accordéons natifs. Nouvelle charte : bleu #0b1b3f + ciel #00d1ff
// sur blanc — AUCUN violet, AUCUN dégradé sur cette page.
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, HeartHandshake, LifeBuoy, Plus, ShieldCheck } from "lucide-react";
import { FormulaireContact } from "@/components/commun/formulaire-contact";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Une question sur un outil, ton abonnement ou un partenariat ? Écris à l'équipe Webgiverse : réponse sous 24 à 48 h ouvrées.",
};

// Les 3 promesses affichées sous le grand titre (style Aixploria).
const promesses = [
  {
    icone: HeartHandshake,
    titre: "Partenariats ouverts",
    texte: "Éditeurs, médias, écoles : toute proposition reçoit une réponse.",
  },
  {
    icone: Clock,
    titre: "Réponse en 24-48 h",
    texte: "Du lundi au vendredi, par une vraie personne, en français.",
  },
  {
    icone: ShieldCheck,
    titre: "Zéro spam",
    texte: "Ton message sert uniquement à te répondre. Jamais de revente.",
  },
];

// Raccourcis « demandes fréquentes » : on répond vite sans passer par le formulaire.
const demandesFrequentes = [
  {
    href: "/proposer",
    titre: "Proposer un outil IA",
    texte:
      "Tu édites un outil ? Soumets-le : l'équipe le teste, puis publie une fiche complète en français.",
    cta: "Proposer maintenant",
  },
  {
    href: "/annonceurs",
    titre: "Devenir annonceur",
    texte:
      "Mise en avant sur l'accueil et les pages de catégories, avec un format adapté à ton budget.",
    cta: "Voir les options",
  },
  {
    href: "/tarifs",
    titre: "Abonnement & paiement",
    texte:
      "Plans, moyens de paiement (Mobile Money, carte bancaire), activation automatique et résiliation.",
    cta: "Voir les tarifs",
  },
];

// FAQ contact — accordéons natifs (<details>), comme sur Aixploria.
const questionsFrequentes = [
  {
    question: "Mon message arrive vraiment à un humain ?",
    reponse:
      "Oui. Chaque message tombe directement dans la boîte de l'équipe Webgiverse et est lu par une personne. Le délai habituel de réponse est de 24 à 48 h ouvrées, du lundi au vendredi.",
  },
  {
    question: "Comment faire figurer mon outil dans l'annuaire ?",
    reponse:
      "Utilise la page « Proposer un outil » : décris l'outil et son lien officiel. L'équipe le teste, rédige la fiche en français et te prévient quand il est en ligne.",
  },
  {
    question: "Je suis abonné Premium : mon message passe-t-il avant ?",
    reponse:
      "Oui, le support prioritaire par e-mail est inclus dans le plan Entreprise. Précise-le dans ton message avec l'adresse de ton compte : ta demande passe devant la file d'attente.",
  },
  {
    question: "J'ai un souci de paiement, que faire ?",
    reponse:
      "Choisis le sujet « Problème de paiement ou d'abonnement » dans le formulaire et indique l'adresse e-mail utilisée pour payer (et la référence de transaction si tu l'as) : on corrige le problème ou on te rembourse selon le cas.",
  },
  {
    question: "Acceptez-vous les contenus sponsorisés ?",
    reponse:
      "Les partenariats passent par la page Annonceurs. Un contenu sponsorisé est toujours clairement signalé comme tel sur le site — la confiance de la communauté passe avant tout.",
  },
];

export default function PageContact() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12">
      {/* ── Hero : grand titre + promesses ──────────────────────── */}
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-h2 font-titre font-semibold text-bleu">Contact</h1>
        <p className="mt-3 text-[20px] leading-7 font-semibold text-ciel-fonce">
          Parlons-en.
        </p>
        <p className="mt-3 text-[15px] leading-6 text-encre">
          Une question, une suggestion, un souci ? L&apos;équipe Webgiverse te lit
          vraiment — et répond sous 24 à 48 h ouvrées.
        </p>

        <ul className="mt-8 grid gap-5 sm:grid-cols-3">
          {promesses.map((p) => (
            <li key={p.titre} className="flex flex-col items-center text-center">
              <span className="grid size-11 place-items-center rounded-carte bg-ciel/10">
                <p.icone className="size-5 text-ciel-fonce" aria-hidden />
              </span>
              <p className="mt-2.5 font-titre text-[15px] leading-5 font-semibold text-bleu">
                {p.titre}
              </p>
              <p className="mt-1 text-[13px] leading-5 text-encre">{p.texte}</p>
            </li>
          ))}
        </ul>
      </header>

      {/* ── Formulaire + infos pratiques ────────────────────────── */}
      <div id="formulaire" className="mt-12 grid gap-6 lg:grid-cols-5">
        {/* Formulaire (2/3 de la largeur sur grand écran) */}
        <div className="lg:col-span-3">
          <FormulaireContact />
        </div>

        {/* Informations pratiques (1/3) */}
        <aside className="grid content-start gap-4 lg:col-span-2">
          <div className="rounded-carte border border-bordure bg-white p-5 shadow-carte">
            <span className="grid size-10 place-items-center rounded-carte bg-ciel/10">
              <Clock className="size-5 text-ciel-fonce" aria-hidden />
            </span>
            <h2 className="mt-3 font-titre text-[16px] leading-6 font-semibold text-bleu">
              Délai de réponse
            </h2>
            <p className="mt-1 text-[14px] leading-5 text-encre">
              Nous lisons chaque message et répondons sous 24 à 48 h ouvrées,
              du lundi au vendredi.
            </p>
          </div>

          <div className="rounded-carte border border-bordure bg-white p-5 shadow-carte">
            <span className="grid size-10 place-items-center rounded-carte bg-ciel/10">
              <LifeBuoy className="size-5 text-ciel-fonce" aria-hidden />
            </span>
            <h2 className="mt-3 font-titre text-[16px] leading-6 font-semibold text-bleu">
              Abonnés Entreprise : priorité
            </h2>
            <p className="mt-1 text-[14px] leading-5 text-encre">
              Le support prioritaire par e-mail est inclus dans le plan{" "}
              <Link
                href="/tarifs"
                className="font-medium text-ciel-fonce hover:underline"
              >
                Entreprise
              </Link>{" "}
              : tes messages passent devant la file d&apos;attente.
            </p>
          </div>

          <div className="rounded-carte border border-bordure bg-white p-5 shadow-carte">
            <span className="grid size-10 place-items-center rounded-carte bg-ciel/10">
              <ShieldCheck className="size-5 text-ciel-fonce" aria-hidden />
            </span>
            <h2 className="mt-3 font-titre text-[16px] leading-6 font-semibold text-bleu">
              Tes données restent chez nous
            </h2>
            <p className="mt-1 text-[14px] leading-5 text-encre">
              Ton message sert uniquement à te répondre. Jamais de revente,
              jamais de spam — promis.
            </p>
          </div>
        </aside>
      </div>

      {/* ── Demandes fréquentes ─────────────────────────────────── */}
      <section aria-labelledby="titre-demandes" className="mt-14">
        <h2
          id="titre-demandes"
          className="text-center font-titre text-h3 font-semibold text-bleu"
        >
          Demandes fréquentes
        </h2>
        <p className="mesure mx-auto mt-2 text-center text-[14px] leading-5 text-encre">
          La plupart des demandes se règlent en un clic, sans formulaire.
        </p>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {demandesFrequentes.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className="group flex flex-col rounded-carte border border-bordure bg-white p-6 shadow-carte transition hover:border-bleu"
            >
              <h3 className="font-titre text-[17px] leading-6 font-semibold text-bleu">
                {d.titre}
              </h3>
              <p className="mt-2 flex-1 text-[14px] leading-6 text-encre">{d.texte}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] leading-5 font-semibold text-ciel-fonce">
                {d.cta}
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FAQ contact (accordéons natifs) ─────────────────────── */}
      <section aria-labelledby="titre-faq" className="mx-auto mt-14 max-w-3xl">
        <h2 id="titre-faq" className="text-center font-titre text-h3 font-semibold text-bleu">
          Questions fréquentes
        </h2>
        <div className="mt-6 grid gap-3">
          {questionsFrequentes.map((f) => (
            <details
              key={f.question}
              className="group rounded-carte border border-bordure bg-white px-5 shadow-carte"
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-titre text-[16px] leading-6 font-semibold text-bleu [&::-webkit-details-marker]:hidden">
                {f.question}
                <Plus
                  className="size-4 shrink-0 text-ciel-fonce transition-transform duration-200 group-open:rotate-45"
                  aria-hidden
                />
              </summary>
              <p className="pb-5 text-[15px] leading-6 text-encre">{f.reponse}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Rappel : le formulaire reste le chemin le plus rapide ─ */}
      <p className="mesure mx-auto mt-10 text-center text-[14px] leading-6 text-encre">
        Pas trouvé ta réponse ?{" "}
        <Link href="#formulaire" className="font-semibold text-ciel-fonce hover:underline">
          Remonte au formulaire
        </Link>{" "}
        : ton message arrive directement dans la boîte de l&apos;équipe.
      </p>
    </div>
  );
}