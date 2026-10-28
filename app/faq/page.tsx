import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import { Accordeon, ItemAccordeon } from "@/components/ui/accordeon";
import { FAQ_COMPLETE } from "@/content/faq";

export const metadata: Metadata = {
  title: "Questions fréquentes (FAQ)",
  description:
    "Comment choisir un outil IA, différence entre outil et agent, outils gratuits, tarifs vérifiés, suppression de compte : toutes les réponses sur Webgiverse.",
};

// Données structurées FAQPage : Google peut afficher tes réponses
// directement dans les résultats de recherche (extraits enrichis).
const donneesFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_COMPLETE.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.reponse },
  })),
};

const liensUtiles = [
  {
    href: "/outils",
    icone: ArrowRight,
    titre: "Explorer l'annuaire",
    texte: "Tous les outils et agents IA testés, avec filtres gratuits et open source.",
  },
  {
    href: "/assistant",
    icone: Sparkles,
    titre: "Lancer l'assistant",
    texte: "Réponds à trois questions, reçois jusqu'à trois outils adaptés à ton besoin.",
  },
  {
    href: "/contact",
    icone: MessageCircle,
    titre: "Poser une question",
    texte: "Tu n'as pas trouvé ta réponse ? L'équipe répond sous 48 h ouvrées.",
  },
];

export default function PageFaq() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(donneesFaq) }}
      />

      {/* ── En-tête ──────────────────────────────────────────── */}
      <section className="hero-verre border-b border-bordure">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center lg:py-18">
          <h1 className="text-[30px] leading-9 font-bold tracking-tight sm:text-h1">
            Questions <span className="texte-degrade">fréquentes</span>
          </h1>
          <p className="mesure mx-auto mt-4 text-encre">
            Tout ce qu&apos;il faut savoir sur Webgiverse et sur le choix d&apos;un outil IA.
          </p>
        </div>
      </section>

      {/* ── Les 10 questions ─────────────────────────────────── */}
      <section className="py-14 lg:py-18">
        <div className="mx-auto max-w-3xl px-4">
          <Accordeon type="single" collapsible className="grid gap-3">
            {FAQ_COMPLETE.map((f) => (
              <ItemAccordeon key={f.question} question={f.question} reponse={f.reponse} />
            ))}
          </Accordeon>

          {/* ── Liens utiles ─────────────────────────────────── */}
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {liensUtiles.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="group rounded-carte border border-bordure bg-white p-5 shadow-carte transition hover:border-violet"
              >
                <l.icone className="size-6 text-violet" aria-hidden />
                <h2 className="mt-3 font-titre text-[16px] leading-6 font-semibold group-hover:text-violet">
                  {l.titre}
                </h2>
                <p className="mt-1 text-[14px] leading-5 text-encre">{l.texte}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}