import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, MessageCircle, Scale, ScrollText } from "lucide-react";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Quelles données Webgiverse collecte, pourquoi, combien de temps, avec quels prestataires, et comment exercer tes droits (accès, rectification, effacement, désabonnement).",
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
    texte: "Éditeur du site, hébergement et prestataires techniques.",
  },
  {
    href: "/contact",
    icone: MessageCircle,
    titre: "Exercer tes droits",
    texte: "Accès, rectification, effacement : écris-nous, réponse sous 30 jours.",
  },
];

function Puce() {
  return <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-sky-500" aria-hidden />;
}

export default function PageConfidentialite() {
  return (
    <>
      {/* ── En-tête ─────────────────────────────────────────────── */}
      <section className="hero-verre border-b border-bordure">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center lg:py-18">
          <h1 className="text-[30px] leading-9 font-bold tracking-tight sm:text-h1">
            Politique de <span className="texte-degrade">confidentialité</span>
          </h1>
          <p className="mesure mx-auto mt-4 text-encre">
            Ce que nous collectons, pourquoi, combien de temps — et comment
            garder la main sur tes données.
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
            aria-label="Sommaire de la politique de confidentialité"
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

          {/* ── 1. Responsable ────────────────────────────────────── */}
          <article
            id="responsable"
            className="mt-8 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              1. Qui traite tes données ?
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Le responsable du traitement est l&apos;éditeur du site
                Webgiverse Tools :{" "}
                <strong className="font-medium text-bleu">
                  [À COMPLÉTER : nom / raison sociale + pays de l&apos;éditeur]
                </strong>
                . Pour toute question sur cette politique, utilise la{" "}
                <Link href="/contact" className="font-medium text-sky-500 hover:underline">
                  page Contact
                </Link>
                .
              </p>
            </div>
          </article>

          {/* ── 2. Données collectées ─────────────────────────────── */}
          <article
            id="donnees"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              2. Les données que nous collectons
            </h2>
            <ul className="mesure mt-3 grid gap-4 text-[15px] leading-6 text-encre">
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">
                    Ton compte
                  </strong>{" "}
                  : nom, adresse e-mail, photo de profil (si connexion Google),
                  mot de passe (uniquement pour les comptes e-mail + mot de
                  passe : il est haché, jamais stocké en clair), diagnostic
                  facultatif (objectif, niveau, budget), date
                  d&apos;inscription et statut du compte.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">
                    Ton utilisation
                  </strong>{" "}
                  : favoris, listes, avis publiés et votes, progression des
                  tutoriels, prompts favoris, historique d&apos;activité
                  (type d&apos;action et détails) et conversations avec
                  l&apos;assistant IA.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">Newsletter</strong>{" "}
                  : adresse e-mail et, si tu les renseignes, prénom et nom —
                  avec un lien de désabonnement unique dans chaque e-mail.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">
                    Formulaire de contact
                  </strong>{" "}
                  : nom, e-mail, sujet et message.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">Paiements</strong>{" "}
                  : plan choisi, montant, devise, statut et référence de la
                  transaction.{" "}
                  <strong className="font-medium text-bleu">
                    Aucune donnée bancaire
                  </strong>{" "}
                  (carte, mobile money) ne transite ni n&apos;est stockée sur
                  Webgiverse : tout est traité par le prestataire de paiement.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">Parrainage</strong>{" "}
                  : le code d&apos;invitation utilisé lors de
                  l&apos;inscription (?ref=…) et le lien parrain → filleul
                  pour attribuer les récompenses.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">
                    Statistiques anonymes
                  </strong>{" "}
                  : les termes de recherche sont enregistrés de façon agrégée
                  (terme + nombre de résultats), sans lien avec ton compte ;
                  les compteurs de vues des fiches et des vidéos sont
                  également anonymes.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">
                    Stockage local
                  </strong>{" "}
                  : la liste « vu récemment » est conservée uniquement dans ton
                  navigateur (localStorage) — elle n&apos;est jamais envoyée à
                  nos serveurs.
                </span>
              </li>
            </ul>
          </article>

          {/* ── 3. Finalités ──────────────────────────────────────── */}
          <article
            id="finalites"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              3. Pourquoi, et sur quelle base légale ?
            </h2>
            <ul className="mesure mt-3 grid gap-2 text-[15px] leading-6 text-encre">
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">
                    Faire fonctionner ton compte
                  </strong>{" "}
                  (connexion, favoris, listes, progression, paiements,
                  parrainage) — base légale : exécution du contrat que nous
                  formons avec toi quand tu crées un compte.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">
                    Répondre à tes messages
                  </strong>{" "}
                  (formulaire de contact, support) — base légale : intérêt
                  légitime / mesures précontractuelles.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">
                    Envoi de la newsletter
                  </strong>{" "}
                  — base légale : ton consentement, retirable à tout moment via
                  le lien de désabonnement présent dans chaque e-mail.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">
                    Sécuriser et améliorer le service
                  </strong>{" "}
                  (lutte contre les comptes frauduleux, statistiques anonymes,
                  priorisation des outils à ajouter) — base légale : intérêt
                  légitime.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">
                    Obligations légales
                  </strong>{" "}
                  (conservation des pièces liées aux paiements) — base légale :
                  obligation légale.
                </span>
              </li>
            </ul>
            <p className="mesure mt-3 text-[15px] leading-7 text-encre">
              Nous ne vendons{" "}
              <strong className="font-medium text-bleu">jamais</strong> tes
              données personnelles, et nous n&apos;utilisons pas de
              publicité ciblée.
            </p>
          </article>

          {/* ── 4. Cookies ────────────────────────────────────────── */}
          <article
            id="cookies"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              4. Cookies et stockage local
            </h2>
            <ul className="mesure mt-3 grid gap-2 text-[15px] leading-6 text-encre">
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">
                    Cookie de session
                  </strong>{" "}
                  (indispensable) : il garde ta connexion ouverte. Sans lui,
                  impossible de rester connecté ; il disparaît à la
                  déconnexion.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">
                    Cookie de support (« impersonation »)
                  </strong>{" "}
                  : posé uniquement quand un administrateur ouvre une session
                  de support sur ton compte à ta demande — il s&apos;arrête
                  automatiquement en fin d&apos;intervention.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">
                    Intégrations YouTube
                  </strong>{" "}
                  : les tutoriels sont des lecteurs YouTube embarqués. Lors de
                  la lecture, YouTube (Google) peut déposer ses propres cookies
                  et connaître ton adresse IP — leurs conditions
                  s&apos;appliquent.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">
                    localStorage
                  </strong>{" "}
                  : « vu récemment » reste sur ton appareil. Tu peux le vider
                  à tout moment dans les réglages de ton navigateur.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  Pas de cookies publicitaires, pas de traceurs de réseaux
                  sociaux, pas de revente de données.
                </span>
              </li>
            </ul>
          </article>

          {/* ── 5. Destinataires ──────────────────────────────────── */}
          <article
            id="destinataires"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              5. Qui peut accéder aux données ?
            </h2>
            <ul className="mesure mt-3 grid gap-2 text-[15px] leading-6 text-encre">
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">Vercel Inc.</strong>{" "}
                  (hébergement du site, États-Unis) ;
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">Neon</strong>{" "}
                  (hébergement de la base de données PostgreSQL) ;
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">
                    Notre service SMTP
                  </strong>{" "}
                  (envoi des e-mails transactionnels et de la newsletter) ;
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">
                    Chariow (Axa Zara LLC)
                  </strong>{" "}
                  et le cas échéant{" "}
                  <strong className="font-medium text-bleu">Moneroo</strong> —
                  traitement du paiement (carte bancaire, mobile money,
                  transfert), qui reçoivent directement tes informations de
                  paiement ;
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">Google</strong> —
                  si tu te connectes avec ton compte Google (nom, e-mail, photo
                  transmis selon ta configuration Google) et pour les vidéos
                  YouTube embarquées ;
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">
                    Partenaires d&apos;affiliation
                  </strong>{" "}
                  — si tu cliques un lien affilié puis souscris un service
                  chez eux (le lien peut contenir un identifiant de piste) ;
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  L&apos;équipe de Webgiverse (administration, support,
                  modération) — et les autorités, sur réquisition légale.
                </span>
              </li>
            </ul>
          </article>

          {/* ── 6. Durées ─────────────────────────────────────────── */}
          <article
            id="durees"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              6. Combien de temps ?
            </h2>
            <ul className="mesure mt-3 grid gap-2 text-[15px] leading-6 text-encre">
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">Compte</strong> :
                  tant qu&apos;il est actif, puis supprimé sur demande (les
                  pièces liées aux paiements sont conservées la durée exigée
                  par la loi).
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">Newsletter</strong>{" "}
                  : jusqu&apos;à ton désabonnement (ou après plusieurs envois
                  consécutifs sans interaction).
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">
                    Messages de contact
                  </strong>{" "}
                  : 12 mois après le dernier échange.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">
                    Conversations de l&apos;assistant et historique
                    d&apos;activité
                  </strong>{" "}
                  : tant que ton compte existe, pour que tu retrouves ton
                  historique.
                </span>
              </li>
              <li className="flex gap-2">
                <Puce />
                <span>
                  <strong className="font-medium text-bleu">
                    Termes de recherche
                  </strong>{" "}
                  : conservés de façon anonyme et agrégée.
                </span>
              </li>
            </ul>
          </article>

          {/* ── 7. Droits ─────────────────────────────────────────── */}
          <article
            id="droits"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              7. Tes droits
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Tu peux demander l&apos;
                <strong className="font-medium text-bleu">accès</strong> à tes
                données, leur{" "}
                <strong className="font-medium text-bleu">rectification</strong>
                , leur <strong className="font-medium text-bleu">effacement</strong>
                , la <strong className="font-medium text-bleu">limitation</strong>{" "}
                de leur traitement, t&apos;
                <strong className="font-medium text-bleu">opposer</strong> à un
                traitement, demander la{" "}
                <strong className="font-medium text-bleu">portabilité</strong>{" "}
                de tes données ou retirer ton{" "}
                <strong className="font-medium text-bleu">consentement</strong>{" "}
                (newsletter) à tout moment.
              </p>
              <ul className="grid gap-2 leading-6">
                <li className="flex gap-2">
                  <Puce />
                  <span>
                    Désinscription newsletter : le lien « Se désabonner » de
                    chaque e-mail, ou la page de préférences jointe.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Puce />
                  <span>
                    Suppression de compte et autres demandes :{" "}
                    <Link
                      href="/contact"
                      className="font-medium text-sky-500 hover:underline"
                    >
                      page Contact
                    </Link>{" "}
                    — réponse sous 30 jours maximum.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Puce />
                  <span>
                    Tu peux aussi saisir l&apos;autorité de protection des
                    données de ton pays (en France : la CNIL).
                  </span>
                </li>
              </ul>
            </div>
          </article>

          {/* ── 8. Sécurité ───────────────────────────────────────── */}
          <article
            id="securite"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              8. Sécurité
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Le site est servi en HTTPS, les mots de passe sont hachés
                (bcrypt) et jamais lus même par l&apos;équipe, les sessions
                utilisent des jetons signés révocables à distance, et
                l&apos;espace d&apos;administration est réservé aux comptes
                administrateurs. Si un compte est suspendu pour raison de
                sécurité, ses sessions sont déconnectées immédiatement.
              </p>
            </div>
          </article>

          {/* ── 9. Mineurs ────────────────────────────────────────── */}
          <article
            id="mineurs"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              9. Mineurs
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Webgiverse n&apos;est pas destiné aux personnes de moins de 15
                ans. Si tu es responsable d&apos;un mineur et constates la
                création d&apos;un compte, signale-le-nous via la page Contact
                : il sera supprimé.
              </p>
            </div>
          </article>

          {/* ── 10. Contact ───────────────────────────────────────── */}
          <article
            id="contact"
            className="mt-6 scroll-mt-24 rounded-carte border border-bordure bg-white p-6 shadow-carte"
          >
            <h2 className="font-titre text-h3 font-semibold text-bleu">
              10. Une question ?
            </h2>
            <div className="mesure mt-3 grid gap-3 text-[15px] leading-7 text-encre">
              <p>
                Toute demande relative à cette politique passe par la{" "}
                <Link href="/contact" className="font-medium text-sky-500 hover:underline">
                  page Contact
                </Link>
                . Cette politique peut évoluer : la date de mise à jour en tête
                de page fait foi.
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
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-sky-500" aria-hidden />
            <span>
              Politique de confidentialité de Webgiverse Tools — version du
              6 novembre 2026.
            </span>
          </p>
        </div>
      </section>
    </>
  );
}