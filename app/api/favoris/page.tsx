"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BoutonExportPdf from "@/components/pdf/bouton-export-pdf";
import { LienPartage } from "@/components/partage/bouton-partage-liste";

type Favori = {
  id: string;
  statut: string;
  note: string | null;
  tool: {
    id: string;
    nom: string;
    slug: string;
    url: string;
    logo: string | null;
    description: string;
    tarif: string | null;
    gratuit: boolean;
  };
};

const STATUTS: Record<string, { libelle: string; classe: string }> = {
  A_TESTER: { libelle: "À tester", classe: "bg-bleu/10 text-bleu" },
  EN_COURS: { libelle: "En cours", classe: "bg-amber-100 text-amber-700" },
  ADOPTE: { libelle: "Adopté", classe: "bg-green-100 text-green-700" },
};

export default function PageFavoris() {
  const [favoris, setFavoris] = useState<Favori[] | null>(null);
  const [partageCharge, setPartageCharge] = useState(false);
  const [partageErreur, setPartageErreur] = useState<string | null>(null);
  const [lienPartage, setLienPartage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/favoris/liste")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setFavoris(Array.isArray(d?.favoris) ? d.favoris : []))
      .catch(() => setFavoris([]));
  }, []);

  async function retirer(slug: string) {
    await fetch("/api/favoris", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outil: slug }),
    });
    setFavoris((liste) => liste?.filter((f) => f.tool.slug !== slug) ?? []);
  }

  async function partager() {
    if (partageCharge) return;
    setPartageCharge(true);
    setPartageErreur(null);

    try {
      const res = await fetch("/api/favoris/partage", { method: "POST" });
      const d = await res.json();

      if (!res.ok) {
        setPartageErreur(d?.erreur ?? "Une erreur est survenue.");
        return;
      }

      if (d.publique && d.slug) {
        setLienPartage(`${window.location.origin}/listes/${d.slug}`);
      } else {
        setLienPartage(null);
      }
    } catch {
      setPartageErreur("Impossible de contacter le serveur.");
    } finally {
      setPartageCharge(false);
    }
  }

  if (favoris === null) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-12">
        <p className="text-encre/60">Chargement de tes favoris...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12">
      <header className="mb-8">
        <h1 className="font-titre text-h2 text-encre">Mes favoris</h1>
        <p className="mt-2 text-encre/70">
          {favoris.length === 0
            ? "Tu n'as pas encore d'outil en favori."
            : `${favoris.length} outil${favoris.length > 1 ? "s" : ""} enregistré${favoris.length > 1 ? "s" : ""}.`}
        </p>
      </header>

      {favoris.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center gap-3 rounded-carte border border-bordure bg-gris p-4">
          <BoutonExportPdf
            titre="Mes outils favoris"
            sousTitre="Sélection réalisée sur Webgiverse Outils IA"
            fichier="webgiverse-favoris"
            outils={favoris.map((f) => ({
              nom: f.tool.nom,
              description: f.tool.description,
              tarif: f.tool.tarif ?? "",
              slug: f.tool.slug,
              gratuit: f.tool.gratuit,
            }))}
          />

          <button
            type="button"
            onClick={partager}
            disabled={partageCharge}
            className="inline-flex items-center gap-2 rounded-champ bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
          >
            {partageCharge
              ? "Préparation..."
              : lienPartage
                ? "Arrêter le partage public"
                : "Partager ma sélection"}
          </button>

          {partageErreur && (
            <p className="text-sm text-red-600">{partageErreur}</p>
          )}
        </div>
      )}

      {lienPartage && (
        <div className="mb-8 rounded-carte border border-violet/30 bg-violet/5 p-4">
          <p className="mb-2 break-all text-sm text-encre/70">
            Ta sélection est publique. Partage-la :
          </p>
          <LienPartage
            url={lienPartage}
            texte="Ma sélection d'outils IA sur Webgiverse"
          />
        </div>
      )}

      {favoris.length === 0 ? (
        <div className="rounded-carte border border-bordure bg-white p-8 text-center shadow-carte">
          <p className="text-encre/70">
            Explore l&apos;annuaire et clique sur l&apos;étoile d&apos;un outil pour
            l&apos;enregistrer ici.
          </p>
          <Link
            href="/outils"
            className="mt-4 inline-block rounded-champ bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            Découvrir les outils
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {favoris.map((f) => {
            const statut = STATUTS[f.statut];
            return (
              <article
                key={f.id}
                className="flex flex-wrap items-center gap-4 rounded-carte border border-bordure bg-white p-4 shadow-carte"
              >
                {f.tool.logo ? (
                  <img
                    src={f.tool.logo}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg border border-bordure object-contain p-1"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gris font-titre text-lg font-bold text-encre">
                    {f.tool.nom.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/outil/${f.tool.slug}`}
                      className="font-titre font-semibold text-encre hover:text-violet"
                    >
                      {f.tool.nom}
                    </Link>
                    {statut && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statut.classe}`}
                      >
                        {statut.libelle}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-encre/60">
                    {f.tool.description}
                  </p>
                  {f.note && (
                    <p className="mt-1 text-xs italic text-encre/50">
                      Ma note : {f.note}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-medium text-encre/60">
                    {f.tool.gratuit ? "Gratuit" : f.tool.tarif || ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => retirer(f.tool.slug)}
                    className="rounded-champ border border-bordure px-3 py-1.5 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50"
                  >
                    Retirer
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}