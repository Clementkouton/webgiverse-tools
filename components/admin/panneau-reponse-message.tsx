// components/admin/panneau-reponse-message.tsx
"use client";
// ─────────────────────────────────────────────────────────────────
// LOT 71 — Panneau « Répondre » d'un message de contact (modération).
// Le bouton « Répondre » s'affiche dans la carte du message. Quand il
// est ouvert, le panneau propose :
//   • l'objet prérempli (« Re : … ») et la réponse modifiable ;
//   • « Générer avec l'assistant » → route /api/admin/messages/
//     reponse-ia : un brouillon rédigé à partir du VRAI message et
//     des formules réelles du site (1 semaine 19 $ / 1 mois 49 $) ;
//   • deux boutons d'insertion des liens de paiement Chariow
//     (variables CHARIOW_URL_SEMAINE / CHARIOW_URL_MOIS) à la
//     position du curseur ;
//   • « Envoyer la réponse » → server action
//     repondreMessageContactFormulaire : e-mail (nodemailer) puis
//     message marqué traité automatiquement.
//
// LOT 72 — CORRECTIF DU DÉBORDEMENT : le panneau était rendu DANS la
// rangée d'actions (flex shrink-0) de la carte : sa largeur en
// pourcentage se calculait sur un conteneur de largeur indéterminée
// et poussait toute la carte hors de l'écran. Désormais le composant
// est un BLOC pleine largeur placé sous le contenu de la carte :
//   • le bouton « Répondre / Fermer » est aligné à droite, sous les
//     autres actions ;
//   • le panneau s'ouvre en dessous, largeur limitée (max-w-[720px]),
//     ce qui ne peut plus déborder quel que soit l'écran.
// Charte inchangée : mêmes classes Tailwind que les formulaires admin
// (formulaire-annonceur, formulaire-contact). Aucune librairie neuve.
// ─────────────────────────────────────────────────────────────────
import { useActionState, useRef, useState } from "react";
import { Loader2, Reply, Send, Sparkles, X } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import {
  repondreMessageContactFormulaire,
  type EtatReponseMessage,
} from "@/app/actions/moderation";

type InfosMessage = {
  id: string;
  nom: string;
  email: string;
  sujet: string;
  texte: string;
};

type Props = {
  message: InfosMessage;
  /** Lien de paiement Chariow — formule « À la une — 1 semaine ($19) », ou null. */
  lienSemaine: string | null;
  /** Lien de paiement Chariow — formule « À la une — 1 mois ($49) », ou null. */
  lienMois: string | null;
};

// Mention écrite par l'assistant QUAND aucun lien n'est configuré
// (même chaîne que dans /api/admin/messages/reponse-ia) : cliquer sur
// un bouton d'insertion REMPLACE cette mention au lieu d'ajouter le
// lien à côté.
const MENTION_LIEN_MANQUANT = "[Lien de paiement à insérer]";

export function PanneauReponseMessage({ message, lienSemaine, lienMois }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [sujet, setSujet] = useState(`Re : ${message.sujet}`.slice(0, 200));
  const [corps, setCorps] = useState("");
  const [enGeneration, setEnGeneration] = useState(false);
  const [erreurIa, setErreurIa] = useState("");
  const refZone = useRef<HTMLTextAreaElement | null>(null);

  const [etat, actionFormulaire, enEnvoi] = useActionState<
    EtatReponseMessage,
    FormData
  >(repondreMessageContactFormulaire, { ok: false, message: "" });

  /* Insère un lien dans la réponse. Si le brouillon de l'assistant
     contient encore la mention « [Lien de paiement à insérer] », elle
     est REMPLACÉE (première occurrence) ; sinon insertion à la
     position du curseur (ou à la fin). */
  function inserer(texte: string) {
    const positionMention = corps.indexOf(MENTION_LIEN_MANQUANT);
    if (positionMention !== -1) {
      const avant = corps.slice(0, positionMention);
      const apres = corps.slice(positionMention + MENTION_LIEN_MANQUANT.length);
      setCorps(`${avant}${texte}${apres}`);
      requestAnimationFrame(() => {
        refZone.current?.focus();
        const position = (avant + texte).length;
        refZone.current?.setSelectionRange(position, position);
      });
      return;
    }

    const zone = refZone.current;
    if (!zone) {
      setCorps((actuel) => (actuel ? `${actuel}\n\n${texte}` : texte));
      return;
    }
    const debut = zone.selectionStart ?? corps.length;
    const fin = zone.selectionEnd ?? corps.length;
    const avant = corps.slice(0, debut);
    const apres = corps.slice(fin);
    const greffe =
      avant && !avant.endsWith("\n") ? `\n\n${texte}` : avant ? `\n${texte}` : texte;
    setCorps(`${avant}${greffe}${apres}`);
    requestAnimationFrame(() => {
      zone.focus();
      const position = (avant + greffe).length;
      zone.setSelectionRange(position, position);
    });
  }

  /* Génère un brouillon de réponse avec l'assistant (route admin). */
  async function generer() {
    setEnGeneration(true);
    setErreurIa("");
    try {
      const reponse = await fetch("/api/admin/messages/reponse-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: message.id }),
      });
      const donnees = (await reponse.json().catch(() => null)) as {
        suggestion?: string;
        erreur?: string;
      } | null;
      if (reponse.ok && donnees?.suggestion) {
        setCorps(donnees.suggestion);
      } else {
        setErreurIa(
          donnees?.erreur ??
            "L'assistant n'a pas réussi à rédiger une réponse. Réessaie dans un instant."
        );
      }
    } catch {
      setErreurIa("Connexion impossible à l'assistant. Vérifie ta connexion puis réessaie.");
    } finally {
      setEnGeneration(false);
    }
  }

  return (
    /* LOT 72 — bloc pleine largeur, enfant direct de la carte : la
       largeur du panneau se calcule désormais sur une largeur DÉFINIE
       (la carte), plus sur une rangée flex « shrink-0 », donc aucun
       débordement possible. */
    <div className="mt-4 w-full">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {ouvert ? (
          <Bouton
            type="button"
            variante="secondaire"
            onClick={() => setOuvert(false)}
            aria-label="Fermer le panneau de réponse"
          >
            <X className="size-4" aria-hidden /> Fermer
          </Bouton>
        ) : (
          <Bouton type="button" variante="indigo" onClick={() => setOuvert(true)}>
            <Reply className="size-4" aria-hidden /> Répondre
          </Bouton>
        )}
      </div>

      {ouvert && (
        <div className="mt-3 w-full max-w-[720px] rounded-carte border border-bordure bg-white p-4 sm:p-5">
          <p className="text-[13px] text-encre">
            Réponse à <span className="font-semibold">{message.nom}</span> ·{" "}
            <a
              href={`mailto:${message.email}`}
              className="break-all text-primaire-texte hover:underline"
            >
              {message.email}
            </a>
          </p>

          <form action={actionFormulaire} className="mt-3">
            <input type="hidden" name="messageId" value={message.id} />

            <label className="block text-[13px] leading-4 font-semibold text-bleu">
              Objet de la réponse
              <input
                type="text"
                name="sujet"
                value={sujet}
                onChange={(evenement) => setSujet(evenement.target.value)}
                required
                maxLength={200}
                className="mt-1.5 w-full rounded-champ border border-bordure bg-white px-3 py-2.5 text-[15px] text-bleu outline-none focus:border-sky-500"
              />
            </label>

            <label className="mt-3 block text-[13px] leading-4 font-semibold text-bleu">
              Ta réponse (partira telle quelle par e-mail)
              <textarea
                ref={refZone}
                name="corps"
                value={corps}
                onChange={(evenement) => setCorps(evenement.target.value)}
                required
                rows={9}
                maxLength={5000}
                placeholder="Écris ta réponse, ou clique sur « Générer avec l'assistant » pour partir d'un brouillon…"
                className="mt-1.5 w-full rounded-champ border border-bordure bg-white px-3 py-2.5 text-[15px] leading-6 text-bleu outline-none focus:border-sky-500"
              />
            </label>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Bouton
                type="button"
                variante="indigoDoux"
                onClick={generer}
                disabled={enGeneration || enEnvoi}
              >
                {enGeneration ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="size-4" aria-hidden />
                )}
                {enGeneration ? "L'assistant rédige…" : "Générer avec l'assistant"}
              </Bouton>
              <Bouton
                type="button"
                variante="secondaire"
                taille="sm"
                onClick={() => lienSemaine && inserer(lienSemaine)}
                disabled={!lienSemaine}
                title={
                  lienSemaine ??
                  "Configure CHARIOW_URL_SEMAINE dans les variables d'environnement"
                }
              >
                Insérer lien — 1 semaine ($19)
              </Bouton>
              <Bouton
                type="button"
                variante="secondaire"
                taille="sm"
                onClick={() => lienMois && inserer(lienMois)}
                disabled={!lienMois}
                title={
                  lienMois ??
                  "Configure CHARIOW_URL_MOIS dans les variables d'environnement"
                }
              >
                Insérer lien — 1 mois ($49)
              </Bouton>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Bouton type="submit" variante="primaire" disabled={enGeneration || enEnvoi}>
                {enEnvoi ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="size-4" aria-hidden />
                )}
                {enEnvoi ? "Envoi…" : "Envoyer la réponse"}
              </Bouton>
              <p className="text-[12px] text-adm-gris">
                L'expéditeur reçoit un e-mail ; le message est marqué traité
                automatiquement.
              </p>
            </div>

            {erreurIa && (
              <p className="mt-3 break-words rounded-champ bg-adm-alerte-doux px-3 py-2 text-[13px] text-[#b26f00]">
                {erreurIa}
              </p>
            )}
            {etat.message && !etat.ok && (
              <p className="mt-3 break-words rounded-champ bg-adm-alerte-doux px-3 py-2 text-[13px] text-[#b26f00]">
                {etat.message}
              </p>
            )}
            {etat.message && etat.ok && (
              <p className="mt-3 break-words rounded-champ bg-adm-succes-doux px-3 py-2 text-[13px] text-[#0b8a78]">
                {etat.message}
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}