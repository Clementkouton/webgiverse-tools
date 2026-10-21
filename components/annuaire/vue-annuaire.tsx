import Link from "next/link";
import { CarteOutilView } from "@/components/outil/carte-outil";
import { IconeCategorie } from "@/components/commun/icone-categorie";
import { listerOutils } from "@/lib/queries";

export async function VueAnnuaire({ titre, sousTitre, filtres, icone }: {
  titre: string; sousTitre: string;
  filtres: Parameters<typeof listerOutils>[0];
  icone?: string | null;
}) {
  const { outils, total } = await listerOutils(filtres);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:py-14">
      <div className="flex items-center gap-4">
        {icone && <IconeCategorie nom={icone} className="size-10 shrink-0 text-violet" />}
        <div>
          <h1 className="text-[30px] leading-9 font-semibold sm:text-h2">{titre}</h1>
          <p className="mesure mt-2 text-encre">{total > 0 ? `${total} ${sousTitre}` : sousTitre}</p>
        </div>
      </div>
      {outils.length ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {outils.map((o) => <CarteOutilView key={o.id} outil={o} />)}
        </div>
      ) : (
        <div className="mt-10 rounded-carte border border-bordure bg-white p-10 text-center shadow-carte">
          <p className="text-encre">Rien ici pour l'instant.</p>
          <Link href="/proposer" className="mt-2 inline-block font-semibold text-violet hover:underline">Proposer un outil</Link>
        </div>
      )}
    </div>
  );
}