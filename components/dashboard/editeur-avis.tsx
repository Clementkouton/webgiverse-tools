// components/dashboard/editeur-note.tsx
"use client";

// ─────────────────────────────────────────────────────────────────
// Bloc « Ma note personnelle » de chaque favori (dashboard).
// Version améliorée :
// - Cadre avec titre + icône, la zone réagit au focus (bordure violette)
// - Bouton « Enregistrer la note » avec 3 états visuels :
//     1. repos      → bouton principal "Enregistrer la note"
//     2. enCours    → spinner "Enregistrement…" (bouton désactivé)
//     3. ok         → coche verte "Enregistrée" pendant 2,5 s
// - Le bouton est désactivé tant que la note n'a pas été modifiée
//   (impossible de cliquer "pour rien")
// - Raccourci clavier : Ctrl + Entrée (ou Cmd + Entrée sur Mac)
//   enregistre la note sans quitter le clavier
// ─────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { Check, Loader2, NotebookPen, Save } from "lucide-react";
import { ZoneTexte } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { majNote } from "@/app/actions/favoris";

export function EditeurNote({ favoriId, note }: { favoriId: string; note: string | null }) {
  const [texte, setTexte] = useState(note ?? "");
  const [etat, setEtat] = useState<"repos" | "enCours" | "ok">("repos");

  // La note a-t-elle vraiment changé depuis la dernière sauvegarde ?
  const modifie = texte !== (note ?? "");

  // Après un enregistrement réussi, on repasse en « repos » après 2,5 s.
  useEffect(() => {
    if (etat !== "ok") return;
    const minuteur = setTimeout(() => setEtat("repos"), 2500);
    return () => clearTimeout(minuteur);
  }, [etat]);

  async function enregistrer() {
    if (etat === "enCours" || !modifie) return;
    setEtat("enCours");
    try {
      const reponse = await majNote(favoriId, texte);
      setEtat(reponse?.ok ? "ok" : "repos");
    } catch {
      setEtat("repos");
    }
  }

  return (
    <div className="rounded-champ border border-bordure bg-gris/40 p-3 transition focus-within:border-violet">
      <p className="mb-2 flex items-center gap-1.5 text-[12px] leading-4 font-semibold uppercase tracking-wide text-encre">
        <NotebookPen className="size-3.5 text-violet" aria-hidden />
        Ma note personnelle
      </p>

      <ZoneTexte
        rows={3}
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            void enregistrer();
          }
        }}
        placeholder="Ce que je teste, ce que j'en pense, pour quel usage…"
        aria-label="Note personnelle sur l'outil"
        className="border-white bg-white focus:border-violet"
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="min-h-4 text-[12px] leading-4 text-encre">
          {etat === "ok" && (
            <span className="inline-flex items-center gap-1 font-medium text-green-700">
              <Check className="size-3.5" aria-hidden /> Note enregistrée
            </span>
          )}
          {etat === "enCours" && (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-3.5 animate-spin" aria-hidden /> Enregistrement…
            </span>
          )}
          {etat === "repos" && modifie && "Pense à enregistrer tes changements"}
        </p>

        <Bouton
          variante={etat === "ok" ? "secondaire" : "primaire"}
          taille="sm"
          disabled={!modifie || etat === "enCours"}
          onClick={enregistrer}
          className="min-h-9 px-3 text-[13px]"
        >
          {etat === "enCours" ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : etat === "ok" ? (
            <Check aria-hidden />
          ) : (
            <Save aria-hidden />
          )}
          {etat === "enCours" ? "Enregistrement…" : etat === "ok" ? "Enregistrée" : "Enregistrer la note"}
        </Bouton>
      </div>
    </div>
  );
}