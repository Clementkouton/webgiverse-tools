import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText, MessageCircle, ShieldCheck, Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation (CGU)",
  description:
    "Règles d'utilisation de Webgiverse Tools : compte, plan Découverte et offres Premium (Pro, Entreprise), avis et contenus, newsletter, suspension et responsabilités.",
};

const SOMMAIRE: Array<[string, string]> = [
  ["Objet", "objet"],
  ["Définitions", "definitions"],
  ["Compte", "compte"],
  ["Offres Premium", "premium"],
  ["Règles d'usage", "regles"],
  ["Tes contenus", "contenus"],
  ["Contenus tiers", "tiers"],
  ["Affiliation", "affiliation"],
  ["Newsletter", "newsletter"],
  ["Suspension", "suspension"],
  ["Responsabilité", "responsabilite"],
  ["Droit applicable", "droit"],
];

const VOIR_AUSSI = [
  {
    href: "/confidentialite",
    icone: ShieldCheck,
    titre: "Politique de confidentialité",
    texte: "Données collectées, cookies, durées de conservation et tes droits.",
  },
  {
    href: "/mentions-legales",
    icone: Scale,
    titre: "Mentions légales",
    texte: "Éditeur du site, hébergement et prestataires techniques.",
  },
  {
    href: "/tarifs",
    icone: ScrollText,
    titre: "Voir les tarifs",
    texte: "Plan Découverte gratuit, offres Pro et Entreprise en détail.",
  },
];

function Puce() {
  return <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-sky-500" aria-hidden />;
}

export default function PageCgu() {
  return (
    <>
      {/* ── En-tête ─────────────────────────────────────────────── */}
      <section className="hero-verre border-b border-bordure">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center lg:py-18">
          <h1 className="text-[30px] leading-9 font-bold tracking-tight sm:text-h1">
            Conditions générales <span className="texte-degrade">d&apos;utilisation</span>
          </h1>
          <p className="mesure mx-auto mt-4 text-encre">
            Les règles du jeu : ce que Webgiverse t&apos;offre et ce que nous
            attendons de toi. Courtes, lisibles, sans piège.
          </p>
        </div>
      </section>

      <section className="py-14 lg:py-18">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-legende text-encre">
            Dernière mise à jour : 6 novembre 2026
          </p>

          {/* ── Sommaire ──────────────────────────────────────────── */}
          <nav
            aria-label="Sommaire des conditions générales d'utilisation"
            className="mt-4 flex flex-wrap gap-2"
          >
            {SOMMAIRE.map(([label, ancre]) => (
              <a
                key={ancre}
                href={`#${ancre}`}
                className="rounded-full border border-bordure bg-white px-3 py-1 text-[13px] leading-5 text-encre transition hover:border-sky-500 hover:text-sky-500"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* ── 1. Objet ──────────────────────────────────────────── */}
          <article
            id="objet"
            className="mt-8 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              1. Objet et acceptation
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Les présentes conditions régissent l&apos;utilisation de
                Webgiverse Tools : un annuaire d&apos;outils et d&apos;agents
                IA, des tutoriels vidéo, une bibliothèque de prompts, un
                assistant IA de recommandation, un blog, des actualités et un
                espace membre (dashboard).
              </p>
              <p>
                En naviguant sur le site tu acceptes ces conditions ; en créant
                un compte, tu les acceptes expressément. Si tu n&apos;es pas
                d&apos;accord, merci de ne pas utiliser le service. Elles sont
                complétées par la{" "}
                <Link
                  href="/confidentialite"
                  className="font-medium text-sky-500 hover:underline"
                >
                  politique de confidentialité
                </Link>{" "}
                et les{" "}
                <Link
                  href="/mentions-legales"
                  className="font-medium text-sky-500 hover:underline"
                >
                  mentions légales
                </Link>
                .
              </p>
            </div>
          </article>

          {/* ── 2. Définitions ────────────────────────────────────── */}
          <article
            id="definitions"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              2. Définitions
            </h2>
            <ul className="mesure mt-3 grid gap-2 text-[15px] leading-6 text-encre">
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">« Site »</strong> :
                  le site Webgiverse Tools et toutes ses pages.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">« Visiteur »</strong>{" "}
                  : toute personne naviguant sans compte ;{" "}
                  <strong className="font-medium text-bleu">« Membre »</strong>{" "}
                  : toute personne disposant d&apos;un compte.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">« Outils »</strong>{" "}
                  : les logiciels, applications et agents d&apos;IA référencés
                  dans l&apos;annuaire, créés par des tiers.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">
                    « Offres Premium »
                  </strong>{" "}
                  : les plans payants Pro et Entreprise décrits à la section 4.
                </span>
              </li>
            </ul>
          </article>

          {/* ── 3. Compte ─────────────────────────────────────────── */}
          <article
            id="compte"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              3. Compte et plan Découverte
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                La consultation de l&apos;annuaire est gratuite, sans compte.
                La création d&apos;un compte (gratuit) se fait{" "}
                <strong className="font-medium text-bleu">
                  avec Google ou par e-mail + mot de passe
                </strong>{" "}
                et donne accès au{" "}
                <strong className="font-medium text-bleu">plan Découverte</strong>{" "}
                : annuaire complet, 20 favoris, 10 listes, 10 questions
                d&apos;assistant IA par mois, avis, votes, suivi de progression
                et export PDF des favoris.
              </p>
              <ul className="grid gap-2 leading-6">
                <li className="flex gap-2">
                  <Puce />
                  <span>
                    Les informations fournies doivent être exactes ; un seul
                    compte par personne.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Puce />
                  <span>
                    Tu es responsable de la confidentialité de ton mot de passe
                    et de l&apos;activité réalisée avec ton compte.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Puce />
                  <span>
                    Parrainage : inviter un ami avec ton lien personnel peut
                    t&apos;offrir 14 jours Premium par filleul qui rejoint et
                    paie — dans la limite d&apos;un usage loyal (pas
                    d&apos;auto-parrainage ni de faux comptes).
                  </span>
                </li>
                <li className="flex gap-2">
                  <Puce />
                  <span>
                    Tu peux demander la suppression de ton compte à tout moment
                    via la{" "}
                    <Link
                      href="/contact"
                      className="font-medium text-sky-500 hover:underline"
                    >
                      page Contact
                    </Link>
                    .
                  </span>
                </li>
              </ul>
            </div>
          </article>

          {/* ── 4. Premium ────────────────────────────────────────── */}
          <article
            id="premium"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              4. Offres Premium
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Les offres payantes sont des{" "}
                <strong className="font-medium text-bleu">
                  prépaiements par période de 30 jours
                </strong>
                , en dollars américains (USD), réglés via notre prestataire de
                paiement{" "}
                <strong className="font-medium text-bleu">
                  Chariow (Axa Zara LLC)
                </strong>{" "}
                — carte bancaire, mobile money ou transfert selon ton pays :
              </p>
              <ul className="grid gap-2 leading-6">
                <li className="flex gap-2">
                  <Puce />
                  <span>
                    <strong className="font-medium text-bleu">
                      Pro — $2,99
                    </strong>{" "}
                    / 30 jours : favoris et listes illimités, assistant IA
                    illimité, badge Premium, suggestions prioritaires (le
                    double), export PDF.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Puce />
                  <span>
                    <strong className="font-medium text-bleu">
                      Entreprise — $7,99
                    </strong>{" "}
                    / 30 jours : tous les avantages Pro, alertes hebdomadaires
                    des nouveaux outils, accès anticipé aux nouveautés,
                    historique d&apos;activité étendu (200 entrées), support
                    prioritaire par e-mail.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Puce />
                  <span>
                    La lecture des tutoriels vidéo est réservée aux abonnés
                    Premium connectés ; la liste des tutoriels reste publique.
                  </span>
                </li>
              </ul>
              <p>
                <strong className="font-medium text-bleu">
                  Pas de reconduction automatique
                </strong>{" "}
                : ton accès Premium court jusqu&apos;à la fin de la période
                payée, puis tu repasses au plan Découverte (tu peux le
                prolonger par un nouveau paiement à tout moment). Tes données
                (favoris, listes, progression) sont conservées après
                l&apos;expiration. Aucune donnée bancaire n&apos;est stockée
                sur Webgiverse : le paiement est intégralement traité par le
                prestataire.
              </p>
              <p>
                Les codes promo éventuels sont valables dans la limite de leur
                quota et de leurs dates, sont non cumulables et peuvent être
                retirés à tout moment. Conformément à la politique affichée au
                moment du paiement{" "}
                <strong className="font-medium text-bleu">
                  [À COMPLÉTER si tu veux une politique de remboursement
                  précise]
                </strong>
                , une demande commerciale peut être adressée via la page
                Contact.
              </p>
            </div>
          </article>

          {/* ── 5. Règles ─────────────────────────────────────────── */}
          <article
            id="regles"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              5. Règles d&apos;utilisation
            </h2>
            <ul className="mesure mt-3 grid gap-2 text-[15px] leading-6 text-encre">
              <li className="flex gap-2">
                <Puce />
                <span>
                  Utilise le site de façon licite et loyale : pas d&apos;usage
                  frauduleux, pas de tentative de contournement des limites du
                  plan Découverte.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  Pas d&apos;extraction massive (scraping) du catalogue, pas de
                  revente ni de partage de ton accès Premium avec des tiers.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  Les avis, votes et propositions d&apos;outils doivent être
                  sincères et respectueux : pas d&apos;insultes, de spam, de
                  faux avis ni de liens publicitaires.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  Ne t&apos;attribue pas le contenu du site : pas de
                  republication du catalogue ou des fiches sans accord écrit.
                </span>
              </li>
            </ul>
          </article>

          {/* ── 6. Contenus des membres ───────────────────────────── */}
          <article
            id="contenus"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              6. Tes contenus (avis, votes, propositions)
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Les contenus que tu publies (avis, notes, propositions
                d&apos;outils) restent les tiens. Tu nous accordes une licence
                non exclusive et gratuite pour les héberger, les afficher et
                les modérer sur le site.
              </p>
              <p>
                L&apos;équipe peut modifier, masquer ou supprimer tout contenu
                qui violerait ces conditions ou la loi, sans préavis et sans
                compensation. Un contenu signalé est examiné dans
                l&apos;espace de modération interne.
              </p>
            </div>
          </article>

          {/* ── 7. Contenus tiers ─────────────────────────────────── */}
          <article
            id="tiers"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              7. Contenus du site et outils tiers
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Les fiches (tarifs affichés, fonctionnalités, langues,
                niveaux) sont vérifiées régulièrement mais restent
                <strong className="font-medium text-bleu"> indicatives</strong>{" "}
                : seul l&apos;éditeur de chaque outil fait foi pour ses prix et
                conditions du jour.
              </p>
              <p>
                Les tutoriels sont des vidéos YouTube intégrées : leur lecture
                est soumise aux conditions de YouTube. Les noms et logos des
                outils référencés appartiennent à leurs propriétaires
                respectifs ; Webgiverse est un service indépendant, non affilié
                aux éditeurs référencés sauf mention contraire.
              </p>
            </div>
          </article>

          {/* ── 8. Affiliation ────────────────────────────────────── */}
          <article
            id="affiliation"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              8. Liens d&apos;affiliation
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Certains liens sont des liens d&apos;affiliation : si tu
                souscris un service après un clic, Webgiverse peut recevoir une
                commission —{" "}
                <strong className="font-medium text-bleu">
                  cela ne change jamais ton prix
                </strong>
                . L&apos;affiliation finance l&apos;hébergement et le
                développement du site ; elle ne détermine pas à ta place le
                contenu des avis.
              </p>
            </div>
          </article>

          {/* ── 9. Newsletter ─────────────────────────────────────── */}
          <article
            id="newsletter"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              9. Newsletter et e-mails
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                La newsletter (sélection hebdo d&apos;outils IA) t&apos;est
                envoyée uniquement si tu t&apos;inscris volontairement avec le
                formulaire du site. Chaque e-mail contient un lien de
                désabonnement en un clic ; tu peux aussi corriger tes
                informations via la page de préférences jointe aux e-mails.
                Les e-mails transactionnels (bienvenue, paiement, sécurité) ne
                sont pas de la prospection.
              </p>
            </div>
          </article>

          {/* ── 10. Suspension ────────────────────────────────────── */}
          <article
            id="suspension"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              10. Suspension et suppression
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                En cas de manquement sérieux à ces conditions (fraude,
                contenus illicites, abus du service), nous pouvons suspendre ou
                bannir un compte, avec indication du motif et possibilité de
                contact — les sessions concernées sont déconnectées
                immédiatement. Les périodes Premium déjà payées ne sont pas
                prolongées pendant une suspension justifiée. Tu peux, toi,
                mettre fin à l&apos;utilisation du service et demander la
                suppression de ton compte à tout moment.
              </p>
            </div>
          </article>

          {/* ── 11. Responsabilité ────────────────────────────────── */}
          <article
            id="responsabilite"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              11. Disponibilité et responsabilité
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Le service est fourni « en l&apos;état » et peut évoluer
                (ajouts, corrections, interruptions pour maintenance) ; certains
                contenus peuvent être corrigés ou retirés. Webgiverse ne
                garantit pas les outils tiers référencés : leur usage se fait
                sous ta responsabilité et selon leurs propres conditions.
                Dans toute la mesure permise par la loi, la responsabilité de
                l&apos;éditeur ne saurait être engagée pour les dommages
                indirects (perte de données chez un tiers, perte de revenus)
                résultant de l&apos;usage du site.
              </p>
            </div>
          </article>

          {/* ── 12. Droit applicable ──────────────────────────────── */}
          <article
            id="droit"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              12. Modifications et droit applicable
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Ces conditions peuvent évoluer : la version applicable est celle
                publiée sur cette page à la date de ton utilisation du service,
                et la date de mise à jour est indiquée en haut de page. Elles
                sont soumises au droit de{" "}
                <strong className="font-medium text-bleu">
                  [À COMPLÉTER : pays de l&apos;éditeur]
                </strong>
                ; tout différend sera d&apos;abord traité à l&apos;amiable via
                la{" "}
                <Link href="/contact" className="font-medium text-sky-500 hover:underline">
                  page Contact
                </Link>
                .
              </p>
            </div>
          </article>

          {/* ── Voir aussi ────────────────────────────────────────── */}
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {VOIR_AUSSI.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="group survol-carte rounded-carte border border-bordure bg-white p-5 shadow-carte"
              >
                <l.icone className="size-6 text-sky-500" aria-hidden />
                <h2 className="mt-3 font-titre text-[16px] leading-6 font-semibold group-hover:text-sky-500">
                  {l.titre}
                </h2>
                <p className="mt-1 text-[14px] leading-5 text-encre">{l.texte}</p>
              </Link>
            ))}
          </div>

          <p className="mesure mt-8 flex items-start gap-2 text-[13px] leading-5 text-encre">
            <ScrollText className="mt-0.5 size-4 shrink-0 text-sky-500" aria-hidden />
            <span>
              Conditions générales d&apos;utilisation de Webgiverse Tools —
              version du 6 novembre 2026.
            </span>
          </p>
        </div>
      </section>
    </>
  );
}