// components/comparer/comparateur.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { Bouton } from "@/components/ui/bouton";
import { LogoOutil } from "@/components/commun/logo-outil";
import type { CarteOutil } from "@/lib/queries";

type Suggestion = { slug: string; nom: string };

export function Comparateur({ outils }: { outils: (CarteOutil & { langues?: string[]; niveau?: string; objectifs?: string[] })[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    const minuteur = setTimeout(async () => {
      const r = await fetch(`/api/recherche?q=${encodeURIComponent(q)}`);
      setSuggestions(await r.json());
    }, 250);
    return () => clearTimeout(minuteur);
  }, [q]);

  function ajouter(slug: string) {
    const slugs = [...new Set([...outils.map((o) => o.slug), slug])].slice(0, 3);
    setQ(""); setSuggestions([]);
    router.push(`/comparer?outils=${slugs.join(",")}`);
  }
  function retirer(slug: string) {
    router.push(`/comparer?outils=${outils.filter((o) => o.slug !== slug).map((o) => o.slug).join(",")}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
      <h1 className="text-[30px] leading-9 font-semibold sm:text-h2">Comparer des outils</h1>
      <p className="mesure mt-2 text-encre">Ajoute deux ou trois outils pour les voir côte à côte.</p>

      {outils.length < 3 && (
        <div className="mt-6 max-w-md">
          <label htmlFor="ajout-outil" className="mb-1.5 block text-[14px] leading-5 font-medium">Ajouter un outil</label>
          <input id="ajout-outil" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…"
            className="min-h-11 w-full rounded-champ border border-bordure bg-white px-4 focus:border-violet focus:outline-none" />
          {suggestions.length > 0 && (
            <ul className="mt-2 overflow-hidden rounded-carte border border-bordure bg-white shadow-carte">
              {suggestions.map((s) => (
                <li key={s.slug}>
                  <button type="button" onClick={() => ajouter(s.slug)}
                    className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-[15px] leading-5 hover:bg-gris">
                    <Plus className="size-4 text-violet" aria-hidden /> {s.nom}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {outils.length === 0 ? (
        <Carte className="mt-10 p-10 text-center text-encre">Commence par ajouter deux outils à comparer.</Carte>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-0">
            <caption className="sr-only">Comparaison des outils sélectionnés</caption>
            <thead>
              <tr>
                <th scope="col" className="w-40" />
                {outils.map((o) => (
                  <th key={o.slug} scope="col" className="border-b border-bordure bg-white p-4 align-top">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/outil/${o.slug}`} className="flex items-center gap-3 text-left">
                        <LogoOutil nom={o.nom} logo={o.logo} />
                        <span className="font-titre text-[17px] leading-6 font-semibold hover:text-violet">{o.nom}</span>
                      </Link>
                      <button type="button" onClick={() => retirer(o.slug)} aria-label={`Retirer ${o.nom}`}
                        className="grid size-9 place-items-center rounded-full text-encre hover:text-red-600">
                        <X className="size-4" aria-hidden />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {o.gratuit && <Badge variante="gratuit">Gratuit</Badge>}
                      {o.openSource && <Badge variante="source">Open source</Badge>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[15px] leading-6">
              {([
                ["Tarif indicatif", (o: typeof outils[number]) => o.tarif],
                ["Type", (o: typeof outils[number]) => (o.type === "AGENT" ? "Agent IA" : "Outil")],
                ["Catégories", (o: typeof outils[number]) => o.categories.map((c) => c.nom).join(", ") || "—"],
                ["Lien officiel", (o: typeof outils[number]) => "Voir la fiche"],
              ] as const).map(([libelle, valeur]) => (
                <tr key={libelle}>
                  <th scope="row" className="border-b border-bordure bg-gris p-4 text-left font-medium">{libelle}</th>
                  {outils.map((o) => (
                    <td key={o.slug} className="border-b border-bordure bg-white p-4 text-encre">
                      {libelle === "Lien officiel" ? (
                        <Link href={`/outil/${o.slug}`} className="font-semibold text-violet hover:underline">Voir la fiche</Link>
                      ) : (
                        valeur(o)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Bouton variante="secondaire" className="mt-8" asChild>
        <Link href="/outils">Retour à l'annuaire</Link>
      </Bouton>
    </div>
  );
}