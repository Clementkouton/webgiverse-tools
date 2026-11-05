import type { Metadata } from "next";
import Link from "next/link";
import {
  ScrollText,
  ShieldCheck,
  Scale,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation (CGU) | Webgiverse Tools",
  description:
    "Consulte les conditions générales d'utilisation de Webgiverse Tools : compte, fonctionnalités gratuites et Premium, paiements, contenus et responsabilités.",
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
    texte: "Découvre les données traitées, leur utilisation et tes droits.",
  },
  {
    href: "/mentions-legales",
    icone: Scale,
    titre: "Mentions légales",
    texte: "Identité de l'éditeur, hébergement et informations légales.",
  },
  {
    href: "/tarifs",
    icone: ScrollText,
    titre: "Voir les tarifs",
    texte: "Consulte les fonctionnalités et les tarifs des différentes offres.",
  },
];

function Puce() {
  return (
    <span
      className="mt-2.5 size-1.5 shrink-0 rounded-full bg-sky-500"
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
  children: React.ReactNode;
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

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <Puce />
      <span>{children}</span>
    </li>
  );
}

export default function PageCgu() {
  return (
    <>
      {/* En-tête */}
      <section className="hero-verre border-b border-bordure">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center lg:py-18">
          <h1 className="text-[30px] leading-9 font-bold tracking-tight sm:text-h1">
            Conditions générales{" "}
            <span className="texte-degrade">d&apos;utilisation</span>
          </h1>

          <p className="mesure mx-auto mt-4 text-encre">
            Les règles d&apos;utilisation de Webgiverse Tools, présentées de
            manière claire et transparente.
          </p>
        </div>
      </section>

      <section className="py-14 lg:py-18">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-legende text-encre">
            Dernière mise à jour : 5 novembre 2026
          </p>

          {/* Sommaire */}
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

          {/* 1. Objet */}
          <Section id="objet" titre="1. Objet et acceptation">
            <p>
              Les présentes conditions générales d&apos;utilisation (CGU)
              encadrent l&apos;accès et l&apos;utilisation de Webgiverse Tools,
              une plateforme proposant notamment un annuaire d&apos;outils et
              d&apos;agents d&apos;intelligence artificielle, des tutoriels,
              une bibliothèque de prompts, un assistant de recommandation,
              des contenus éditoriaux et un espace membre.
            </p>

            <p>
              En utilisant les services de Webgiverse Tools, tu reconnais
              avoir pris connaissance des présentes conditions. La création
              d&apos;un compte ou la souscription à une offre payante peut
              également nécessiter une acceptation expresse de ces conditions.
            </p>

            <p>
              Si tu n&apos;acceptes pas ces conditions, nous te demandons de
              ne pas utiliser les fonctionnalités concernées.
            </p>

            <p>
              Les présentes CGU sont complétées par notre{" "}
              <Link
                href="/confidentialite"
                className="font-medium text-sky-500 hover:underline"
              >
                politique de confidentialité
              </Link>{" "}
              et nos{" "}
              <Link
                href="/mentions-legales"
                className="font-medium text-sky-500 hover:underline"
              >
                mentions légales
              </Link>
              .
            </p>
          </Section>

          {/* 2. Définitions */}
          <Section id="definitions" titre="2. Définitions">
            <ul className="grid gap-2 leading-6">
              <Item>
                <strong className="font-medium text-bleu">Site :</strong>{" "}
                le site Webgiverse Tools et l&apos;ensemble de ses pages.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">Visiteur :</strong>{" "}
                toute personne qui consulte le site sans disposer d&apos;un
                compte.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">Membre :</strong>{" "}
                toute personne ayant créé un compte sur la plateforme.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">Outils :</strong>{" "}
                les logiciels, applications, plateformes et agents
                d&apos;intelligence artificielle référencés sur le site.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Plan Découverte :
                </strong>{" "}
                l&apos;offre gratuite donnant accès à certaines
                fonctionnalités de la plateforme.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Offres Premium :
                </strong>{" "}
                les formules payantes proposées sur la page Tarifs.
              </Item>
            </ul>
          </Section>

          {/* 3. Compte */}
          <Section id="compte" titre="3. Compte et plan Découverte">
            <p>
              La consultation des pages publiques de Webgiverse Tools peut
              être effectuée sans création de compte. Certaines fonctionnalités
              nécessitent toutefois de disposer d&apos;un compte membre.
            </p>

            <p>
              La création d&apos;un compte peut être proposée par connexion
              Google ou par adresse e-mail et mot de passe, selon les options
              disponibles sur la plateforme.
            </p>

            <p>
              Le plan Découverte donne accès aux fonctionnalités gratuites
              indiquées sur le site. Les limites d&apos;utilisation, quotas
              et fonctionnalités incluses sont ceux affichés sur la plateforme
              au moment de l&apos;utilisation.
            </p>

            <ul className="grid gap-2 leading-6">
              <Item>
                Tu t&apos;engages à fournir des informations exactes lors de
                la création de ton compte et à les maintenir à jour.
              </Item>

              <Item>
                Tu es responsable de la confidentialité de tes identifiants
                et des activités réalisées depuis ton compte.
              </Item>

              <Item>
                En cas d&apos;utilisation non autorisée de ton compte, tu dois
                nous contacter dans les meilleurs délais par la{" "}
                <Link
                  href="/contact"
                  className="font-medium text-sky-500 hover:underline"
                >
                  page Contact
                </Link>
                .
              </Item>

              <Item>
                Le partage, la création de faux comptes ou toute manipulation
                destinée à contourner les limites du service sont interdits.
              </Item>

              <Item>
                Tu peux demander la suppression de ton compte à tout moment,
                sous réserve des obligations légales de conservation de
                certaines informations.
              </Item>
            </ul>

            <p>
              <strong className="font-medium text-bleu">Parrainage :</strong>{" "}
              si un programme de parrainage est proposé, ses conditions,
              récompenses et limites sont celles affichées dans l&apos;espace
              membre au moment de la participation. L&apos;auto-parrainage,
              les faux comptes et les manipulations du programme sont interdits.
            </p>
          </Section>

          {/* 4. Premium */}
          <Section id="premium" titre="4. Offres Premium et paiements">
            <p>
              Webgiverse Tools peut proposer des offres payantes donnant accès
              à des fonctionnalités supplémentaires. Les caractéristiques,
              prix, durée d&apos;accès et modalités de paiement sont présentés
              sur la{" "}
              <Link
                href="/tarifs"
                className="font-medium text-sky-500 hover:underline"
              >
                page Tarifs
              </Link>{" "}
              et récapitulés avant la validation de la commande.
            </p>

            <p>
              Les offres actuellement présentées sur la plateforme comprennent
              notamment :
            </p>

            <ul className="grid gap-2 leading-6">
              <Item>
                <strong className="font-medium text-bleu">
                  Pro — 2,99 USD :
                </strong>{" "}
                accès aux avantages Premium associés à cette formule,
                conformément à la description affichée au moment de
                l&apos;achat.
              </Item>

              <Item>
                <strong className="font-medium text-bleu">
                  Entreprise — 7,99 USD :
                </strong>{" "}
                accès aux fonctionnalités supplémentaires prévues pour cette
                formule, conformément à la description affichée au moment
                de l&apos;achat.
              </Item>
            </ul>

            <p>
              Les prix, devises, moyens de paiement et durées peuvent évoluer.
              Les informations affichées au moment de la commande font foi
              pour l&apos;achat concerné.
            </p>

            <p>
              Les paiements sont traités par un prestataire de paiement
              externe, notamment Chariow lorsque ce moyen est proposé.
              Les moyens de paiement disponibles dépendent du pays et des
              options présentées au moment de la commande.
            </p>

            <p>
              Webgiverse Tools ne demande pas aux membres de communiquer leurs
              coordonnées bancaires directement par message ou par e-mail.
              Le paiement doit être réalisé uniquement à travers le parcours
              de paiement officiel proposé sur la plateforme.
            </p>

            <p>
              <strong className="font-medium text-bleu">
                Durée et renouvellement :
              </strong>{" "}
              lorsque l&apos;offre est présentée comme un accès prépayé de
              30 jours sans reconduction automatique, l&apos;accès prend fin
              à l&apos;expiration de cette période. Un nouveau paiement est
              alors nécessaire pour prolonger l&apos;accès Premium.
            </p>

            <p>
              Les modalités de renouvellement applicables sont toujours celles
              indiquées avant le paiement. Si une formule prévoit une
              reconduction automatique, cette information doit être clairement
              présentée avant la validation de la commande.
            </p>

            <p>
              À l&apos;expiration d&apos;un accès Premium, le compte peut
              repasser au plan Découverte. La disponibilité des données et
              fonctionnalités après expiration dépend des conditions du
              service et des règles de conservation applicables.
            </p>

            <p>
              Les demandes relatives à une commande, à un paiement ou à un
              remboursement peuvent être adressées depuis la{" "}
              <Link
                href="/contact"
                className="font-medium text-sky-500 hover:underline"
              >
                page Contact
              </Link>
              . Elles sont examinées conformément aux conditions affichées
              lors de l&apos;achat et aux dispositions légales applicables.
            </p>

            <p>
              Les codes promotionnels sont soumis à leurs conditions
              particulières, notamment leur période de validité, leur quota
              éventuel et leurs règles de cumul.
            </p>
          </Section>

          {/* 5. Règles d'utilisation */}
          <Section id="regles" titre="5. Règles d'utilisation">
            <p>
              En utilisant Webgiverse Tools, tu t&apos;engages à respecter
              la loi, les présentes conditions et les droits des autres
              utilisateurs.
            </p>

            <ul className="grid gap-2 leading-6">
              <Item>
                Ne pas utiliser la plateforme à des fins frauduleuses,
                illicites ou portant atteinte aux droits d&apos;autrui.
              </Item>

              <Item>
                Ne pas tenter de contourner les limites techniques ou
                commerciales de ton offre.
              </Item>

              <Item>
                Ne pas procéder à une extraction massive ou automatisée du
                catalogue sans autorisation préalable.
              </Item>

              <Item>
                Ne pas revendre, céder ou partager un accès personnel lorsque
                cette pratique n&apos;est pas autorisée par l&apos;offre.
              </Item>

              <Item>
                Ne pas publier de faux avis, de contenus trompeurs, de spam,
                de propos injurieux ou de liens malveillants.
              </Item>

              <Item>
                Ne pas tenter de perturber le fonctionnement, la sécurité
                ou la disponibilité de la plateforme.
              </Item>

              <Item>
                Ne pas reproduire ou commercialiser les contenus de
                Webgiverse Tools sans autorisation, sauf exceptions prévues
                par la loi.
              </Item>
            </ul>
          </Section>

          {/* 6. Contenus des membres */}
          <Section id="contenus" titre="6. Contenus publiés par les membres">
            <p>
              Les membres peuvent, selon les fonctionnalités disponibles,
              publier des avis, notes, votes, commentaires ou propositions
              d&apos;outils.
            </p>

            <p>
              Tu restes responsable des contenus que tu publies. Tu garantis
              disposer des droits nécessaires pour les partager et t&apos;engages
              à ne pas publier de contenus illicites, diffamatoires,
              contrefaisants ou portant atteinte aux droits d&apos;un tiers.
            </p>

            <p>
              En publiant un contenu sur la plateforme, tu autorises
              Webgiverse Tools, à titre non exclusif et gratuit, à
              l&apos;héberger, l&apos;afficher et le reproduire dans la mesure
              nécessaire au fonctionnement et à la promotion du service.
            </p>

            <p>
              Cette autorisation ne transfère pas la propriété de ton contenu.
              Elle prend fin lorsque le contenu est supprimé, sous réserve
              des copies techniques temporaires et des obligations légales
              de conservation.
            </p>

            <p>
              L&apos;éditeur peut masquer ou retirer un contenu manifestement
              illicite, abusif ou contraire aux présentes conditions. Lorsque
              cela est possible, le membre concerné est informé du motif
              de cette décision.
            </p>
          </Section>

          {/* 7. Contenus tiers */}
          <Section id="tiers" titre="7. Outils et contenus de tiers">
            <p>
              Webgiverse Tools référence des outils, logiciels, applications,
              plateformes et agents d&apos;intelligence artificielle édités
              ou exploités par des tiers indépendants.
            </p>

            <p>
              Les informations présentées dans les fiches — fonctionnalités,
              tarifs, langues, disponibilité et conditions d&apos;accès —
              sont fournies à titre informatif. Elles peuvent évoluer sans
              que Webgiverse Tools en soit immédiatement informé.
            </p>

            <p>
              Avant d&apos;acheter ou d&apos;utiliser un outil externe, tu
              dois vérifier ses tarifs, ses conditions d&apos;utilisation,
              sa politique de confidentialité et ses éventuelles restrictions
              directement auprès de son éditeur.
            </p>

            <p>
              Les tutoriels vidéo peuvent intégrer des contenus hébergés
              sur des plateformes tierces, notamment YouTube. Leur lecture
              est soumise aux conditions et politiques de ces plateformes.
            </p>

            <p>
              Les noms, marques et logos des outils référencés appartiennent
              à leurs propriétaires respectifs. Sauf indication contraire,
              Webgiverse Tools est un service indépendant et n&apos;est ni
              propriétaire ni représentant des outils présentés.
            </p>
          </Section>

          {/* 8. Affiliation */}
          <Section id="affiliation" titre="8. Liens d'affiliation">
            <p>
              Certains liens présents sur Webgiverse Tools peuvent être des
              liens d&apos;affiliation. Cela signifie que l&apos;éditeur
              peut recevoir une commission lorsqu&apos;un utilisateur
              souscrit à un service ou réalise un achat après avoir suivi
              l&apos;un de ces liens.
            </p>

            <p>
              Lorsqu&apos;un lien est affilié, cette information doit être
              indiquée de manière claire. Le recours à l&apos;affiliation
              n&apos;entraîne pas nécessairement de coût supplémentaire
              pour l&apos;utilisateur.
            </p>

            <p>
              La présence d&apos;un lien d&apos;affiliation ne constitue
              pas une garantie de qualité, de disponibilité ou de résultat
              du service tiers. Il appartient à chaque utilisateur de
              vérifier les conditions de l&apos;offre auprès de son éditeur.
            </p>
          </Section>

          {/* 9. Newsletter */}
          <Section id="newsletter" titre="9. Newsletter et communications">
            <p>
              Si une newsletter est proposée, l&apos;inscription repose
              sur une démarche volontaire. Les informations utilisées
              pour son envoi sont traitées conformément à notre{" "}
              <Link
                href="/confidentialite"
                className="font-medium text-sky-500 hover:underline"
              >
                politique de confidentialité
              </Link>
              .
            </p>

            <p>
              Tu peux te désabonner des communications promotionnelles
              à tout moment en utilisant le lien prévu dans les e-mails
              concernés, lorsqu&apos;il est disponible.
            </p>

            <p>
              Certains messages indispensables au fonctionnement du compte,
              à la sécurité ou au suivi d&apos;une commande peuvent être
              envoyés indépendamment de l&apos;inscription à la newsletter.
            </p>
          </Section>

          {/* 10. Suspension */}
          <Section id="suspension" titre="10. Suspension et suppression du compte">
            <p>
              En cas de violation des présentes conditions, d&apos;usage
              frauduleux, de tentative d&apos;atteinte à la sécurité ou
              de comportement portant préjudice au service ou à ses membres,
              l&apos;éditeur peut prendre des mesures adaptées.
            </p>

            <p>
              Ces mesures peuvent inclure la limitation de certaines
              fonctionnalités, la suppression d&apos;un contenu, la
              suspension temporaire ou la fermeture d&apos;un compte.
            </p>

            <p>
              Lorsque les circonstances le permettent, le membre concerné
              est informé du motif de la mesure et peut contacter
              l&apos;éditeur pour demander un réexamen.
            </p>

            <p>
              La suspension ou la fermeture d&apos;un compte ne prive pas
              l&apos;utilisateur des droits qui lui sont reconnus par
              la législation applicable, notamment en matière de
              remboursement ou de contestation d&apos;un paiement.
            </p>

            <p>
              Tu peux cesser d&apos;utiliser le service et demander la
              suppression de ton compte en passant par la{" "}
              <Link
                href="/contact"
                className="font-medium text-sky-500 hover:underline"
              >
                page Contact
              </Link>
              .
            </p>
          </Section>

          {/* 11. Responsabilité */}
          <Section id="responsabilite" titre="11. Disponibilité et responsabilité">
            <p>
              Webgiverse Tools s&apos;efforce de maintenir la plateforme
              accessible et de fournir des informations utiles et à jour.
              Toutefois, le service peut connaître des interruptions,
              opérations de maintenance, modifications ou indisponibilités.
            </p>

            <p>
              Les informations publiées sur la plateforme sont fournies
              à titre informatif. Elles ne constituent pas une garantie
              de résultat, un conseil professionnel ou une promesse de
              revenus.
            </p>

            <p>
              L&apos;utilisation des outils tiers se fait sous la
              responsabilité de chaque utilisateur et conformément aux
              conditions de leurs éditeurs respectifs.
            </p>

            <p>
              L&apos;éditeur ne peut être tenu responsable des dommages
              résultant directement d&apos;un fait imputable à un tiers,
              d&apos;une mauvaise utilisation du service ou d&apos;un
              événement échappant raisonnablement à son contrôle, dans
              les limites autorisées par la loi.
            </p>

            <p>
              Aucune disposition des présentes conditions n&apos;a pour
              effet d&apos;exclure ou de limiter une responsabilité qui
              ne pourrait légalement l&apos;être.
            </p>
          </Section>

          {/* 12. Droit applicable */}
          <Section id="droit" titre="12. Modifications et droit applicable">
            <p>
              Les présentes conditions peuvent être modifiées afin de
              tenir compte de l&apos;évolution de Webgiverse Tools, de
              ses fonctionnalités ou de la réglementation applicable.
            </p>

            <p>
              La version applicable est celle publiée sur cette page.
              La date de dernière mise à jour figure en haut du document.
              En cas de modification importante, une information peut
              être communiquée aux membres par les moyens disponibles
              sur la plateforme.
            </p>

            <p>
              Les présentes conditions sont soumises au droit béninois,
              sous réserve des dispositions impératives éventuellement
              applicables à l&apos;utilisateur.
            </p>

            <p>
              En cas de difficulté, les parties sont invitées à rechercher
              une solution amiable en contactant l&apos;éditeur depuis
              la{" "}
              <Link
                href="/contact"
                className="font-medium text-sky-500 hover:underline"
              >
                page Contact
              </Link>
              .
            </p>

            <p>
              À défaut de résolution amiable, le différend pourra être
              soumis aux juridictions compétentes conformément aux règles
              de droit applicables.
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
                <l.icone className="size-6 text-sky-500" aria-hidden />

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
            <ScrollText
              className="mt-0.5 size-4 shrink-0 text-sky-500"
              aria-hidden
            />
            <span>
              Conditions générales d&apos;utilisation de Webgiverse Tools —
              version du 5 novembre 2026.
            </span>
          </p>
        </div>
      </section>
    </>
  );
}