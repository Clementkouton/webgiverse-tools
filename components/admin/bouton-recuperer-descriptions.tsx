// components/admin/bouton-recuperer-descriptions.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 28 — Bouton « Récupérer les descriptions YouTube » du tableau
// de bord : appelle la route POST /api/admin/scrape-descriptions
// (10 tutoriels par lancement) puis rafraîchit les données serveur.
// Affiche l'état en cours et le bilan du lancement. Si YouTube bloque
// les requêtes du serveur (échecs > 0), rappelle l'astuce du script
// local — sans jamais bloquer la page en cas d'erreur.
// ─────────────────────────────────────────────────────────────────
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Captions, LoaderCircle } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";

type Bilan = {
  traites: number;
  avecRessources: number;
  echecs: number;
  restants: number;
  interrompu: boolean;
};

export function BoutonRecupererDescriptions() {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function recuperer() {
    if (enCours) return;
    setEnCours(true);
    setErreur(null);
    setBilan(null);
    try {
      const reponse = await fetch("/api/admin/scrape-descriptions", { method: "POST" });
      const donnees = (await reponse.json()) as Bilan & { erreur?: string };
      if (!reponse.ok) {
        setErreur(donnees?.erreur ?? "Récupération impossible.");
      } else {
        setBilan({
          traites: donnees.traites ?? 0,
          avecRessources: donnees.avecRessources ?? 0,
          echecs: donnees.echecs ?? 0,
          restants: donnees.restants ?? 0,
          interrompu: Boolean(donnees.interrompu),
        });
        router.refresh(); // met à jour le compteur de la carte
      }
    } catch {
      setErreur("Récupération interrompue (réseau ou délai dépassé) — relance.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Bouton variante="indigo" taille="sm" onClick={recuperer} disabled={enCours}>
        {enCours ? <LoaderCircle className="animate-spin" aria-hidden /> : <Captions aria-hidden />}
        {enCours ? "Récupération en cours…" : "Récupérer les descriptions"}
      </Bouton>
      {bilan && (
        <>
          <p className="text-[12px] leading-4 text-adm-gris" role="status">
            {bilan.traites} description{bilan.traites > 1 ? "s" : ""} raffinée
            {bilan.traites > 1 ? "s" : ""}
            {bilan.avecRessources > 0 ? ` · ${bilan.avecRessources} avec ressources` : ""}
            {bilan.echecs > 0 ? ` · ${bilan.echecs} échec${bilan.echecs > 1 ? "s" : ""}` : ""}
            {bilan.restants > 0 ? ` · ${bilan.restants} restant${bilan.restants > 1 ? "s" : ""}` : ""}
            {bilan.interrompu ? " — relance pour continuer" : ""}
          </p>
          {bilan.echecs > 0 && (
            <p className="max-w-xs text-[11px] leading-4 text-adm-gris">
              YouTube bloque parfois les serveurs : relance, ou remplis depuis ton PC avec{" "}
              <code className="rounded bg-adm-gris-clair px-1 py-0.5">
                npx tsx scripts/recuperer-descriptions-youtube.ts
              </code>
            </p>
          )}
        </>
      )}
      {erreur && (
        <p className="text-[12px] leading-4 text-[#c94f35]" role="alert">
          {erreur}
        </p>
      )}
    </div>
  );
}
