import type { Metadata } from "next";
import Link from "next/link";
import { Scale, MessageCircle, ShieldCheck, ScrollText } from "lucide-react";

export const metadata: Metadata = {
  title: "Mentions légales",
  description:
    "Éditeur du site Webgiverse, hébergement, prestataires techniques, propriété intellectuelle, liens d'affiliation et informations légales de la plateforme Webgiverse Tools.",
};

const SOMMAIRE: Array<[string, string]> = [
  ["Éditeur", "editeur"],
  ["Hébergement", "hebergement"],
  ["Prestataires", "prestataires"],
  ["Propriété intellectuelle", "propriete"],
  ["Liens et affiliation", "liens"],
  ["Responsabilité", "responsabilite"],
  ["Données personnelles", "donnees"],
  ["Droit applicable", "droit"],
  ["Contact", "contact"],
];

const VOIR_AUSSI = [
  {
    href: "/confidentialite",
    icone: ShieldCheck,
    titre: "Politique de confidentialité",
    texte: "Données collectées, cookies, durées de conservation et tes droits.",
  },
  {
    href: "/cgu",
    icone: ScrollText,
    titre: "Conditions générales d'utilisation",
    texte: "Compte, offres Premium, avis et règles d'utilisation du service.",
  },
  {
    href: "/contact",
    icone: MessageCircle,
    titre: "Une question légale ?",
    texte: "Écris-nous depuis la page Contact, réponse sous 48 h ouvrées.",
  },
];

export default function PageMentionsLegales() {
  return (
    <>
      {/* ── En-tête ─────────────────────────────────────────────── */}
      <section className="hero-verre border-b border-bordure">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center lg:py-18">
          <h1 className="text-[30px] leading-9 font-bold tracking-tight sm:text-h1">
            Mentions <span className="texte-degrade">légales</span>
          </h1>
          <p className="mesure mx-auto mt-4 text-encre">
            Les informations légales de Webgiverse Tools : éditeur,
            hébergement, prestataires et propriété intellectuelle.
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
            aria-label="Sommaire des mentions légales"
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

          {/* ── 1. Éditeur ────────────────────────────────────────── */}
          <article
            id="editeur"
            className="mt-8 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              1. Éditeur du site
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Le site Webgiverse Tools (ci-après « Webgiverse »), accessible
                notamment à l&apos;adresse{" "}
                <strong className="font-medium text-bleu">
                  webgiverse-tools.vercel.app
                </strong>
                , est édité par :{" "}
                <strong className="font-medium text-bleu">
                  [À COMPLÉTER : nom / prénom de l&apos;éditeur ou raison sociale]
                </strong>
                .
              </p>
              <ul className="grid gap-1">
                <li>
                  Statut juridique :{" "}
                  <strong className="font-medium text-bleu">[À COMPLÉTER]</strong>
                </li>
                <li>
                  Numéro d&apos;enregistrement (SIRET, RCCM ou équivalent) :{" "}
                  <strong className="font-medium text-bleu">[À COMPLÉTER]</strong>
                </li>
                <li>
                  Siège / adresse :{" "}
                  <strong className="font-medium text-bleu">[À COMPLÉTER]</strong>
                </li>
                <li>
                  Directeur de la publication :{" "}
                  <strong className="font-medium text-bleu">[À COMPLÉTER]</strong>
                </li>
                <li>
                  E-mail de contact :{" "}
                  <strong className="font-medium text-bleu">[À COMPLÉTER]</strong>
                </li>
              </ul>
              <p>
                Toute question relative au site peut également être posée
                depuis la{" "}
                <Link href="/contact" className="font-medium text-sky-500 hover:underline">
                  page Contact
                </Link>{" "}
                : ton message arrive directement dans l&apos;espace de gestion
                de l&apos;équipe.
              </p>
            </div>
          </article>

          {/* ── 2. Hébergement ────────────────────────────────────── */}
          <article
            id="hebergement"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              2. Hébergement
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Le site est hébergé par{" "}
                <strong className="font-medium text-bleu">Vercel Inc.</strong>,{" "}
                440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis —{" "}
                <a
                  href="https://vercel.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium text-sky-500 hover:underline"
                >
                  vercel.com
                </a>
                . L&apos;infrastructure de Vercel fournit le service de
                déploiement, la distribution du contenu et la terminaison HTTPS
                de Webgiverse Tools.
              </p>
            </div>
          </article>

          {/* ── 3. Prestataires techniques ────────────────────────── */}
          <article
            id="prestataires"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              3. Autres prestataires techniques
            </h2>
            <ul className="mesure mt-3 grid gap-2 text-[15px] leading-6 text-encre">
              <li className="flex gap-2">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-sky-500" aria-hidden />
                <span>
                  <strong className="font-medium text-bleu">
                    Base de données
                  </strong>{" "}
                  : PostgreSQL managé par Neon (neon.tech).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-sky-500" aria-hidden />
                <span>
                  <strong className="font-medium text-bleu">
                    Envoi d&apos;e-mails
                  </strong>{" "}
                  : service SMTP configuré par l&apos;éditeur (par exemple
                  Gmail ou Brevo) via la librairie nodemailer.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-sky-500" aria-hidden />
                <span>
                  <strong className="font-medium text-bleu">
                    Paiements
                  </strong>{" "}
                  : Chariow, service de Axa Zara LLC (chariow.com), et le cas
                  échéant Moneroo — aucun donné bancaire n&apos;est stocké sur
                  Webgiverse.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-sky-500" aria-hidden />
                <span>
                  <strong className="font-medium text-bleu">Connexion</strong>{" "}
                  : authentification par Google (OAuth) ou par e-mail et mot de
                  passe, gérée par NextAuth.js.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-sky-500" aria-hidden />
                <span>
                  <strong className="font-medium text-bleu">Vidéos</strong> :
                  les tutoriels sont des vidéos YouTube embarquées (lire la
                  politique de confidentialité au sujet des cookies YouTube).
                </span>
              </li>
            </ul>
          </article>

          {/* ── 4. Propriété intellectuelle ───────────────────────── */}
          <article
            id="propriete"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              4. Propriété intellectuelle
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                L&apos;ensemble du site — structure, textes, logo, charte
                graphique, base de données d&apos;outils et code source — est la
                propriété de l&apos;éditeur ou fait l&apos;objet d&apos;une
                autorisation d&apos;utilisation. Toute reproduction,
                représentation ou exploitation, totale ou partielle, sans
                autorisation écrite préalable est interdite.
              </p>
              <p>
                Webgiverse référence des outils, agents et services créés par
                des tiers. Les noms, logos et descriptions de ces outils
                appartiennent à leurs ayants droit respectifs ; leur mention sur
                Webgiverse vaut description éditoriale, pas revendication de
                propriété. Webgiverse n&apos;est pas affilié aux éditeurs des
                outils référencés, sauf mention contraire.
              </p>
              <p>
                Les tutoriels vidéo sont hébergés par YouTube et diffusés via
                l&apos;intégration officielle : leur utilisation reste soumise
                aux conditions d&apos;utilisation de YouTube et des services
                Google.
              </p>
            </div>
          </article>

          {/* ── 5. Liens et affiliation ───────────────────────────── */}
          <article
            id="liens"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              5. Liens externes et affiliation
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Certains liens du site (vers des outils IA ou des services
                partenaires) sont des{" "}
                <strong className="font-medium text-bleu">
                  liens d&apos;affiliation
                </strong>{" "}
                : si tu souscris à un service après avoir cliqué, Webgiverse
                peut recevoir une commission de l&apos;éditeur du service. Ce
                dispositif finance le projet{" "}
                <strong className="font-medium text-bleu">
                  sans changer ton prix
                </strong>
                .
              </p>
              <p>
                Webgiverse renvoie vers des sites tiers qu&apos;il ne contrôle
                pas. L&apos;éditeur ne peut être tenu responsable du contenu,
                des prix ou des pratiques de ces sites externes ; les
                conditions et politiques de confidentialité de ces sites
                s&apos;appliquent à leur usage.
              </p>
            </div>
          </article>

          {/* ── 6. Responsabilité ─────────────────────────────────── */}
          <article
            id="responsabilite"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              6. Limitation de responsabilité
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Webgiverse est fourni « en l&apos;état » et s&apos;efforce
                d&apos;assurer un accès continu, mais des interruptions
                (maintenance, évolutions, incidents techniques) peuvent
                survenir sans préavis.
              </p>
              <p>
                Les fiches outils (tarifs, fonctionnalités, langues) sont
                vérifiées régulièrement mais restent indicatives : seul le site
                officiel de chaque outil fait foi pour ses prix et conditions
                actuels. L&apos;éditeur ne saurait être tenu responsable des
                décisions prises sur la base de ces informations ni des dommages
                indirects liés à l&apos;usage du site ou des outils
                référencés.
              </p>
            </div>
          </article>

          {/* ── 7. Données personnelles ───────────────────────────── */}
          <article
            id="donnees"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              7. Données personnelles et cookies
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Le traitement de tes données personnelles (compte, newsletter,
                paiements, cookies) est décrit en détail dans la{" "}
                <Link
                  href="/confidentialite"
                  className="font-medium text-sky-500 hover:underline"
                >
                  politique de confidentialité
                </Link>
                , qui fait partie intégrante des présentes mentions.
              </p>
            </div>
          </article>

          {/* ── 8. Droit applicable ───────────────────────────────── */}
          <article
            id="droit"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              8. Droit applicable et litiges
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Les présentes mentions sont soumises au droit de{" "}
                <strong className="font-medium text-bleu">
                  [À COMPLÉTER : pays de l&apos;éditeur]
                </strong>
                . En cas de différend, une solution amiable sera recherchée en
                priorité ; à défaut, les tribunaux compétents de{" "}
                <strong className="font-medium text-bleu">
                  [À COMPLÉTER : ville / ressort]
                </strong>{" "}
                seront saisis. Tu peux aussi saisir l&apos;autorité de
                protection des données de ton pays de résidence.
              </p>
            </div>
          </article>

          {/* ── 9. Contact ────────────────────────────────────────── */}
          <article
            id="contact"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              9. Contact
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Pour toute question sur ces mentions ou sur le site, utilise la{" "}
                <Link href="/contact" className="font-medium text-sky-500 hover:underline">
                  page Contact
                </Link>
                . L&apos;équipe répond sous 48 h ouvrées.
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
            <Scale className="mt-0.5 size-4 shrink-0 text-sky-500" aria-hidden />
            <span>
              Mentions légales de Webgiverse Tools — version du 6 novembre 2026.
            </span>
          </p>
        </div>
      </section>
    </>
  );
}