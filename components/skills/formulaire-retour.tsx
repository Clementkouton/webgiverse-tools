// components/skills/formulaire-retour.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 44 — Formulaire « Ton retour d'usage » d'une fiche skill
// (/skills/[slug], section « Ton retour d'usage »).
// Composant CLIENT (useActionState, React 19) : contexte d'usage +
// résultat obtenu (obligatoires, 20 à 2000 caractères) + note
// facultative 1 à 5. L'action serveur envoyerRetourSkill applique le
// verrou Premium et la règle « un seul retour par membre et par skill ».
//
// LOT 78 — la note en étoiles est désormais IDENTIQUE aux avis des
// outils (components/avis/section-avis.tsx) : un état React, cliquer
// la n-ième étoile remplit TOUTES les étoiles de 1 à n. L'ancienne
// version CSS (« peer-checked » sur des radios) ne remplissait que
// l'étoile cliquée — les précédentes restaient vides. La note part
// dans l'action serveur via un champ caché name="note" ("" = pas de
// note → la valeur null est enregistrée, comme avant).
//
// NB (lot 44) : le même formulaire existe pour le dashboard sous le
// nom FormulaireRetourSkill (components/skills/formulaire-retour-skill.tsx),
// qui affiche aussi le retour déjà publié. Ne pas fusionner les deux
// fichiers : la fiche et le dashboard les importent sous deux noms.
// ─────────────────────────────────────────────────────────────────
"use client";

import { useActionState, useState } from "react";
import { MessageSquarePlus, Star } from "lucide-react";
import { envoyerRetourSkill, type EtatRetour } from "@/app/actions/skills-favoris";
import { Bouton } from "@/components/ui/bouton";

const ETAT_INITIAL: EtatRetour = { succes: false, message: "" };

/** Lot 78 — sélecteur d'étoiles, même mécanique que les avis outils :
 *  la note choisie est un état React et TOUTES les étoiles de 1 à n
 *  s'allument (fill ambre), pas seulement la dernière cliquée. */
function EtoilesNote({
  valeur,
  onChange,
}: {
  valeur: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
          aria-pressed={n <= valeur}
          className="transition hover:scale-110"
        >
          <Star
            className={
              n <= valeur
                ? "size-6 fill-amber-400 text-amber-400"
                : "size-6 text-encre/30"
            }
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}

export function FormulaireRetour({ skillId }: { skillId: string }) {
  const [etat, action, enAttente] = useActionState<EtatRetour, FormData>(
    envoyerRetourSkill,
    ETAT_INITIAL,
  );
  // Lot 78 — note choisie en étoiles (0 = aucune). 0 → champ caché
  // vide → l'action serveur enregistre bien « pas de note ».
  const [note, setNote] = useState(0);

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
        <div className="mt-1.5 flex items-center gap-2">
          <EtoilesNote valeur={note} onChange={setNote} />
          {/* Lot 78 — la note choisie accompagne l'action serveur ;
              vide (= 0) si le membre ne note pas, comme avant. */}
          <input type="hidden" name="note" value={note || ""} />
          <span className="text-[12px] leading-4 text-encre">1 = déçu · 5 = excellent</span>
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