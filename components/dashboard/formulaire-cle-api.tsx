"use client";

// components/dashboard/formulaire-cle-api.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 57 — idée 21 : formulaire de création d'une clé d'API.
// Composant CLIENT (useActionState, même patron que le formulaire
// de contact du projet) : l'action serveur renvoie l'état et la clé
// complète s'affiche UNE SEULE FOIS ici, dans l'état du composant —
// elle ne transite jamais par l'URL ni par un message serveur.
// ─────────────────────────────────────────────────────────────────
import { useActionState, useState } from "react";
import { Check, Copy, KeyRound, Loader2 } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { creerCleFormulaire, type EtatCle } from "@/app/actions/cles-api";

const MESSAGE_ERREURS: Record<string, string> = {
  connexion: "Ta session a expiré — recharge la page puis reconnecte-toi.",
  "nom-invalide": "Donne un nom à ta clé (par ex. « Script veille », 50 caractères max).",
  "non-autorise": "Les clés d'API sont réservées au plan Entreprise.",
  limite:
    "Tu as déjà 5 clés actives : révoque-en une dans la liste ci-dessous avant d'en créer une nouvelle.",
  base: "La base n'est pas à jour : la table CleApi doit d'abord être créée (migration du lot 58, voir le LISEZ-MOI).",
};

const STYLE_CHAMP =
  "min-h-11 w-full rounded-champ border border-bordure bg-white px-3 text-[15px] leading-5 focus:border-sky-500 focus:outline-none";

export default function FormulaireCleApi() {
  const [etat, action, enCours] = useActionState<EtatCle, FormData>(
    creerCleFormulaire,
    null
  );
  const [copie, setCopie] = useState(false);

  return (
    <div>
      <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="nom-cle"
            className="mb-1 block text-[13px] leading-4 font-semibold text-encre"
          >
            Nom de la clé (pour t&apos;y retrouver)
          </label>
          <input
            id="nom-cle"
            name="nom"
            type="text"
            required
            maxLength={50}
            placeholder="Script veille, tableau client…"
            className={STYLE_CHAMP}
          />
        </div>
        <Bouton type="submit" disabled={enCours}>
          {enCours ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <KeyRound className="size-4" aria-hidden />
          )}
          Créer la clé
        </Bouton>
      </form>

      {etat && etat.ok && (
        <div className="mt-4 rounded-champ border border-emerald-300 bg-emerald-50 p-4">
          <p className="text-[14px] leading-5 font-semibold text-emerald-900">
            Clé « {etat.nom} » créée — copie-la MAINTENANT
          </p>
          <p className="mt-1 text-[13px] leading-5 text-emerald-800">
            Pour ta sécurité, la clé complète n&apos;est conservée nulle part : elle
            ne sera plus jamais affichée. Seul son préfixe reste visible dans la
            liste des clés.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 font-mono text-[13px] text-encre">
              {etat.cle}
            </code>
            <Bouton
              type="button"
              variante="secondaire"
              taille="sm"
              onClick={() => {
                navigator.clipboard?.writeText(etat.cle);
                setCopie(true);
              }}
            >
              {copie ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
              {copie ? "Copié" : "Copier"}
            </Bouton>
          </div>
        </div>
      )}

      {etat && !etat.ok && (
        <p className="mt-4 rounded-champ border border-red-300 bg-red-50 p-4 text-[14px] leading-5 text-red-700">
          {MESSAGE_ERREURS[etat.erreur] ??
            "Une erreur inattendue s'est produite — réessaie dans un instant."}
        </p>
      )}
    </div>
  );
}