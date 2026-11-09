// components/skills/formulaire-retour-skill.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 44 — Bloc retour d'usage d'une carte « Mes skills »
// (/dashboard/skills-favoris). Composant CLIENT :
//   · retourInitial absent  → formulaire de création (usage +
//     résultat obligatoires 20-2000 caractères, note facultative 1-5),
//     identique à celui de la fiche (FormulaireRetour) ;
//   · retourInitial présent → affichage lecture du retour publié
//     (usage, résultat, note en étoiles) + bouton « Supprimer »
//     (action supprimerRetourParSkillFormulaire, par skillId).
// L'action serveur applique le verrou Premium côté serveur.
// ─────────────────────────────────────────────────────────────────
"use client";

import { useActionState } from "react";
import { MessageSquarePlus, Star, Trash2 } from "lucide-react";
import {
  envoyerRetourSkill,
  supprimerRetourFormulaire,
  type EtatRetour,
} from "@/app/actions/skills-favoris";
import { Bouton } from "@/components/ui/bouton";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";

const ETAT_INITIAL: EtatRetour = { succes: false, message: "" };

export type RetourInitialSkill = {
  usage: string;
  resultat: string;
  note: number | null;
  recommande: boolean;
};

/** Note en étoiles (lecture seule) — 5 étoiles pleines si pas de note. */
function EtoilesLecture({ note }: { note: number | null }) {
  const valeur = typeof note === "number" && note >= 1 && note <= 5 ? note : null;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={valeur ? `${valeur} sur 5` : "Non notée"}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={
            valeur && n <= valeur
              ? "size-3.5 fill-amber-400 text-amber-400"
              : "size-3.5 text-encre/25"
          }
          aria-hidden
        />
      ))}
    </span>
  );
}

export function FormulaireRetourSkill({
  skillId,
  retourInitial,
  variante = "dashboard",
}: {
  skillId: string;
  /** Retour déjà publié par le membre sur cette skill (null → création). */
  retourInitial: RetourInitialSkill | null;
  /** « dashboard » : rendu compact dans la carte Mes skills. */
  variante?: "dashboard";
}) {
  const [etat, action, enAttente] = useActionState<EtatRetour, FormData>(
    envoyerRetourSkill,
    ETAT_INITIAL,
  );

  // ── Cas 1 : le membre a déjà publié son retour → lecture seule ──
  if (retourInitial) {
    return (
      <div className="grid gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] leading-4 font-bold uppercase tracking-wide text-encre">
            Ton retour d&apos;usage
          </p>
          <EtoilesLecture note={retourInitial.note} />
        </div>
        <div className="rounded-carte border border-bordure bg-[#f9faff] p-3">
          <p className="text-[10px] leading-3 font-bold uppercase tracking-wide text-encre">
            Usage
          </p>
          <p className="mt-1 line-clamp-3 text-[13px] leading-5 text-encre">
            {retourInitial.usage}
          </p>
        </div>
        <div className="rounded-carte border border-bordure bg-[#f9faff] p-3">
          <p className="text-[10px] leading-3 font-bold uppercase tracking-wide text-encre">
            Résultat obtenu
          </p>
          <p className="mt-1 line-clamp-3 text-[13px] leading-5 text-encre">
            {retourInitial.resultat}
          </p>
        </div>
        <form action={supprimerRetourFormulaire}>
          <input type="hidden" name="skillId" value={skillId} />
          <BoutonConfirmer
            message="Supprimer ton retour d'usage sur cette skill ?"
            aria-label="Supprimer mon retour d'usage"
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-bordure bg-white px-3 text-[11px] leading-4 font-semibold text-encre transition hover:border-red-300 hover:text-red-500 active:scale-95"
          >
            <Trash2 className="size-3" aria-hidden /> Supprimer mon retour
          </BoutonConfirmer>
        </form>
      </div>
    );
  }

  // ── Cas 2 : pas encore de retour → formulaire compact ───────────
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="skillId" value={skillId} />

      <p className="text-[12px] leading-4 text-encre">
        {variante === "dashboard"
          ? "Note le résultat obtenu : ton retour guide les autres abonnés."
          : "Testé cette skill ? Partage ton contexte d'usage et le résultat obtenu."}
      </p>

      <div>
        <label
          htmlFor={`retour-usage-${skillId}`}
          className="text-[12px] leading-4 font-semibold text-bleu"
        >
          Contexte d&apos;usage{" "}
          <span className="font-normal text-encre">(20 caractères minimum)</span>
        </label>
        <textarea
          id={`retour-usage-${skillId}`}
          name="usage"
          rows={2}
          required
          minLength={20}
          maxLength={2000}
          placeholder="Ex. : rédaction des comptes rendus de réunion de mon équipe…"
          className="mt-1 w-full resize-y rounded-carte border border-bordure bg-white p-2.5 text-[13px] leading-5 text-bleu placeholder:text-encre/50 focus:border-violet focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor={`retour-resultat-${skillId}`}
          className="text-[12px] leading-4 font-semibold text-bleu"
        >
          Résultat obtenu{" "}
          <span className="font-normal text-encre">(20 caractères minimum)</span>
        </label>
        <textarea
          id={`retour-resultat-${skillId}`}
          name="resultat"
          rows={2}
          required
          minLength={20}
          maxLength={2000}
          placeholder="Ex. : un compte rendu prêt à envoyer en 2 minutes au lieu de 15…"
          className="mt-1 w-full resize-y rounded-carte border border-bordure bg-white p-2.5 text-[13px] leading-5 text-bleu placeholder:text-encre/50 focus:border-violet focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-[12px] leading-4 font-semibold text-bleu">Note</span>
        {[1, 2, 3, 4, 5].map((valeur) => (
          <label key={valeur} className="cursor-pointer" title={`${valeur} sur 5`}>
            <input type="radio" name="note" value={valeur} className="peer sr-only" />
            <Star
              className="size-5 text-encre/30 transition peer-checked:fill-amber-400 peer-checked:text-amber-400 hover:fill-amber-200 hover:text-amber-300"
              aria-hidden
            />
            <span className="sr-only">{valeur} sur 5</span>
          </label>
        ))}
        <span className="ml-1 text-[11px] leading-4 text-encre">(facultative)</span>
      </div>

      {etat.message && (
        <p
          role="status"
          className={
            etat.succes
              ? "rounded-carte border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] leading-4 text-emerald-700"
              : "rounded-carte border border-red-200 bg-red-50 px-3 py-2 text-[12px] leading-4 text-red-600"
          }
        >
          {etat.message}
        </p>
      )}

      <div>
        <Bouton type="submit" taille="sm" disabled={enAttente}>
          <MessageSquarePlus aria-hidden />
          {enAttente ? "Envoi…" : "Publier mon retour"}
        </Bouton>
      </div>
    </form>
  );
}