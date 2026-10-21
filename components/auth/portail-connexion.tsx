// components/auth/portail-connexion.tsx
"use client";
import { useState } from "react";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { ModaleConnexion } from "./modale-connexion";

export function PortailConnexion({ suite = "/dashboard" }: { suite?: string }) {
  const [ouvert, setOuvert] = useState(true);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Carte className="p-10 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-3 text-h3 font-semibold">Cet espace est réservé aux membres</h1>
        <p className="mt-2 text-encre">Connecte-toi pour accéder à ton tableau de bord.</p>
        <Bouton className="mt-6" onClick={() => setOuvert(true)}>Se connecter</Bouton>
      </Carte>
      <ModaleConnexion ouvert={ouvert} onFermer={() => setOuvert(false)} suite={suite} />
    </div>
  );
}