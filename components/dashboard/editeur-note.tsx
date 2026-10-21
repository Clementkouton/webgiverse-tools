// components/dashboard/editeur-note.tsx
"use client";
import { useState } from "react";
import { ZoneTexte } from "@/components/ui/champ";
import { Bouton } from "@/components/ui/bouton";
import { majNote } from "@/app/actions/favoris";

export function EditeurNote({ favoriId, note }: { favoriId: string; note: string | null }) {
  const [texte, setTexte] = useState(note ?? "");
  const [enregistre, setEnregistre] = useState(false);
  return (
    <div className="grid gap-2">
      <ZoneTexte rows={3} value={texte} onChange={(e) => setTexte(e.target.value)}
        placeholder="Note personnelle : ce que je teste, ce que j'en pense…"
        aria-label="Note personnelle sur l'outil" />
      <Bouton variante="fantome" taille="sm" className="self-start"
        onClick={async () => { await majNote(favoriId, texte); setEnregistre(true); setTimeout(() => setEnregistre(false), 2000); }}>
        {enregistre ? "Note enregistrée" : "Enregistrer la note"}
      </Bouton>
    </div>
  );
}