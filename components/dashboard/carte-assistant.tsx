// components/dashboard/carte-assistant.tsx
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export function CarteAssistant() {
  return (
    <Link
      href="/assistant"
      className="group relative block overflow-hidden rounded-2xl bg-linear-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-lg transition hover:shadow-xl"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl transition group-hover:bg-white/20"
      />
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/80">
            <Sparkles className="h-4 w-4" />
            Nouveau
          </p>
          <h3 className="mt-1 text-xl font-bold">
            Besoin d'un outil IA ? Demandez à l'assistant
          </h3>
          <p className="mt-1 text-sm text-white/80">
            Décrivez votre besoin en une phrase, il vous recommande les bons outils.
          </p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 transition group-hover:translate-x-1 group-hover:bg-white/25">
          <ArrowRight className="h-5 w-5" />
        </span>
      </div>
    </Link>
  );
}