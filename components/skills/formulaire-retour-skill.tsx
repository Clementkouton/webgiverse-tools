// components/skills/formulaire-retour-skill.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 40 — formulaire de RETOUR D'USAGE sur une skill testée :
//   · note de 1 à 5 étoiles (boutons, accessible au clavier)
//   · « Contexte d'usage » : dans quelle situation la skill a servi
//   · « Résultat obtenu » : ce que ça a donné concrètement
//   · « Je recommande cette skill » : oui / non
// Composant CLIENT : il appelle l'action serveur enregistrerRetourSkill
// (upsert : un seul retour par membre et par skill, modifiable) puis
// router.refresh() pour que les données serveur se remettent à jour.
//
// Utilisé à deux endroits : la fiche /skills/[slug] et la page
// « Mes skills » du dashboard (variante="dashboard" : rendu compact).
// Base non à jour → instruction claire « npx prisma db push ».
// ─────────────────────────────────────────────────────────────────
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, PenLine, Star, Trash2, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  enregistrerRetourSkill,
  supprimerRetourSkill,
  type RaisonSkills,
} from "@/app/actions/skills-favoris";

export type ValeursRetour = {
  usage: string;
  resultat: string;
  note: number;
  recommande: boolean;
};

type Props = {
  skillId: string;
  /** Valeurs déjà enregistrées (mode modification) ou null. */
  retourInitial: ValeursRetour | null;
  /** "fiche" : panneau complet · "dashboard" : rendu compact. */
  variante?: "fiche" | "dashboard";
};

const LIBELLE_NOTE = ["", "Décevante", "Moyenne", "Correcte", "Très utile", "Excellente"];

export function FormulaireRetourSkill({ skillId, retourInitial, variante = "fiche" }: Props) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [note, setNote] = useState(retourInitial?.note ?? 5);
  const [usage, setUsage] = useState(retourInitial?.usage ?? "");
  const [resultat, setResultat] = useState(retourInitial?.resultat ?? "");
  const [recommande, setRecommande] = useState(retourInitial?.recommande ?? true);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ type: "succes" | "erreur" | "base"; texte: string } | null>(null);

  const modifie =
    usage !== (retourInitial?.usage ?? "") ||
    resultat !== (retourInitial?.resultat ?? "") ||
    note !== (retourInitial?.note ?? 5) ||
    recommande !== (retourInitial?.recommande ?? true);

  async function envoyer() {
    if (enCours) return;
    setEnCours(true);
    setMessage(null);
    try {
      const donnees = new FormData();
      donnees.set("skillId", skillId);
      donnees.set("usage", usage);
      donnees.set("resultat", resultat);
      donnees.set("note", String(note));
      donnees.set("recommande", recommande ? "oui" : "non");
      const resultatAction = await enregistrerRetourSkill(donnees);
      if (resultatAction.ok) {
        setMessage({ type: "succes", texte: "Ton retour est enregistré. Merci pour ce partage !" });
        setOuvert(false);
        router.refresh();
      } else if (resultatAction.raison === "invalide") {
        setMessage({ type: "erreur", texte: resultatAction.message ?? "Vérifie les champs : 10 caractères minimum par zone de texte." });
      } else if (resultatAction.raison === "base") {
        setMessage({ type: "base", texte: "Fonctionnalité pas encore activée sur la base : lance npx prisma db push puis recharge la page." });
      } else {
        setMessage({ type: "erreur", texte: "Enregistrement impossible pour le moment — réessaie dans un instant." });
      }
    } catch (erreur) {
      console.error("Enregistrement du retour impossible :", erreur);
      setMessage({ type: "erreur", texte: "Enregistrement impossible pour le moment — réessaie dans un instant." });
    } finally {
      setEnCours(false);
    }
  }

  async function supprimer() {
    if (enCours) return;
    if (!confirm("Supprimer ton retour d'usage sur cette skill ?")) return;
    setEnCours(true);
    setMessage(null);
    try {
      const donnees = new FormData();
      donnees.set("skillId", skillId);
      const resultatAction = await supprimerRetourSkill(donnees);
      if (resultatAction.ok) {
        setUsage("");
        setResultat("");
        setNote(5);
        setRecommande(true);
        setOuvert(false);
        setMessage({ type: "succes", texte: "Ton retour a été supprimé." });
        router.refresh();
      } else {
        setMessage({ type: "erreur", texte: "Suppression impossible pour le moment — réessaie dans un instant." });
      }
    } catch (erreur) {
      console.error("Suppression du retour impossible :", erreur);
      setMessage({ type: "erreur", texte: "Suppression impossible pour le moment — réessaie dans un instant." });
    } finally {
      setEnCours(false);
    }
  }

  /* ── Bouton d'ouverture (fermé par défaut) ───────────────────── */
  if (!ouvert) {
    return (
      <div className={cn("inline-flex flex-col items-start gap-1.5", variante === "dashboard" && "w-full")}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOuvert(true)}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-[12px] leading-4 font-semibold transition active:scale-95",
              retourInitial
                ? "border-violet bg-violet/10 text-violet hover:border-violet"
                : "border-bordure bg-white text-bleu hover:border-violet hover:text-violet",
            )}
          >
            <PenLine className="size-3.5" aria-hidden />
            {retourInitial ? "Modifier mon retour" : "Donner mon retour"}
          </button>
          {retourInitial && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gris px-2.5 py-0.5 text-[11px] leading-4 font-semibold text-bleu">
              <Check className="size-3" aria-hidden /> Retour enregistré
            </span>
          )}
        </div>
        {message && <Message message={message} />}
      </div>
    );
  }

  /* ── Formulaire déplié ───────────────────────────────────────── */
  return (
    <div
      className={cn(
        "w-full rounded-carte border border-bordure bg-white p-4 shadow-carte",
        variante === "dashboard" ? "mt-2" : "mt-3",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-titre text-[14px] leading-5 font-semibold text-bleu">
          {retourInitial ? "Modifier mon retour d'usage" : "Ton retour d'usage"}
        </p>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          aria-label="Replier le formulaire"
          className="grid size-8 place-items-center rounded-full text-encre transition hover:bg-gris active:scale-95"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      {/* Note en étoiles */}
      <fieldset className="mt-3">
        <legend className="text-[12.5px] leading-4 font-semibold text-encre">Ta note</legend>
        <div className="mt-1.5 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((valeur) => (
            <button
              key={valeur}
              type="button"
              onClick={() => setNote(valeur)}
              aria-label={`${valeur} sur 5 — ${LIBELLE_NOTE[valeur]}`}
              aria-pressed={note === valeur}
              className="grid size-9 place-items-center rounded-full transition hover:bg-gris active:scale-90"
            >
              <Star
                className={cn("size-5", valeur <= note ? "fill-amber-400 text-amber-400" : "text-encre/30")}
                aria-hidden
              />
            </button>
          ))}
          <span className="ml-1 text-[12px] leading-4 font-semibold text-violet">{LIBELLE_NOTE[note]}</span>
        </div>
      </fieldset>

      {/* Contexte d'usage */}
      <div className="mt-3">
        <label htmlFor={`usage-${skillId}`} className="text-[12.5px] leading-4 font-semibold text-encre">
          Contexte d&apos;usage — dans quelle situation cette skill t&apos;a servi
        </label>
        <textarea
          id={`usage-${skillId}`}
          value={usage}
          onChange={(e) => setUsage(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Ex. : rédaction de comptes rendus de réunion pour mes clients, 3 à 4 fois par semaine…"
          className="mt-1.5 w-full rounded-champ border border-bordure bg-white px-3.5 py-2.5 text-[13.5px] leading-6 text-bleu placeholder:text-encre/50 focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet"
        />
      </div>

      {/* Résultat obtenu */}
      <div className="mt-3">
        <label htmlFor={`resultat-${skillId}`} className="text-[12.5px] leading-4 font-semibold text-encre">
          Résultat obtenu — ce que ça a donné concrètement
        </label>
        <textarea
          id={`resultat-${skillId}`}
          value={resultat}
          onChange={(e) => setResultat(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Ex. : comptes rendus prêts en 5 minutes au lieu de 45, structure plus claire, quelques relectures nécessaires…"
          className="mt-1.5 w-full rounded-champ border border-bordure bg-white px-3.5 py-2.5 text-[13.5px] leading-6 text-bleu placeholder:text-encre/50 focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet"
        />
        <p className="mt-1 text-[11px] leading-4 text-encre/60">10 caractères minimum · 2 000 maximum</p>
      </div>

      {/* Recommandation */}
      <fieldset className="mt-3">
        <legend className="text-[12.5px] leading-4 font-semibold text-encre">Recommandes-tu cette skill ?</legend>
        <div className="mt-1.5 flex gap-2">
          <button
            type="button"
            onClick={() => setRecommande(true)}
            aria-pressed={recommande}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] leading-4 font-semibold transition",
              recommande
                ? "border-violet bg-violet/10 text-violet"
                : "border-bordure bg-white text-bleu hover:border-violet",
            )}
          >
            <Check className="size-3.5" aria-hidden /> Oui, je recommande
          </button>
          <button
            type="button"
            onClick={() => setRecommande(false)}
            aria-pressed={!recommande}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] leading-4 font-semibold transition",
              !recommande
                ? "border-violet bg-violet/10 text-violet"
                : "border-bordure bg-white text-bleu hover:border-violet",
            )}
          >
            <X className="size-3.5" aria-hidden /> Pas vraiment
          </button>
        </div>
      </fieldset>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={envoyer}
          disabled={enCours || !modifie}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] px-5 text-[13.5px] leading-5 font-semibold text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)] transition hover:opacity-90 disabled:opacity-50"
        >
          {enCours ? "Enregistrement…" : "Enregistrer mon retour"}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          disabled={enCours}
          className="inline-flex min-h-10 items-center rounded-full border border-bordure bg-white px-4 text-[13px] leading-5 font-semibold text-bleu transition hover:border-violet hover:text-violet"
        >
          Annuler
        </button>
        {retourInitial && (
          <button
            type="button"
            onClick={supprimer}
            disabled={enCours}
            className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-full border border-bordure bg-white px-3.5 text-[12.5px] leading-5 font-semibold text-encre transition hover:border-red-300 hover:text-red-500"
          >
            <Trash2 className="size-3.5" aria-hidden /> Supprimer
          </button>
        )}
      </div>

      {message && (
        <div className="mt-3">
          <Message message={message} />
        </div>
      )}
    </div>
  );
}

/** Message contextuel rendu sous le bouton ou le formulaire. */
function Message({ message }: { message: { type: "succes" | "erreur" | "base"; texte: string } }) {
  return (
    <span
      aria-live="polite"
      className={cn(
        "flex max-w-96 items-start gap-1.5 rounded-carte border p-2 text-[11.5px] leading-4 text-encre shadow-carte",
        message.type === "succes" && "border-turquoise bg-white",
        message.type === "base" && "border-amber-300 bg-amber-50",
        message.type === "erreur" && "border-bordure bg-white",
      )}
    >
      {message.type === "succes" && <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden />}
      {message.type === "base" && <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />}
      {message.type === "erreur" && <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />}
      <span>{message.texte}</span>
    </span>
  );
}