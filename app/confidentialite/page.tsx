import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  MessageCircle,
  Scale,
  ScrollText,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Politique de confidentialité | Webgiverse Tools",
  description:
    "Découvre comment Webgiverse Tools collecte, utilise, protège et conserve les données personnelles de ses utilisateurs, ainsi que les droits dont ils disposent.",
};

const SOMMAIRE: Array<[string, string]> = [
  ["Responsable", "responsable"],
  ["Données collectées", "donnees"],
  ["Finalités", "finalites"],
  ["Cookies", "cookies"],
  ["Destinataires", "destinataires"],
  ["Durées", "durees"],
  ["Tes droits", "droits"],
  ["Sécurité", "securite"],
  ["Mineurs", "mineurs"],
  ["Contact", "contact"],
];

const VOIR_AUSSI = [
  {
    href: "/cgu",
    icone: ScrollText,
    titre: "Conditions générales d'utilisation",
    texte: "Compte, offres Premium, avis et règles d'utilisation du service.",
  },
  {
    href: "/mentions-legales",
    icone: Scale,
    titre: "Mentions légales",
    texte: "Identité de l'éditeur, hébergement et informations légales.",
  },
  {
    href: "/contact",
    icone: MessageCircle,
    titre: "Exercer tes droits",
    texte: "Une question sur tes données personnelles ? Contacte-nous.",
  },
];

function Puce() {
  return (
    <span
      className="mt-2.5 size-1.5 shrink-0 rounded-[7px]  not-italic bg-sky-500"
      aria-hidden
    />
  );
}

function Section({
  id,
  titre,
  children,
}: {
  id: string;
  titre: string;
  children: ReactNode;
}) {
  return (
    <article
      id={id}
      className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
    >
      <h2 className="font-titre text-h3 font-semibold text-bleu">
        {titre}
      </h2>

      <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
        {children}
      </div>
    </article>
  );
}

function Item({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <Puce />
      <span>{children}</span>
    </li>
  );
}

export default function PageConfidentialite() {
  return (
    <>
      {/* En-tête */}
      <section className="hero-verre border-b border-bordure">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center lg:py-18">
          <h1 className="text-[30px] leading-9 font-bold tracking-tight sm:text-h1">
            Politique de{" "}
            <span className="texte-degrade">confidentialité</span>
          </h1>

          <p className="mesure mx-auto mt-4 text-encre">
            Tes données personnelles méritent d'être protégées.
            Découvre quelles informations nous utilisons, pourquoi
            nous les utilisons et comment exercer tes droits.
          </p>
        </div>
      </section>

      <section className="py-14 lg:py-18">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-legende text-encre">
            Dernière mise à jour : 5 novembre 2026
          </p>

          {/* Sommaire */}
          <nav
            aria-label="Sommaire de la politique de confidentialité"
            className="mt-4 flex flex-wrap gap-2"
          >
            {SOMMAIRE.map(([label, ancre]) => (
              <a
                key={ancre}
                href={`#${ancre}`}
                className="rounded-[7px]  not-italic border border-bordure bg-white px-3 py-1 text-[13px] leading-5 text-encre transition hover:border-sky-500 hover:text-sky-500"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* 1. Responsable */}
          <Section
            id="responsable"
            titre="1. Qui est responsable du traitement de tes données ?"
          >
            <p>
              Le responsable du traitement des données personnelles
              collectées dans le cadre de l'utilisation de Webgiverse
              Tools est :
            </p>

            <div className="rounded-xl border border-bordure bg-slate-50 p-4">
              <p>
                <strong className="font-medium text-bleu">
                  Nom de l'éditeur :
                </strong>{" "}
                Clement Kouton
              </p>

              <p>
                <strong className="font-medium text-bleu">
                  Qualité :
                </strong>{" "}
                Éditeur personne physique
              </p>

              <p>
                <strong className="font-medium text-bleu">
                  Pays :
                </strong>{" "}
                Bénin
              </p>

              <p>
                <strong className="font-medium text-bleu">
                  Service :
                </strong>{" "}
                Webgiverse Tools
              </p>
            </div>

            <p>
              Dans le cadre de ses activités, l'éditeur détermine les
              finalités et les moyens des traitements de données
              personnelles réalisés pour le fonctionnement de la
              plateforme.
            </p>

            <p>
              Pour toute question concernant l'utilisation de tes
              données personnelles, tu peux nous contacter depuis
              la{" "}
              <Link
                href="/contact"
                className="font-medium text-sky-500 hover:underline"
              >
                page Contact
              </Link>
              .
            </p>
          </Section>

          {/* 2. Données collectées */}
          <Section
            id="donnees"
            titre="2. Quelles données personnelles collectons-nous ?"
          >
            <p>
              Les données collectées dépendent des fonctionnalités
              que tu utilises sur Webgiverse Tools. Nous cherchons
              à limiter les informations recueillies à celles
              nécessaires au fonctionnement des services.
            </p>

            <ul className="grid gap-4 leading-6">
              <Item>
                <strong className="font-medium text-bleu">
                  Informations du compte :
                </strong>{" "}
                nom ou pseudonyme, adresse e-mail, photo de profil
                lorsqu'elle est fournie par un service de connexion
                tiers, ainsi que les informations nécessaires à
                la gestion du compte.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Informations de connexion :
                </strong>{" "}
                les informations nécessaires à l'authentification
                et à la gestion de ta session. Lorsque tu utilises
                un service de connexion tiers, certaines informations
                peuvent être transmises par ce service.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Utilisation de la plateforme :
                </strong>{" "}
                favoris, listes personnelles, avis, votes,
                propositions d'outils, progression dans les
                tutoriels et préférences enregistrées.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Assistant IA :
                </strong>{" "}
                les messages et informations que tu choisis de
                transmettre à l'assistant afin d'obtenir des
                recommandations ou de l'aide.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Newsletter :
                </strong>{" "}
                adresse e-mail et, si tu les renseignes,
                prénom et autres informations nécessaires à
                la personnalisation des communications.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Formulaire de contact :
                </strong>{" "}
                nom ou pseudonyme, adresse e-mail, objet et
                contenu de ton message.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Informations relatives aux commandes :
                </strong>{" "}
                formule choisie, montant, devise, date de
                transaction, statut du paiement et référence
                de commande, lorsque tu souscris une offre payante.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Parrainage :
                </strong>{" "}
                identifiant ou code de parrainage, informations
                nécessaires à l'attribution des invitations
                et au suivi des éventuelles récompenses.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Données techniques :
                </strong>{" "}
                certaines informations peuvent être recueillies
                lors de la consultation du site, notamment
                l'adresse IP, le navigateur utilisé, le type
                d'appareil, les dates de connexion et les
                informations nécessaires à la sécurité du service.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Préférences de navigation :
                </strong>{" "}
                certaines informations peuvent être conservées
                sur ton appareil pour mémoriser tes préférences
                ou améliorer ton expérience de navigation.
              </Item>
            </ul>

            <p>
              Les informations de paiement sensibles, comme les
              numéros complets de carte bancaire ou les données
              confidentielles de mobile money, sont destinées à
              être saisies sur l'interface sécurisée du prestataire
              de paiement concerné.
            </p>

            <p>
              Webgiverse Tools peut recevoir certaines informations
              relatives à la transaction afin de confirmer le paiement
              et de gérer les droits associés à ton compte.
            </p>
          </Section>

          {/* 3. Finalités */}
          <Section
            id="finalites"
            titre="3. Pourquoi utilisons-nous tes données ?"
          >
            <p>
              Les données personnelles sont utilisées uniquement
              pour des finalités liées à l'exploitation, à la
              gestion et à l'amélioration de Webgiverse Tools.
            </p>

            <ul className="grid gap-3 leading-6">
              <Item>
                <strong className="font-medium text-bleu">
                  Gestion des comptes :
                </strong>{" "}
                créer et administrer les comptes, permettre
                la connexion et proposer les fonctionnalités
                réservées aux membres.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Personnalisation :
                </strong>{" "}
                enregistrer les favoris, les listes, les
                préférences et la progression afin de proposer
                une expérience adaptée.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Fonctionnement de l'assistant IA :
                </strong>{" "}
                traiter les demandes que tu lui adresses pour
                générer des réponses et des recommandations.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Gestion des paiements :
                </strong>{" "}
                suivre les commandes, confirmer les transactions
                et activer les fonctionnalités associées aux
                offres souscrites.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Communication :
                </strong>{" "}
                répondre aux demandes envoyées par le formulaire
                de contact et transmettre les informations
                nécessaires au fonctionnement du service.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Newsletter :
                </strong>{" "}
                envoyer des actualités, des conseils et des
                informations sur les outils et fonctionnalités,
                lorsque tu as choisi de recevoir ces communications.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Sécurité :
                </strong>{" "}
                prévenir les tentatives de fraude, les abus,
                les accès non autorisés et les utilisations
                contraires aux conditions du service.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Amélioration :
                </strong>{" "}
                comprendre l'utilisation de la plateforme,
                identifier les dysfonctionnements et améliorer
                les fonctionnalités proposées.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Obligations légales :
                </strong>{" "}
                respecter les obligations applicables à
                l'éditeur, notamment celles relatives aux
                transactions et à la protection des données.
              </Item>
            </ul>

            <p>
              Les données ne sont pas destinées à être vendues
              à des tiers. Elles ne sont utilisées à d'autres
              fins que celles annoncées que dans les conditions
              autorisées par la réglementation applicable.
            </p>
          </Section>

          {/* 4. Cookies */}
          <Section
            id="cookies"
            titre="4. Cookies et technologies similaires"
          >
            <p>
              Webgiverse Tools peut utiliser des cookies et
              des technologies similaires afin d'assurer
              le fonctionnement du site, de mémoriser certaines
              préférences et d'améliorer l'expérience utilisateur.
            </p>

            <ul className="grid gap-3 leading-6">
              <Item>
                <strong className="font-medium text-bleu">
                  Cookies nécessaires :
                </strong>{" "}
                ils peuvent être utilisés pour assurer certaines
                fonctions essentielles, notamment la gestion
                de la session et la sécurité du compte.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Préférences :
                </strong>{" "}
                certaines informations peuvent être conservées
                pour mémoriser les choix et paramètres de
                navigation.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Contenus intégrés :
                </strong>{" "}
                les vidéos ou autres contenus provenant de
                plateformes tierces peuvent utiliser leurs
                propres cookies et technologies de suivi.
              </Item>
            </ul>

            <p>
              Lorsque des cookies ou traceurs non indispensables
              sont utilisés, leur dépôt et leur utilisation
              doivent respecter les règles applicables en matière
              de consentement et d'information.
            </p>

            <p>
              Tu peux également gérer ou supprimer les cookies
              depuis les paramètres de ton navigateur. Le blocage
              de certains cookies nécessaires peut toutefois
              empêcher le fonctionnement de certaines
              fonctionnalités.
            </p>

            <p>
              Les informations conservées localement sur ton
              appareil peuvent être supprimées depuis les
              paramètres de ton navigateur.
            </p>
          </Section>

          {/* 5. Destinataires */}
          <Section
            id="destinataires"
            titre="5. Qui peut accéder à tes données ?"
          >
            <p>
              Les données personnelles sont accessibles uniquement
              aux personnes et prestataires qui en ont besoin
              pour assurer le fonctionnement de Webgiverse Tools,
              dans la limite de leurs missions respectives.
            </p>

            <ul className="grid gap-3 leading-6">
              <Item>
                <strong className="font-medium text-bleu">
                  L'éditeur de Webgiverse Tools :
                </strong>{" "}
                pour l'administration du service, la gestion
                des comptes, le support et la modération.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Le prestataire d'hébergement :
                </strong>{" "}
                notamment Vercel, pour la mise à disposition
                et l'hébergement du site lorsque ce prestataire
                est utilisé.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Les prestataires de paiement :
                </strong>{" "}
                notamment Chariow et, lorsque ce service est
                effectivement utilisé, Moneroo, pour le traitement
                des commandes et des transactions.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Google :
                </strong>{" "}
                lorsque tu utilises la connexion Google ou
                consultes des contenus intégrés provenant
                de ses services, notamment YouTube.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Les prestataires de communication :
                </strong>{" "}
                pour l'envoi des e-mails nécessaires au
                fonctionnement du compte, au support ou
                à la newsletter.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Les partenaires d'affiliation :
                </strong>{" "}
                lorsque tu suis un lien affilié, certaines
                informations techniques ou identifiants de
                suivi peuvent être transmis au partenaire
                concerné.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Les autorités compétentes :
                </strong>{" "}
                lorsque la communication de données est
                exigée par une disposition légale ou une
                décision d'une autorité compétente.
              </Item>
            </ul>

            <p>
              Les prestataires intervenant dans le fonctionnement
              de la plateforme peuvent traiter certaines données
              pour le compte de l'éditeur, dans le cadre des
              services qu'ils fournissent.
            </p>

            <p>
              Certains prestataires peuvent être établis en
              dehors du Bénin. Lorsque des données personnelles
              sont transférées vers un autre pays, les garanties
              et formalités requises par la réglementation
              applicable doivent être prises en compte.
            </p>

            <p>
              Les conditions de confidentialité des services
              tiers s'appliquent également lorsque tu utilises
              directement leurs fonctionnalités.
            </p>
          </Section>

          {/* 6. Durées */}
          <Section
            id="durees"
            titre="6. Combien de temps conservons-nous tes données ?"
          >
            <p>
              Les données personnelles sont conservées pendant
              une durée adaptée à la finalité pour laquelle
              elles ont été collectées.
            </p>

            <ul className="grid gap-3 leading-6">
              <Item>
                <strong className="font-medium text-bleu">
                  Données du compte :
                </strong>{" "}
                pendant la durée d'activité du compte, puis
                supprimées ou archivées selon les obligations
                légales et les nécessités légitimes de conservation.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Données liées aux commandes :
                </strong>{" "}
                pendant la durée nécessaire à la gestion des
                transactions, au suivi des demandes et au
                respect des obligations légales applicables.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Newsletter :
                </strong>{" "}
                jusqu'au retrait de ton consentement ou à
                la désinscription, sous réserve de la conservation
                minimale des informations nécessaires pour
                respecter ton choix.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Messages de contact :
                </strong>{" "}
                pendant la durée nécessaire au traitement
                de ta demande et au suivi des échanges.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Données d'utilisation :
                </strong>{" "}
                pendant la durée nécessaire à la fourniture
                des fonctionnalités concernées, à la sécurité
                et à l'amélioration du service.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Données techniques :
                </strong>{" "}
                pendant la durée nécessaire à la sécurité,
                au diagnostic des incidents et au bon
                fonctionnement de la plateforme.
              </Item>
            </ul>

            <p>
              À l'expiration des durées applicables, les données
              sont supprimées ou rendues anonymes lorsque cela
              est possible et approprié, sauf lorsqu'une
              conservation supplémentaire est imposée par
              la loi ou nécessaire à la constatation,
              l'exercice ou la défense de droits.
            </p>
          </Section>

          {/* 7. Droits */}
          <Section
            id="droits"
            titre="7. Quels sont tes droits sur tes données ?"
          >
            <p>
              Conformément à la réglementation béninoise relative
              à la protection des données à caractère personnel,
              tu disposes de droits concernant les informations
              qui te concernent.
            </p>

            <ul className="grid gap-3 leading-6">
              <Item>
                <strong className="font-medium text-bleu">
                  Droit d'accès :
                </strong>{" "}
                demander si des données personnelles te
                concernant sont traitées et obtenir les
                informations prévues par la loi.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Droit de rectification :
                </strong>{" "}
                demander la correction de données inexactes,
                incomplètes ou obsolètes.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Droit d'opposition :
                </strong>{" "}
                t'opposer à certains traitements dans les
                conditions prévues par la réglementation.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Droit à l'effacement :
                </strong>{" "}
                demander la suppression de tes données lorsque
                les conditions légales sont réunies.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Droit à la limitation :
                </strong>{" "}
                demander, lorsque les conditions légales sont
                réunies, la limitation de certains traitements.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Droit à la portabilité :
                </strong>{" "}
                demander la récupération de certaines données
                dans les conditions prévues par la loi.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Droit de retirer ton consentement :
                </strong>{" "}
                lorsque le traitement repose sur ton consentement,
                tu peux le retirer pour l'avenir.
              </Item>
            </ul>

            <p>
              Pour exercer tes droits, adresse-nous une demande
              depuis la{" "}
              <Link
                href="/contact"
                className="font-medium text-sky-500 hover:underline"
              >
                page Contact
              </Link>
              . Pour protéger tes informations, nous pouvons
              te demander de justifier ton identité lorsque
              cela est nécessaire.
            </p>

            <p>
              Les demandes sont traitées dans les délais
              prévus par la réglementation applicable.
              Certaines demandes peuvent être limitées ou
              refusées lorsque la loi le prévoit, notamment
              en présence d'une obligation légale de conservation.
            </p>

            <p>
              Si tu estimes que tes droits ne sont pas respectés,
              tu peux contacter l'Autorité de Protection des
              Données à caractère Personnel (APDP) du Bénin.
            </p>

            <p>
              <a
                href="https://apdp.bj/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sky-500 hover:underline"
              >
                Site officiel de l'APDP du Bénin
              </a>
            </p>
          </Section>

          {/* 8. Sécurité */}
          <Section
            id="securite"
            titre="8. Comment protégeons-nous tes données ?"
          >
            <p>
              Webgiverse Tools accorde une importance particulière
              à la confidentialité et à la sécurité des données
              personnelles.
            </p>

            <p>
              Des mesures techniques et organisationnelles
              appropriées sont mises en œuvre afin de limiter
              les risques d'accès non autorisé, de perte,
              d'altération, de divulgation ou d'utilisation
              abusive des informations.
            </p>

            <p>
              L'accès aux données est limité aux personnes
              qui en ont besoin pour assurer l'administration,
              la maintenance, le support ou le fonctionnement
              du service.
            </p>

            <p>
              Les prestataires intervenant dans le traitement
              des données sont sélectionnés en tenant compte
              des services fournis et des exigences de
              confidentialité et de sécurité applicables.
            </p>

            <p>
              Malgré les mesures mises en œuvre, aucun service
              accessible sur Internet ne peut garantir une
              sécurité absolue. En cas d'incident concernant
              des données personnelles, les mesures nécessaires
              sont prises conformément aux obligations légales.
            </p>
          </Section>

          {/* 9. Mineurs */}
          <Section
            id="mineurs"
            titre="9. Protection des mineurs"
          >
            <p>
              Webgiverse Tools est une plateforme destinée
              à un public général. Les personnes mineures
              doivent utiliser les services dans le respect
              des règles applicables dans leur pays et, lorsque
              cela est nécessaire, avec l'autorisation ou
              l'accompagnement de leur représentant légal.
            </p>

            <p>
              Nous invitons les parents et représentants légaux
              à accompagner les mineurs dans leur utilisation
              des services numériques et à veiller aux
              informations personnelles qu'ils communiquent
              en ligne.
            </p>

            <p>
              Si tu constates qu'un mineur a transmis des
              données personnelles dans des conditions
              inappropriées, tu peux nous contacter afin
              que la situation soit examinée.
            </p>
          </Section>

          {/* 10. Contact */}
          <Section
            id="contact"
            titre="10. Contact et mise à jour de la politique"
          >
            <p>
              Pour toute question concernant cette politique,
              l'utilisation de tes données ou l'exercice
              de tes droits, tu peux contacter l'éditeur
              depuis la{" "}
              <Link
                href="/contact"
                className="font-medium text-sky-500 hover:underline"
              >
                page Contact
              </Link>
              .
            </p>

            <p>
              Cette politique peut être modifiée pour tenir
              compte de l'évolution de Webgiverse Tools,
              de ses fonctionnalités ou de la réglementation
              applicable.
            </p>

            <p>
              En cas de modification importante, une information
              pourra être communiquée par les moyens disponibles
              sur la plateforme. La date de dernière mise à jour
              est indiquée en haut de cette page.
            </p>
          </Section>

          {/* Voir aussi */}
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {VOIR_AUSSI.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="group survol-carte rounded-carte border border-bordure bg-white p-5 shadow-carte"
              >
                <l.icone
                  className="size-6 text-sky-500"
                  aria-hidden
                />

                <h2 className="mt-3 font-titre text-[16px] leading-6 font-semibold group-hover:text-sky-500">
                  {l.titre}
                </h2>

                <p className="mt-1 text-[14px] leading-5 text-encre">
                  {l.texte}
                </p>
              </Link>
            ))}
          </div>

          {/* Pied de page */}
          <p className="mesure mt-8 flex items-start gap-2 text-[13px] leading-5 text-encre">
            <ShieldCheck
              className="mt-0.5 size-4 shrink-0 text-sky-500"
              aria-hidden
            />

            <span>
              Politique de confidentialité de Webgiverse Tools —
              version du 5 novembre 2026.
            </span>
          </p>
        </div>
      </section>
    </>
  );
}