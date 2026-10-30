// components/tutoriels/carte-tuto.tsx
// Carte d'un tutoriel vidéo — même vocabulaire visuel que les cartes
// de l'annuaire (rounded-carte, bordure, shadow-carte, hover violet),
// miniature 16:9 avec badge de durée, badge « Nouveau », niveau coloré,
// tags # et compteur de vues. Utilisée par /tutoriels et le bloc
// « À suivre ensuite » de la page de détail.
import Link from "next/link";
import { Eye, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formaterDuree, urlMiniature, NIVEAUX } from "@/lib/tutos-utils";
import type { Tuto } from "@prisma/client";

export function CarteTuto({ tuto }: { tuto: Tuto }) {
  const mini = urlMiniature(tuto);
  const niveau = NIVEAUX[tuto.niveau];

  return (
    <Link
      href={`/tutoriels/${tuto.slug}`}
      className="group survol-eleve flex flex-col overflow-hidden rounded-carte border border-bordure bg-white shadow-carte transition hover:border-violet"
    >
      {/* ── Miniature 16:9 ─────────────────────────────────────── */}
      <span className="relative block aspect-video w-full overflow-hidden bg-bleu">
        {mini ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mini}
            alt=""
            loading="lazy"
            className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          // Pas encore d'ID YouTube : placeholder au dégradé de marque.
          <span className="grid size-full place-items-center bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)]">
            <Play className="size-10 text-white" aria-hidden />
          </span>
        )}
        <span className="absolute right-2 bottom-2 rounded-md bg-black/75 px-2 py-0.5 text-[12px] leading-4 font-semibold text-white">
          {formaterDuree(tuto.dureeMin)}
        </span>
        {tuto.nouveau && (
          <Badge variante="nouveau" className="absolute top-2 left-2">
            Nouveau
          </Badge>
        )}
      </span>

      {/* ── Contenu ────────────────────────────────────────────── */}
      <span className="flex flex-1 flex-col p-4">
        <span>
          <Badge variante={niveau.variante}>{niveau.libelle}</Badge>
        </span>
        <h3 className="mt-2 line-clamp-2 font-titre text-[15px] leading-6 font-semibold text-bleu transition group-hover:text-violet">
          {tuto.titre}
        </h3>
        <span className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
          {tuto.outils.slice(0, 3).map((o) => (
            <span key={o} className="text-[12px] leading-4 font-medium text-violet">
              #{o}
            </span>
          ))}
        </span>
        <span className="mt-auto flex items-center gap-1.5 pt-3 text-[12px] leading-4 text-encre">
          <Eye className="size-3.5" aria-hidden />
          {tuto.vues.toLocaleString("fr-FR")} vues
        </span>
      </span>
    </Link>
  );
}