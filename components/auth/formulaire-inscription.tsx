// components/auth/formulaire-inscription.tsx
"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Bouton } from "@/components/ui/bouton";
import { inscriptionAction, connexionGoogleAction } from "@/app/actions/authentification";

const STYLE_CHAMP =
  "min-h-11 w-full rounded-champ border border-bordure bg-white px-3 text-[15px] leading-5 focus:border-violet focus:outline-none";

export function FormulaireInscription({ suite = "/dashboard" }: { suite?: string }) {
  const [etat, action, enCours] = useActionState(inscriptionAction, null);

  return (
    <div className="grid gap-4">
      <form action={action} className="grid gap-3">
        <input type="hidden" name="suite" value={suite} />
        <div>
          <label htmlFor="in-nom" className="mb-1.5 block text-[14px] leading-5 font-medium">Nom complet</label>
          <input id="in-nom" name="nom" type="text" required minLength={2} autoComplete="name" className={STYLE_CHAMP} />
        </div>
        <div>
          <label htmlFor="in-email" className="mb-1.5 block text-[14px] leading-5 font-medium">E-mail</label>
          <input id="in-email" name="email" type="email" required autoComplete="email" className={STYLE_CHAMP} />
        </div>
        <div>
          <label htmlFor="in-mdp" className="mb-1.5 block text-[14px] leading-5 font-medium">Mot de passe (8 caractères minimum)</label>
          <input id="in-mdp" name="motDePasse" type="password" required minLength={8} autoComplete="new-password" className={STYLE_CHAMP} />
        </div>
        <div>
          <label htmlFor="in-confirm" className="mb-1.5 block text-[14px] leading-5 font-medium">Confirmer le mot de passe</label>
          <input id="in-confirm" name="confirmation" type="password" required minLength={8} autoComplete="new-password" className={STYLE_CHAMP} />
        </div>
        {etat?.erreur && (
          <p role="alert" className="rounded-champ border border-red-200 bg-red-50 p-3 text-[14px] text-red-700">{etat.erreur}</p>
        )}
        <Bouton type="submit" disabled={enCours}>{enCours ? "Création…" : "Créer mon compte"}</Bouton>
      </form>

      <div className="flex items-center gap-3 text-[13px] text-encre">
        <span className="h-px flex-1 bg-bordure" /> ou <span className="h-px flex-1 bg-bordure" />
      </div>

      <form action={connexionGoogleAction}>
        <input type="hidden" name="suite" value={suite} />
        <Bouton type="submit" variante="secondaire" className="w-full">S'inscrire avec Google</Bouton>
      </form>

      <p className="text-center text-[14px] text-encre">
        Déjà membre ?{" "}
        <Link href="/connexion" className="font-semibold text-violet hover:underline">Se connecter</Link>
      </p>
    </div>
  );
}