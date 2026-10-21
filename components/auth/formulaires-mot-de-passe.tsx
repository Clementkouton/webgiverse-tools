// components/auth/formulaires-mot-de-passe.tsx
"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Bouton } from "@/components/ui/bouton";
import {
  motDePasseOublieAction,
  reinitialisationAction,
  type EtatFormulaire,
} from "@/app/actions/authentification";

const STYLE_CHAMP =
  "min-h-11 w-full rounded-champ border border-bordure bg-white px-3 text-[15px] leading-5 focus:border-violet focus:outline-none";

export function FormulaireMotDePasseOublie() {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(motDePasseOublieAction, null);

  return (
    <form action={action} className="grid gap-3">
      <div>
        <label htmlFor="mo-email" className="mb-1.5 block text-[14px] leading-5 font-medium">Ton e-mail</label>
        <input id="mo-email" name="email" type="email" required autoComplete="email" className={STYLE_CHAMP} />
      </div>
      {etat?.erreur && (
        <p role="alert" className="rounded-champ border border-red-200 bg-red-50 p-3 text-[14px] text-red-700">{etat.erreur}</p>
      )}
      {etat?.succes && (
        <div className="rounded-champ border border-emerald-200 bg-emerald-50 p-4 text-[14px] leading-5 text-emerald-700">
          <p>✅ {etat.succes}</p>
          {etat.lien && (
            <p className="mt-2">
              🔗 Mode développement — ouvre ce lien :{" "}
              <Link href={etat.lien} className="font-semibold underline">Réinitialiser mon mot de passe</Link>
            </p>
          )}
        </div>
      )}
      <Bouton type="submit" disabled={enCours}>{enCours ? "Envoi…" : "Recevoir un lien de réinitialisation"}</Bouton>
      <p className="text-center text-[14px] text-encre">
        <Link href="/connexion" className="text-violet hover:underline">Retour à la connexion</Link>
      </p>
    </form>
  );
}

export function FormulaireReinitialisation({ token }: { token: string }) {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(reinitialisationAction, null);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="re-mdp" className="mb-1.5 block text-[14px] leading-5 font-medium">Nouveau mot de passe (8 caractères minimum)</label>
        <input id="re-mdp" name="motDePasse" type="password" required minLength={8} autoComplete="new-password" className={STYLE_CHAMP} />
      </div>
      <div>
        <label htmlFor="re-confirm" className="mb-1.5 block text-[14px] leading-5 font-medium">Confirmer le nouveau mot de passe</label>
        <input id="re-confirm" name="confirmation" type="password" required minLength={8} autoComplete="new-password" className={STYLE_CHAMP} />
      </div>
      {etat?.erreur && (
        <p role="alert" className="rounded-champ border border-red-200 bg-red-50 p-3 text-[14px] text-red-700">{etat.erreur}</p>
      )}
      <Bouton type="submit" disabled={enCours}>{enCours ? "Enregistrement…" : "Enregistrer le nouveau mot de passe"}</Bouton>
    </form>
  );
}