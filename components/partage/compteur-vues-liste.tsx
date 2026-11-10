"use client";

// Lot 55 — idée 14 : compteur de vues discret pour la page publique
// d'une liste. Signale une visite à /api/listes/vue :
//   • 1 signal max par session (sessionStorage) ;
//   • 1 max par mois et par navigateur (cookie posé par la route) ;
//   • le serveur ignore de toute façon les vues du propriétaire.
// N'affiche rien : le composant est invisible.
import { useEffect } from "react";

export default function CompteurVuesListe({ listeId }: { listeId: string }) {
  useEffect(() => {
    const cle = `wg_vue_session_${listeId}`;
    try {
      if (sessionStorage.getItem(cle)) return;
      sessionStorage.setItem(cle, "1");
    } catch {
      // Stockage indisponible (navigation privée stricte) : on compte quand même.
    }
    fetch("/api/listes/vue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listeId }),
    }).catch(() => {
      // Échec silencieux : le compteur ne doit jamais casser la page.
    });
  }, [listeId]);

  return null;
}