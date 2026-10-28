"use client";

// components/commun/formulaire-contact.tsx
// Formulaire de la page Contact : nom, e-mail, sujet, message.
// L'envoi passe par la server action envoyerMessageAction
// (app/actions/contact.ts) via useActionState — le pattern de
// FormulaireNewsletter.
// Lot 8 : bouton d'envoi bleu plein (plus de bouton dégradé violet)
// et champs à focus bleu-ciel — zéro violet sur la page Contact.

import { useActionState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { envoyerMessageAction, type EtatContact } from "@/app/actions/contact";

const SUJETS = [
  "Question sur un outil",
  "Problème de paiement ou d'abonnement",
  "Partenariat (éditeur d'un outil)",
  "Signaler un bug",
  "Autre demande",
];

export function FormulaireContact() {
  const [etat, action, enCours] = useActionState<EtatContact, FormData>(
    envoyerMessageAction,
    { ok: false, message: "" }
  );

  return (
    <div className="rounded-carte border border-bordure bg-white p-5 shadow-carte sm:p-7">
      <h2 className="text-h3 font-semibold text-bleu">Écris-nous</h2>
      <p className="mt-1.5 text-[14px] leading-5 text-encre">
        Remplis ce formulaire : ton message arrive directement dans la boîte de
        l&apos;équipe Webgiverse.
      </p>

      <form action={action} className="mt-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-[13px] leading-4 font-semibold text-bleu">
            Ton nom
            <input
              type="text"
              name="nom"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              placeholder="ex. Awa Koffi"
              className="mt-1.5 w-full rounded-champ border border-bordure bg-white px-3 py-2.5 text-[15px] text-bleu outline-none focus:border-ciel-fonce"
            />
          </label>

          <label className="block text-[13px] leading-4 font-semibold text-bleu">
            Ton e-mail
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="ex. awa@email.com"
              className="mt-1.5 w-full rounded-champ border border-bordure bg-white px-3 py-2.5 text-[15px] text-bleu outline-none focus:border-ciel-fonce"
            />
          </label>
        </div>

        <label className="mt-4 block text-[13px] leading-4 font-semibold text-bleu">
          Sujet
          <select
            name="sujet"
            required
            defaultValue={SUJETS[0]}
            className="mt-1.5 w-full rounded-champ border border-bordure bg-white px-3 py-2.5 text-[15px] text-bleu outline-none focus:border-ciel-fonce"
          >
            {SUJETS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-[13px] leading-4 font-semibold text-bleu">
          Ton message
          <textarea
            name="message"
            required
            minLength={10}
            maxLength={3000}
            rows={6}
            placeholder="Décris ta demande le plus précisément possible (outil concerné, ce qui s'est passé…)."
            className="mt-1.5 w-full resize-y rounded-champ border border-bordure bg-white px-3 py-2.5 text-[15px] text-bleu outline-none focus:border-ciel-fonce"
          />
        </label>

        {etat.message && (
          <p
            role="status"
            className={`mt-4 flex items-start gap-2 rounded-champ border px-3 py-2.5 text-[13px] leading-5 font-medium ${
              etat.ok
                ? "border-[#00845c]/30 bg-[#00845c]/10 text-[#00654a]"
                : "border-rouge/30 bg-rouge/10 text-rouge"
            }`}
          >
            {etat.ok ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
            ) : null}
            {etat.message}
          </p>
        )}

        {/* Lot 8 : bouton bleu plein — plus de dégradé violet */}
        <button
          type="submit"
          disabled={enCours}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-bleu px-8 text-[16px] leading-5 font-semibold text-white shadow-[0_2px_12px_rgba(11,27,63,0.25)] transition duration-200 hover:bg-[#12295c] active:bg-[#081c40] disabled:pointer-events-none disabled:opacity-50"
        >
          {enCours ? (
            <>
              <Loader2 className="animate-spin" aria-hidden /> Envoi en cours…
            </>
          ) : (
            <>
              <Send aria-hidden /> Envoyer mon message
            </>
          )}
        </button>
      </form>
    </div>
  );
}