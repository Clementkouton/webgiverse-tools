// components/admin/bouton-verifier-liens.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 26 — Bouton « Vérifier les liens » du tableau de bord : appelle
// la route POST /api/admin/verifier-liens (40 fiches par lancement)
// puis rafraîchit les données serveur. Affiche l'état en cours et le
// bilan du lancement, sans jamais bloquer la page en cas d'erreur.
// ─────────────────────────────────────────────────────────────────
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2Off, LoaderCircle } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";

type Bilan = {
  verifies: number;
  morts: number;
  interrompu: boolean;
};

export function BoutonVerifierLiens() {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function verifier() {
    if (enCours) return;
    setEnCours(true);
    setErreur(null);
    setBilan(null);
    try {
      const reponse = await fetch("/api/admin/verifier-liens", { method: "POST" });
      const donnees = (await reponse.json()) as Bilan & { erreur?: string };
      if (!reponse.ok) {
        setErreur(donnees?.erreur ?? "Vérification impossible.");
      } else {
        setBilan({
          verifies: donnees.verifies ?? 0,
          morts: donnees.morts ?? 0,
          interrompu: Boolean(donnees.interrompu),
        });
        router.refresh(); // met à jour l'alerte et la liste des liens morts
      }
    } catch {
      setErreur("Vérification interrompue (réseau ou délai dépassé) — relance.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Bouton variante="indigo" taille="sm" onClick={verifier} disabled={enCours}>
        {enCours ? (
          <LoaderCircle className="animate-spin" aria-hidden />
        ) : (
          <Link2Off aria-hidden />
        )}
        {enCours ? "Vérification en cours…" : "Vérifier les liens"}
      </Bouton>
      {bilan && (
        <p className="text-[12px] leading-4 text-adm-gris" role="status">
          {bilan.verifies} lien{bilan.verifies > 1 ? "s" : ""} vérifié
          {bilan.verifies > 1 ? "s" : ""} · {bilan.morts} en défaut
          {bilan.interrompu ? " — relance pour continuer" : ""}
        </p>
      )}
      {erreur && (
        <p className="text-[12px] leading-4 text-[#c94f35]" role="alert">
          {erreur}
        </p>
      )}
    </div>
  );
}
