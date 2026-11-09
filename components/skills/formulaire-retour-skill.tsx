// components/skills/formulaire-retour.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 43 — Formulaire « Ton retour d'usage » d'une fiche skill.
// Composant CLIENT (useActionState, React 19) : contexte d'usage +
// résultat obtenu (obligatoires, 20 à 2000 caractères) + note
// facultative 1 à 5. L'action serveur envoyerRetourSkill applique le
// verrou Premium et la règle « un seul retour par membre et par skill ».
// ─────────────────────────────────────────────────────────────────
"use client";

import { useActionState } from "react";
import { MessageSquarePlus, Star } from "lucide-react";
import { envoyerRetourSkill, type EtatRetour } from "@/app/actions/skills-favoris";
import { Bouton } from "@/components/ui/bouton";

const ETAT_INITIAL: EtatRetour = { succes: false, message: "" };

export function FormulaireRetour({ skillId }: { skillId: string }) {
  const [etat, action, enAttente] = useActionState<EtatRetour, FormData>(
    envoyerRetourSkill,
    ETAT_INITIAL,
  );

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="skillId" value={skillId} />

      <div>
        <label
          htmlFor="retour-usage"
          className="text-[13px] leading-4 font-semibold text-bleu"
        >
          Dans quel contexte as-tu utilisé cette skill&nbsp;?{" "}
          <span className="font-normal text-encre">(obligatoire)</span>
        </label>
        <textarea
          id="retour-usage"
          name="usage"
          rows={3}
          required
          minLength={20}
          maxLength={2000}
          placeholder="Ex. : je l'utilise pour réviser les pull requests de mon équipe avant chaque merge…"
          className="mt-1.5 w-full resize-y rounded-carte border border-bordure bg-white p-3 text-[14px] leading-6 text-bleu placeholder:text-encre/50 focus:border-violet focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="retour-resultat"
          className="text-[13px] leading-4 font-semibold text-bleu"
        >
          Quel résultat as-tu obtenu&nbsp;?{" "}
          <span className="font-normal text-encre">(obligatoire)</span>
        </label>
        <textarea
          id="retour-resultat"
          name="resultat"
          rows={3}
          required
          minLength={20}
          maxLength={2000}
          placeholder="Ex. : le temps de relecture a été divisé par deux et les retours sont plus cohérents…"
          className="mt-1.5 w-full resize-y rounded-carte border border-bordure bg-white p-3 text-[14px] leading-6 text-bleu placeholder:text-encre/50 focus:border-violet focus:outline-none"
        />
      </div>

      <fieldset>
        <legend className="text-[13px] leading-4 font-semibold text-bleu">
          Ta note <span className="font-normal text-encre">(facultative)</span>
        </legend>
        <div className="mt-1.5 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((valeur) => (
            <label key={valeur} className="cursor-pointer" title={`${valeur} sur 5`}>
              <input type="radio" name="note" value={valeur} className="peer sr-only" />
              <Star
                className="size-6 text-encre/30 transition peer-checked:fill-amber-400 peer-checked:text-amber-400 hover:fill-amber-200 hover:text-amber-300"
                aria-hidden
              />
              <span className="sr-only">{valeur} sur 5</span>
            </label>
          ))}
          <span className="ml-2 text-[12px] leading-4 text-encre">1 = déçu · 5 = excellent</span>
        </div>
      </fieldset>

      {etat.message && (
        <p
          role="status"
          className={
            etat.succes
              ? "rounded-carte border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] leading-5 text-emerald-700"
              : "rounded-carte border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] leading-5 text-red-600"
          }
        >
          {etat.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Bouton type="submit" taille="sm" disabled={enAttente}>
          <MessageSquarePlus aria-hidden />
          {enAttente ? "Envoi…" : "Publier mon retour"}
        </Bouton>
        <span className="text-[12px] leading-4 text-encre">
          Visible sur la fiche par les abonnés Premium — un seul retour par skill.
        </span>
      </div>
    </form>
  );
}