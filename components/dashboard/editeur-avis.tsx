// components/dashboard/editeur-avis.tsx
"use client";

// Carte « Mon avis » : affichage + modification inline + suppression.
// - Vue : étoiles, texte de l'avis, boutons Modifier / Supprimer
// - Édition : sélecteur d'étoiles + zone de texte + message de statut
import { useActionState, useEffect, useState } from "react";
import { Pencil, Star, Trash2 } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { ZoneTexte } from "@/components/ui/champ";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import { majAvisAction, supprimerAvisFormulaire } from "@/app/actions/avis";

function Etoiles({ note, taille }: { note: number; taille: "sm" | "md" }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`Note : ${note} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={`${taille === "sm" ? "size-4" : "size-5"} ${
            n <= note ? "fill-amber-400 text-amber-400" : "text-bordure"
          }`}
        />
      ))}
    </div>
  );
}

export function EditeurAvis({
  avisId,
  noteInitiale,
  contenuInitial,
}: {
  avisId: string;
  noteInitiale: number;
  contenuInitial: string;
}) {
  const [edition, setEdition] = useState(false);
  const [note, setNote] = useState(noteInitiale);
  const [etat, action, enAttente] = useActionState<{ succes: boolean; message: string }, FormData>(
    majAvisAction,
    { succes: false, message: "" },
  );

  // Après un enregistrement réussi, on referme le mode édition.
  useEffect(() => {
    if (etat.succes) setEdition(false);
  }, [etat]);

  if (edition) {
    return (
      <form action={action} className="grid gap-3">
        <input type="hidden" name="avisId" value={avisId} />
        <input type="hidden" name="note" value={note} />

        <div role="radiogroup" aria-label="Ta note" className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={note === n}
              aria-label={`${n} sur 5`}
              onClick={() => setNote(n)}
              className="rounded-full p-1 transition hover:bg-gris"
            >
              <Star
                aria-hidden
                className={`size-5 ${n <= note ? "fill-amber-400 text-amber-400" : "text-bordure"}`}
              />
            </button>
          ))}
        </div>

        <ZoneTexte
          name="contenu"
          rows={4}
          defaultValue={contenuInitial}
          required
          minLength={10}
          maxLength={2000}
          aria-label="Ton avis"
        />

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

        <div className="flex flex-wrap gap-2">
          <Bouton type="submit" taille="sm" disabled={enAttente}>
            {enAttente ? "Enregistrement…" : "Enregistrer"}
          </Bouton>
          <Bouton
            type="button"
            variante="fantome"
            taille="sm"
            onClick={() => {
              setEdition(false);
              setNote(noteInitiale);
            }}
          >
            Annuler
          </Bouton>
        </div>
      </form>
    );
  }

  return (
    <div>
      <Etoiles note={noteInitiale} taille="sm" />
      <p className="mesure mt-2 text-[15px] leading-6 whitespace-pre-wrap text-encre">
        {contenuInitial}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Bouton
          variante="fantome"
          taille="sm"
          onClick={() => {
            setNote(noteInitiale);
            setEdition(true);
          }}
        >
          <Pencil aria-hidden /> Modifier
        </Bouton>
        <form action={supprimerAvisFormulaire}>
          <input type="hidden" name="avisId" value={avisId} />
          <BoutonConfirmer
            type="submit"
            message="Supprimer cet avis définitivement ?"
            aria-label="Supprimer mon avis"
            className="inline-flex min-h-11 items-center gap-2 px-4 text-[14px] leading-5 font-semibold text-red-600 transition hover:bg-red-50"
          >
            <Trash2 aria-hidden /> Supprimer
          </BoutonConfirmer>
        </form>
      </div>
    </div>
  );
}