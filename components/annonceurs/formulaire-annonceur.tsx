"use client";

// components/annonceurs/formulaire-annonceur.tsx
// Formulaire de la page Annonceurs : demande de mise en avant.
// Même pattern que FormulaireContact (useActionState + server action).

import { useActionState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { envoyerDemandeAnnonceur, type EtatAnnonceur } from "@/app/actions/annonceur";

const FORMULES = [
  "À la une — 1 semaine ($19)",
  "À la une — 1 mois ($49)",
];

export function FormulaireAnnonceur() {
  const [etat, action, enCours] = useActionState<EtatAnnonceur, FormData>(
    envoyerDemandeAnnonceur,
    { ok: false, message: "" }
  );

  return (
    <div className="rounded-carte border border-bordure bg-white p-5 shadow-carte sm:p-7">
      <h2 className="text-h3 font-semibold">Demande de mise en avant</h2>
      <p className="mt-1.5 text-[14px] leading-5 text-encre">
        Remplis ce formulaire : on vérifie ton outil puis tu reçois le lien de
        paiement par e-mail sous 24 h ouvrées.
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
              className="mt-1.5 w-full rounded-champ border border-bordure bg-white px-3 py-2.5 text-[15px] text-bleu outline-none focus:border-violet"
            />
          </label>

          <label className="block text-[13px] leading-4 font-semibold text-bleu">
            Ton e-mail professionnel
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="ex. awa@monoutil.com"
              className="mt-1.5 w-full rounded-champ border border-bordure bg-white px-3 py-2.5 text-[15px] text-bleu outline-none focus:border-violet"
            />
          </label>
        </div>

        <label className="mt-4 block text-[13px] leading-4 font-semibold text-bleu">
          Nom de ton outil (+ URL si déjà référencé)
          <input
            type="text"
            name="outil"
            required
            minLength={2}
            maxLength={160}
            placeholder="ex. MonOutil IA — monoutil.com"
            className="mt-1.5 w-full rounded-champ border border-bordure bg-white px-3 py-2.5 text-[15px] text-bleu outline-none focus:border-violet"
          />
        </label>

        <label className="mt-4 block text-[13px] leading-4 font-semibold text-bleu">
          Formule souhaitée
          <select
            name="formule"
            required
            defaultValue="semaine"
            className="mt-1.5 w-full rounded-champ border border-bordure bg-white px-3 py-2.5 text-[15px] text-bleu outline-none focus:border-violet"
          >
            <option value="semaine">{FORMULES[0]}</option>
            <option value="mois">{FORMULES[1]}</option>
          </select>
        </label>

        <label className="mt-4 block text-[13px] leading-4 font-semibold text-bleu">
          Qu&apos;essaies-tu de mettre en avant ?
          <textarea
            name="message"
            required
            minLength={10}
            maxLength={2000}
            rows={5}
            placeholder="Ton audience, ce qui rend l'outil unique, une offre spéciale à afficher…"
            className="mt-1.5 w-full resize-y rounded-champ border border-bordure bg-white px-3 py-2.5 text-[15px] text-bleu outline-none focus:border-violet"
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

        <Bouton
          type="submit"
          taille="lg"
          disabled={enCours}
          className="mt-5 w-full"
        >
          {enCours ? (
            <>
              <Loader2 className="animate-spin" aria-hidden /> Envoi en cours…
            </>
          ) : (
            <>
              <Send aria-hidden /> Envoyer ma demande
            </>
          )}
        </Bouton>
      </form>
    </div>
  );
}