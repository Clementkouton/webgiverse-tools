// components/dashboard/parrainage-client.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Rattachement tardif d'un parrain : le membre entre un code
// (cas d'une inscription passée sans le lien d'invitation).
// ─────────────────────────────────────────────────────────────────
"use client";

import { useActionState } from "react";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { rattacherParrainAction, type EtatParrainage } from "@/app/actions/parrainages";

export function FormulaireRattachement() {
  const [etat, action, enCours] = useActionState<EtatParrainage, FormData>(
    rattacherParrainAction,
    null
  );

  return (
    <Carte className="mt-4 p-5">
      <h2 className="font-titre text-[16px] font-semibold">Tu as un code de parrainage ?</h2>
      <p className="mt-1 text-[13px] leading-5 text-encre">
        Inscrit(e) sans utiliser le lien d&apos;un ami ? Entre son code ici pour le créditer de
        ton inscription (fonctionne une seule fois).
      </p>
      <form action={action} className="mt-3 flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-[13px] font-semibold text-bleu">
          Code du parrain
          <input
            name="code"
            required
            minLength={3}
            maxLength={20}
            placeholder="WG-XXXXXXXX"
            className="min-h-11 w-48 rounded-champ border border-bordure bg-white px-3 font-mono uppercase text-[15px] text-bleu outline-none focus:border-violet"
          />
        </label>
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Vérification…" : "Rattacher mon compte"}
        </Bouton>
      </form>
      {etat && (
        <p
          role="status"
          className={`mt-3 rounded-champ border px-3 py-2 text-[13px] ${
            etat.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {etat.message}
        </p>
      )}
    </Carte>
  );
}
