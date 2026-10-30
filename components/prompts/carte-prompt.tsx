// components/prompts/carte-prompt.tsx
// Lot 17 — carte d'un prompt de la bibliothèque. Même vocabulaire
// visuel que les cartes Tutoriels et Outils (rounded-carte, bordure,
// shadow-carte, hover violet) : emoji, titre, description, badges
// catégorie / type, tags de rôles et compteur de vues. La carte reste
// cliquable par tous : le contenu complet est verrouillé sur la page
// détail pour les non-abonnés.
import Link from "next/link";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LIBELLES_TYPE } from "@/lib/prompts-utils";

export type CartePromptData = {
  slug: string;
  titre: string;
  emoji: string;
  description: string;
  type: "TEXTE" | "IMAGE" | "CODE";
  vues: number;
  nouveau: boolean;
  categorie: { nom: string; slug: string } | null;
};

export function CartePrompt({ prompt }: { prompt: CartePromptData }) {
  return (
    <Link
      href={`/prompts/${prompt.slug}`}
      className="group survol-eleve flex flex-col overflow-hidden rounded-carte border border-bordure bg-white shadow-carte transition hover:border-violet"
    >
      <span className="flex flex-1 flex-col p-4">
        <span className="flex items-center justify-between gap-2">
          <Badge variante="source">{prompt.categorie?.nom ?? "Prompt"}</Badge>
          {prompt.nouveau && <Badge variante="nouveau">Nouveau</Badge>}
        </span>
        <span className="mt-3 flex items-start gap-2.5">
          <span aria-hidden className="text-[22px] leading-7">
            {prompt.emoji}
          </span>
          <h3 className="line-clamp-2 font-titre text-[15px] leading-6 font-semibold text-bleu transition group-hover:text-violet">
            {prompt.titre}
          </h3>
        </span>
        <span className="mt-2 line-clamp-3 text-[13px] leading-5 text-encre">
          {prompt.description}
        </span>
        <span className="mt-auto flex items-center gap-2 pt-3 text-[12px] leading-4 text-encre">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-bordure bg-gris px-2.5 py-0.5 font-medium text-bleu">
            {LIBELLES_TYPE[prompt.type] ?? "Texte"}
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            <Eye className="size-3.5" aria-hidden />
            {prompt.vues.toLocaleString("fr-FR")}
          </span>
        </span>
      </span>
    </Link>
  );
}