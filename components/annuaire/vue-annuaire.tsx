// components/annuaire/vue-annuaire.tsx
// Lot 37 — vue générique des vitrines de l'annuaire (/gratuits, /agents,
// /open-source) avec PAGINATION sous la grille, comme sur /tutoriels.
// · listerOutils renvoyait déjà { page, pages } (12 outils par page) mais
//   la vue les ignorait : seules les 12 premières fiches s'affichaient,
//   sans aucun moyen d'accéder aux suivantes.
// · La page appelle VueAnnuaire avec `base` (ex. "/gratuits") : les liens
//   de pagination pointent vers /gratuits?page=2, etc., et conservent le
//   reste des paramètres GET via le composant commun Pagination (lot 13).
// · Charte inchangée : même grille, même carte, mêmes espacements — la
//   pagination utilise le composant commun déjà présent sur le site.
import Link from "next/link";
import { CarteOutilView } from "@/components/outil/carte-outil";
import { IconeCategorie } from "@/components/commun/icone-categorie";
import { Pagination } from "@/components/commun/pagination";
import { listerOutils } from "@/lib/queries";

export async function VueAnnuaire({ titre, sousTitre, filtres, icone, base }: {
  titre: string; sousTitre: string;
  filtres: Parameters<typeof listerOutils>[0];
  icone?: string | null;
  base: string; // base des liens de pagination (ex. "/gratuits")
}) {
  const { outils, total, page, pages } = await listerOutils(filtres);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:py-14">
      <div className="flex items-center gap-4">
        {icone && <IconeCategorie nom={icone} className="size-10 shrink-0 text-sky-500" />}
        <div>
          <h1 className="text-[30px] leading-9 font-semibold sm:text-h2">{titre}</h1>
          <p className="mesure mt-2 text-encre">{total > 0 ? `${total} ${sousTitre}` : sousTitre}</p>
        </div>
      </div>
      {outils.length ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {outils.map((o) => <CarteOutilView key={o.id} outil={o} />)}
          </div>
          {/* ── Pagination (Lot 37) — même composant que /tutoriels ── */}
          <Pagination page={page} pages={pages} base={base} params={{}} />
        </>
      ) : (
        <div className="mt-10 rounded-carte border border-bordure bg-white p-10 text-center shadow-carte">
          <p className="text-encre">Rien ici pour l&apos;instant.</p>
            <Link href="/proposer" className="mt-2 inline-block font-semibold text-sky-500 hover:underline">Proposer un outil</Link>
        </div>
      )}
    </div>
  );
}