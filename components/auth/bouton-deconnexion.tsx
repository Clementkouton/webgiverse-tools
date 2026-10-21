import { LogOut } from "lucide-react";
import { signOut } from "@/auth";

export function BoutonDeconnexion() {
  return (
    <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
      <button type="submit"
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-violet bg-white px-4 text-[14px] leading-5 font-semibold text-bleu transition hover:bg-gris">
        <LogOut className="size-4" aria-hidden /> Se déconnecter
      </button>
    </form>
  );
}