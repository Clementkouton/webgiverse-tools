// components/auth/bouton-deconnexion.tsx
// ─────────────────────────────────────────────────────────────────
// Bouton « Se déconnecter » du Dashboard et de la Console Admin.
// Utilise l'action serveur NOMMÉE deconnexionAction (plus robuste
// qu'une action en ligne) et occupe toute la largeur du menu,
// notamment dans le tiroir mobile.
// ─────────────────────────────────────────────────────────────────
import { LogOut } from "lucide-react";
import { deconnexionAction } from "@/app/actions/authentification";

export function BoutonDeconnexion() {
  return (
    <form action={deconnexionAction}>
      <button
        type="submit"
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-violet bg-white px-4 text-[14px] leading-5 font-semibold text-bleu transition hover:bg-gris active:scale-[0.98]"
      >
        <LogOut className="size-4" aria-hidden /> Se déconnecter
      </button>
    </form>
  );
}