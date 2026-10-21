// app/favoris/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const LIBELLES: Record<string, string> = {
  A_TESTER: "À tester",
  EN_COURS: "En cours",
  ADOPTE: "Adopté",
};

const COULEURS: Record<string, string> = {
  A_TESTER: "bg-amber-100 text-amber-700",
  EN_COURS: "bg-blue-100 text-blue-700",
  ADOPTE: "bg-emerald-100 text-emerald-700",
};

export default function PageFavoris() {
  const [favoris, setFavoris] = useState<any[]>([]);
  const [connecte, setConnecte] = useState(true);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    fetch("/api/favoris/liste")
      .then((r) => r.json())
      .then((d) => {
        setConnecte(Boolean(d.connecte));
        setFavoris(d.favoris ?? []);
      })
      .catch(() => setFavoris([]))
      .finally(() => setChargement(false));
  }, []);

  async function retirer(slug: string) {
    // Retire de l'affichage immédiatement, puis utilise TON API existante
    setFavoris((anciens) => anciens.filter((f) => f.tool?.slug !== slug));
    await fetch("/api/favoris", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outil: slug }),
    }).catch(() => null);
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">Mes favoris ⭐</h1>
      <p className="mb-8 text-gray-500">
        Les outils IA que tu suis, en un seul endroit.
      </p>

      {chargement ? (
        <p className="text-gray-400">Chargement…</p>
      ) : !connecte ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="mb-4 text-4xl">🔒</p>
          <p className="mb-4 font-medium">Connecte-toi pour voir tes favoris.</p>
          <Link
            href="/connexion"
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            Se connecter
          </Link>
        </div>
      ) : favoris.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="mb-2 text-4xl">☆</p>
          <p className="font-medium">Aucun favori pour l'instant.</p>
          <p className="text-sm text-gray-500">
            Clique sur l'étoile d'un outil pour l'enregistrer ici.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favoris.map((f: any) => {
            const outil = f.tool ?? {};
            return (
              <div
                key={f.id}
                className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {outil.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={outil.logo}
                          alt=""
                          className="h-10 w-10 rounded-lg object-contain"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                          🔧
                        </div>
                      )}
                      <h2 className="font-semibold">{outil.nom ?? "Outil"}</h2>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        COULEURS[f.statut] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {LIBELLES[f.statut] ?? f.statut}
                    </span>
                  </div>
                  <p className="line-clamp-3 text-sm text-gray-500">
                    {outil.description ?? ""}
                  </p>
                  {f.note ? (
                    <p className="mt-2 text-xs italic text-gray-400">📝 {f.note}</p>
                  ) : null}
                  {outil.tarif ? (
                    <p className="mt-2 text-xs font-medium text-gray-400">
                      💰 {outil.tarif}
                    </p>
                  ) : null}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Link
                    href={`/outil/${outil.slug}`}
                    className="text-sm font-medium text-violet-600 hover:underline"
                  >
                    Voir la fiche →
                  </Link>
                  <button
                    type="button"
                    onClick={() => retirer(outil.slug)}
                    className="text-sm text-rose-500 hover:underline"
                  >
                    Retirer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}