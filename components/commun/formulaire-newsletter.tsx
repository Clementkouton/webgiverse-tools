// components/commun/formulaire-newsletter.tsx
"use client";
import { useActionState } from "react";
import { Bouton } from "@/components/ui/bouton";
import { abonnerAction } from "@/app/actions/newsletter";

export function FormulaireNewsletter() {
  const [etat, action, enCours] = useActionState(abonnerAction, { ok: false, message: "" });
  return (
    <div>
      <form action={action} className="mx-auto flex w-full max-w-xl flex-col gap-3 sm:flex-row">
        <label htmlFor="email-newsletter" className="sr-only">Adresse e-mail</label>
        <input id="email-newsletter" name="email" type="email" required placeholder="ton@email.com"
          className="min-h-12 flex-1 rounded-full border border-bordure bg-white px-5 text-[16px] leading-6 focus:border-violet focus:outline-none" />
        <Bouton type="submit" disabled={enCours}>{enCours ? "Envoi…" : "S'abonner"}</Bouton>
      </form>
      {etat.message && (
        <p role="status" className={`mt-4 text-[14px] leading-5 ${etat.ok ? "text-[#00845c]" : "text-red-600"}`}>
          {etat.message}
        </p>
      )}
    </div>
  );
}