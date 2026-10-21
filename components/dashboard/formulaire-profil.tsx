// components/dashboard/formulaire-profil.tsx
"use client";

// Formulaire « Mon profil » du dashboard.
// Affiche un message de confirmation (vert) ou d'erreur (rouge)
// grâce à useActionState + l'action serveur majProfilAction.
import { useActionState } from "react";
import { Bouton } from "@/components/ui/bouton";
import { Champ } from "@/components/ui/champ";
import { majProfilAction } from "@/app/actions/profil";

const OBJECTIFS = ["Vendre", "Créer du contenu", "Automatiser", "Coder", "Communiquer", "Apprendre", "Gérer"];
const NIVEAUX = ["Débutant", "Intermédiaire", "Avancé"];
const BUDGETS = [
  { valeur: "gratuit", libelle: "Gratuit (0 €)" },
  { valeur: "petit", libelle: "Petit (≤ 20 €/mois)" },
  { valeur: "confort", libelle: "Confort (> 20 €/mois)" },
];

const STYLE_SELECT =
  "min-h-11 w-full rounded-champ border border-bordure bg-white px-3 text-[15px] leading-5 focus:border-violet focus:outline-none";

export function FormulaireProfil({
  nomInitial,
  objectifInitial,
  niveauInitial,
  budgetInitial,
}: {
  nomInitial: string;
  objectifInitial: string;
  niveauInitial: string;
  budgetInitial: string;
}) {
  const [etat, action, enAttente] = useActionState<{ succes: boolean; message: string }, FormData>(
    majProfilAction,
    { succes: false, message: "" },
  );

  return (
    <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <label htmlFor="p-nom" className="mb-1.5 block text-[14px] leading-5 font-medium">
          Ton nom
        </label>
        <Champ
          id="p-nom"
          name="nom"
          defaultValue={nomInitial}
          placeholder="Ton prénom ou pseudo"
          aria-label="Ton nom"
          maxLength={60}
        />
      </div>

      <div>
        <label htmlFor="p-objectif" className="mb-1.5 block text-[14px] leading-5 font-medium">
          Objectif
        </label>
        <select id="p-objectif" name="objectif" defaultValue={objectifInitial} className={STYLE_SELECT}>
          <option value="">—</option>
          {OBJECTIFS.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="p-niveau" className="mb-1.5 block text-[14px] leading-5 font-medium">
          Niveau
        </label>
        <select id="p-niveau" name="niveau" defaultValue={niveauInitial} className={STYLE_SELECT}>
          <option value="">—</option>
          {NIVEAUX.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="p-budget" className="mb-1.5 block text-[14px] leading-5 font-medium">
          Budget
        </label>
        <select id="p-budget" name="budget" defaultValue={budgetInitial} className={STYLE_SELECT}>
          <option value="">—</option>
          {BUDGETS.map((b) => (
            <option key={b.valeur} value={b.valeur}>
              {b.libelle}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Bouton type="submit" disabled={enAttente}>
          {enAttente ? "Enregistrement…" : "Enregistrer"}
        </Bouton>
        {etat.message && (
          <p
            aria-live="polite"
            className={
              etat.succes
                ? "text-[13px] leading-5 font-medium text-green-700"
                : "text-[13px] leading-5 font-medium text-red-600"
            }
          >
            {etat.message}
          </p>
        )}
      </div>
    </form>
  );
}