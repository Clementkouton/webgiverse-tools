
import type { Metadata } from "next";
import Link from "next/link";
import {
  Scale,
  MessageCircle,
  ShieldCheck,
  ScrollText,
  Globe,
  FileText,
  BriefcaseBusiness,
  Mail,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Mentions légales | Webgiverse Tools",
  description:
    "Consultez les mentions légales de Webgiverse Tools : informations sur l'éditeur, hébergement, propriété intellectuelle, responsabilité et conditions d'utilisation.",
};

const SOMMAIRE: Array<[string, string]> = [
  ["Éditeur du site", "editeur"],
  ["Hébergement", "hebergement"],
  ["Services et prestataires", "prestataires"],
  ["Propriété intellectuelle", "propriete"],
  ["Liens externes", "liens"],
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
    texte:
      "Découvrez comment vos données personnelles sont traitées et protégées.",
  },
  {
    href: "/cgu",
    icone: ScrollText,
    titre: "Conditions générales d'utilisation",
    texte:
      "Consultez les règles d'utilisation de la plateforme et les conditions des offres.",
  },
  {
    href: "/contact",
    icone: MessageCircle,
    titre: "Contacter Webgiverse",
    texte:
      "Une question ou une demande concernant la plateforme ? Notre équipe est à votre écoute.",
  },
];

export default function PageMentionsLegales() {
  return (
    <>
      {/* En-tête */}
      <section className="hero-verre border-b border-bordure">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center lg:py-18">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-bordure bg-white shadow-carte">
            <Scale className="size-7 text-sky-500" />
          </div>

          <h1 className="text-[30px] leading-9 font-bold tracking-tight sm:text-h1">
            Mentions <span className="texte-degrade">légales</span>
          </h1>

          <p className="mesure mx-auto mt-4 text-encre">
            Retrouvez les informations relatives à l'édition, à
            l'hébergement et à l'utilisation de Webgiverse Tools.
          </p>
        </div>
      </section>

      <section className="py-14 lg:py-18">
        <div className="mx-auto max-w-6xl px-4">

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-legende text-encre">
              Dernière mise à jour : 5 novembre 2026
            </p>
            <span className="rounded-[7px] -skew-x-[18deg] border border-bordure bg-white px-3 py-1 text-xs text-encre">
              Informations légales
            </span>
          </div>

          {/* Sommaire */}
          <nav
            aria-label="Sommaire des mentions légales"
            className="mt-5 flex flex-wrap gap-2"
          >
            {SOMMAIRE.map(([label, ancre]) => (
              <a
                key={ancre}
                href={`#${ancre}`}
                className="rounded-[7px] -skew-x-[18deg] border border-bordure bg-white px-3 py-1.5 text-[13px] leading-5 text-encre transition hover:border-sky-500 hover:text-sky-500"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* 1. Éditeur */}
          <article
            id="editeur"
            className="mt-8 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <div className="flex items-center gap-3">
              <BriefcaseBusiness className="size-6 text-sky-500" />
              <h2 className="font-titre text-h3 font-semibold text-bleu">
                1. Éditeur du site
              </h2>
            </div>

            <div className="mesure mt-4 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Le site <strong>Webgiverse Tools</strong>, accessible à
                l'adresse suivante :
                {" "}
                <a
                  href="https://webgiverse-tools.vercel.app"
                  className="font-medium text-sky-500 hover:underline"
                >
                  https://webgiverse-tools.vercel.app
                </a>
                , est une plateforme numérique dédiée à la découverte,
                à l'exploration et à l'utilisation des outils
                d'intelligence artificielle et des ressources numériques.
              </p>

              <p>
                La plateforme est éditée et administrée par son
                responsable de publication sous la marque
                commerciale <strong>Webgiverse Tools</strong>.
              </p>

              <div className="rounded-xl border border-bordure bg-fond p-4">
                <p className="mb-3 font-semibold text-bleu">
                  Identification de l'éditeur
                </p>

                <ul className="grid gap-2">
                  <li>
                    <strong>Nom de l'éditeur :</strong> Clement Kouton
                  </li>
                  <li>
                    <strong>Nom commercial :</strong> Webgiverse Tools
                  </li>
                  <li>
                    <strong>Qualité :</strong> Personne physique
                  </li>
                  <li>
                    <strong>Statut juridique :</strong> Activité exercée
                    à titre individuel, sans société constituée à ce jour.
                  </li>
                  <li>
                    <strong>Immatriculation RCCM :</strong> Non immatriculé
                    à ce jour.
                  </li>
                  <li>
                    <strong>Directeur de publication :</strong> Clement Kouton
                  </li>
                  <li>
                    <strong>Pays d'établissement :</strong> République du Bénin
                  </li>
                  <li>
                    <strong>Téléphone :</strong> +229 01 69 40 51 98
                  </li>
                  <li>
                    <strong>E-mail :</strong> webgiverse@gmail.com
                  </li>
                </ul>
              </div>

              <p>
                Webgiverse Tools est une plateforme indépendante
                destinée à faciliter l'accès aux ressources et
                solutions numériques. Elle ne représente pas
                officiellement les éditeurs des outils référencés,
                sauf indication contraire.
              </p>
            </div>
          </article>

          {/* 2. Hébergement */}
          <article
            id="hebergement"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <div className="flex items-center gap-3">
              <Globe className="size-6 text-sky-500" />
              <h2 className="font-titre text-h3 font-semibold text-bleu">
                2. Hébergement
              </h2>
            </div>

            <div className="mesure mt-4 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Le site Webgiverse Tools est hébergé par :
              </p>

              <div className="rounded-xl border border-bordure bg-fond p-4">
                <strong className="text-bleu">Vercel Inc.</strong>
                <p>440 N Barranca Avenue #4133</p>
                <p>Covina, CA 91723, États-Unis</p>
                <a
                  href="https://vercel.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium text-sky-500 hover:underline"
                >
                  https://vercel.com
                </a>
              </div>

              <p>
                Le prestataire assure notamment l'hébergement,
                la distribution et la mise à disposition des
                pages publiques de la plateforme.
              </p>
            </div>
          </article>

          {/* 3. Services et prestataires */}
          <article
            id="prestataires"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              3. Services et prestataires
            </h2>

            <div className="mesure mt-4 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Pour assurer le fonctionnement de ses services,
                Webgiverse Tools peut faire appel à différents
                prestataires externes spécialisés.
              </p>

              <ul className="grid gap-3">
                <li>
                  <strong className="text-bleu">
                    Services de paiement :
                  </strong>{" "}
                  les transactions liées aux offres payantes
                  peuvent être traitées par des prestataires
                  de paiement partenaires, notamment Chariow.
                </li>

                <li>
                  <strong className="text-bleu">
                    Services de communication :
                  </strong>{" "}
                  des prestataires externes peuvent être utilisés
                  pour assurer les communications nécessaires
                  avec les utilisateurs.
                </li>

                <li>
                  <strong className="text-bleu">
                    Services de contenus :
                  </strong>{" "}
                  certains contenus pédagogiques peuvent être
                  diffusés à partir de plateformes tierces,
                  notamment des services d'hébergement vidéo.
                </li>
              </ul>

              <p>
                Ces prestataires interviennent uniquement dans
                le cadre des services nécessaires au fonctionnement
                de la plateforme et selon leurs conditions
                respectives.
              </p>

              <p>
                Les informations relatives au traitement des
                données personnelles sont disponibles dans
                notre politique de confidentialité.
              </p>
            </div>
          </article>

          {/* 4. Propriété intellectuelle */}
          <article
            id="propriete"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              4. Propriété intellectuelle
            </h2>

            <div className="mesure mt-4 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                L'ensemble des éléments composant Webgiverse Tools,
                notamment son identité visuelle, son logo, ses
                textes originaux, son organisation éditoriale et
                ses contenus propriétaires, est protégé par les
                règles applicables en matière de propriété
                intellectuelle.
              </p>

              <p>
                Toute reproduction, représentation, modification,
                distribution ou exploitation non autorisée de
                ces éléments, en totalité ou en partie, est
                interdite, sauf autorisation préalable du titulaire
                des droits ou disposition légale contraire.
              </p>

              <p>
                Webgiverse Tools référence également des outils,
                plateformes, agents IA et services développés
                par des entreprises ou créateurs indépendants.
              </p>

              <p>
                Les marques, noms commerciaux, logos et contenus
                appartenant à ces tiers restent la propriété
                de leurs titulaires respectifs. Leur présence
                sur Webgiverse Tools ne signifie pas que ces
                derniers approuvent ou sponsorisent la plateforme.
              </p>
            </div>
          </article>

          {/* 5. Liens externes et affiliation */}
          <article
            id="liens"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              5. Liens externes et affiliation
            </h2>

            <div className="mesure mt-4 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Webgiverse Tools peut proposer des liens vers
                des sites, applications et services externes
                afin de faciliter la découverte des ressources
                numériques.
              </p>

              <p>
                Certains liens peuvent être des liens
                d'affiliation. Dans ce cas, Webgiverse Tools
                peut percevoir une commission lorsqu'un
                utilisateur effectue une action ou souscrit
                à un service partenaire à partir de ces liens.
              </p>

              <p>
                Lorsque cela s'applique, la nature commerciale
                du lien est signalée de manière appropriée.
                L'utilisation d'un lien d'affiliation n'entraîne
                pas nécessairement de coût supplémentaire
                pour l'utilisateur.
              </p>

              <p>
                Webgiverse Tools ne contrôle pas les sites
                externes et ne peut garantir la disponibilité,
                l'exactitude des informations, les tarifs ou
                les conditions proposés par leurs éditeurs.
              </p>
            </div>
          </article>

          {/* 6. Responsabilité */}
          <article
            id="responsabilite"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              6. Responsabilité
            </h2>

            <div className="mesure mt-4 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Webgiverse Tools s'efforce de proposer une
                plateforme accessible, fonctionnelle et
                régulièrement améliorée.
              </p>

              <p>
                Toutefois, des interruptions temporaires peuvent
                survenir notamment en raison d'opérations de
                maintenance, de mises à jour ou d'incidents
                indépendants de la volonté de l'éditeur.
              </p>

              <p>
                Les descriptions, tarifs, fonctionnalités et
                disponibilités des outils référencés sont
                communiqués à titre informatif. Malgré les
                efforts de vérification, certaines informations
                peuvent évoluer sans préavis.
              </p>

              <p>
                Il appartient à chaque utilisateur de vérifier
                les informations directement auprès de l'éditeur
                du service concerné avant toute décision d'achat
                ou d'utilisation.
              </p>

              <p>
                Les présentes dispositions ne limitent pas les
                droits dont les utilisateurs bénéficient
                impérativement en vertu de la législation
                applicable.
              </p>
            </div>
          </article>

          {/* 7. Données personnelles */}
          <article
            id="donnees"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-6 text-sky-500" />
              <h2 className="font-titre text-h3 font-semibold text-bleu">
                7. Données personnelles et confidentialité
              </h2>
            </div>

            <div className="mesure mt-4 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Dans le cadre de l'utilisation de Webgiverse Tools,
                certaines données peuvent être collectées et
                traitées afin de permettre la création de comptes,
                l'accès aux fonctionnalités, la gestion des
                abonnements et l'amélioration des services.
              </p>

              <p>
                Webgiverse Tools accorde une importance particulière
                à la confidentialité et à la protection des
                informations de ses utilisateurs.
              </p>

              <p>
                Les modalités de collecte, d'utilisation, de
                conservation et de protection des données,
                ainsi que les droits des utilisateurs, sont
                détaillés dans notre :
              </p>

              <Link
                href="/confidentialite"
                className="inline-flex items-center gap-2 font-medium text-sky-500 hover:underline"
              >
                <ShieldCheck className="size-4" />
                Politique de confidentialité
              </Link>
            </div>
          </article>

          {/* 8. Droit applicable */}
          <article
            id="droit"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              8. Droit applicable et règlement des différends
            </h2>

            <div className="mesure mt-4 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Les présentes mentions légales sont soumises
                à la législation applicable au lieu
                d'établissement de l'éditeur, sous réserve
                des dispositions impératives applicables
                aux utilisateurs.
              </p>

              <p>
                En cas de difficulté ou de différend relatif
                à l'utilisation de Webgiverse Tools, les
                parties sont invitées à rechercher en priorité
                une solution amiable.
              </p>

              <p>
                À défaut de résolution amiable, le différend
                sera soumis aux juridictions compétentes
                conformément aux règles de droit applicables.
              </p>
            </div>
          </article>

          {/* 9. Contact */}
          <article
            id="contact"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="size-6 text-sky-500" />
              <h2 className="font-titre text-h3 font-semibold text-bleu">
                9. Contact
              </h2>
            </div>

            <div className="mesure mt-4 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Pour toute question concernant les présentes
                mentions légales, le fonctionnement de la
                plateforme ou l'utilisation de ses services,
                vous pouvez contacter l'équipe Webgiverse Tools.
              </p>

              <Link
                href="/contact"
                className="inline-flex w-fit items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 px-5 py-3 font-medium text-white transition hover:opacity-90"
              >
                <MessageCircle className="size-4" />
                Contacter Webgiverse Tools
              </Link>

              <p className="text-sm text-encre">
                Les demandes sont examinées par l'équipe
                dans les meilleurs délais.
              </p>
            </div>
          </article>

          {/* Pages complémentaires */}
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {VOIR_AUSSI.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="group survol-carte rounded-carte border border-bordure bg-white p-5 shadow-carte"
              >
                <l.icone className="size-6 text-sky-500" aria-hidden />

                <h2 className="mt-3 font-titre text-[16px] leading-6 font-semibold text-bleu group-hover:text-sky-500">
                  {l.titre}
                </h2>

                <p className="mt-2 text-[14px] leading-5 text-encre">
                  {l.texte}
                </p>
              </Link>
            ))}
          </div>

          {/* Pied de page */}
          <div className="mt-10 border-t border-bordure pt-6">
            <p className="flex items-start gap-2 text-[13px] leading-5 text-encre">
              <FileText className="mt-0.5 size-4 shrink-0 text-sky-500" />
              <span>
                Mentions légales de Webgiverse Tools.
                Dernière mise à jour : 5 novembre 2026.
              </span>
            </p>
          </div>

        </div>
      </section>
    </>
  );
}
