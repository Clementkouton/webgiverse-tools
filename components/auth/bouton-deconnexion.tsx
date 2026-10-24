// components/auth/bouton-deconnexion.tsx
// ─────────────────────────────────────────────────────────────────
// Boutons « Se déconnecter » du Dashboard et de la Console Admin.
//
// ⚠️ CORRECTIF « toujours connecté après déconnexion » :
// L'ancienne version appelait signOut() dans une ACTION SERVEUR.
// Avec next-auth v5 beta, cette voie ne supprime pas toujours le
// cookie de session : la redirection partait vers l'accueil mais le
// cookie restait actif (le header affichait encore « Mon espace »).
//
// Désormais : DÉCONNEXION CÔTÉ CLIENT avec signOut de next-auth/react.
//   1. Le navigateur récupère le jeton CSRF.
//   2. Il envoie un vrai POST vers /api/auth/signout.
//   3. Le serveur répond « Set-Cookie: session supprimée » → le
//      cookie est réellement effacé du navigateur.
//   4. window.location recharge TOUTE la page → le header refetch
//      la session et repasse sur « Connexion ». Aucun cache possible.
//
// Deux variantes exportées :
//   • BoutonDeconnexion      → bouton large (bas du menu latéral + tiroir)
//   • BoutonDeconnexionBarre → bouton rond icône (barre supérieure mobile)
// ─────────────────────────────────────────────────────────────────
"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Loader2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

/** Déconnexion réelle : POST /api/auth/signout + rechargement complet de la page. */
function deconnexion() {
  return signOut({ redirectTo: "/" });
}

/** Bouton large — bas du menu latéral (desktop) et du tiroir mobile. */
export function BoutonDeconnexion() {
  const [enCours, setEnCours] = useState(false);

  return (
    <button
      type="button"
      disabled={enCours}
      onClick={() => {
        setEnCours(true);
        deconnexion().catch(() => setEnCours(false));
      }}
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-violet bg-white px-4 text-[14px] leading-5 font-semibold text-bleu transition hover:bg-gris active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
    >
      {enCours ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden /> Déconnexion…
        </>
      ) : (
        <>
          <LogOut className="size-4" aria-hidden /> Se déconnecter
        </>
      )}
    </button>
  );
}

/** Bouton rond avec icône — barre supérieure mobile, en un tap.
 *  `sombre` : variante pour la barre foncée de la Console Admin. */
export function BoutonDeconnexionBarre({ sombre = false }: { sombre?: boolean }) {
  const [enCours, setEnCours] = useState(false);

  return (
    <button
      type="button"
      disabled={enCours}
      onClick={() => {
        setEnCours(true);
        deconnexion().catch(() => setEnCours(false));
      }}
      aria-label="Se déconnecter"
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full transition active:scale-95 disabled:cursor-wait disabled:opacity-60",
        sombre
          ? "border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-magenta"
          : "border border-bordure bg-white/70 text-bleu hover:bg-white hover:text-red-600"
      )}
    >
      {enCours ? (
        <Loader2 className="size-5 animate-spin" aria-hidden />
      ) : (
        <LogOut className="size-5" aria-hidden />
      )}
    </button>
  );
}