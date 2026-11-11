"use client";

// components/listes/logo-marque.tsx
// Lot 63 — logo d'une liste partagée (page publique, plan Entreprise),
// INCASSABLE cette fois. Le lot 62 avait déjà onError + no-referrer,
// mais un cas passait au travers :
//
//   ⚠ LE CAS PIÈGE CORRIGÉ (lot 63) : la page est rendue côté serveur.
//     Le navigateur commence à charger l'image AVANT que React ne
//     s'installe. Si l'image échoue pendant ce court laps de temps
//     (lien mort, http bloqué en https, hotlink interdit), l'erreur
//     part SANS auditeur : onError de React ne se déclenche jamais →
//     icône d'image cassée affichée pour toujours (ton bug).
//     → Au montage, on interroge l'état RÉEL de l'image via la ref :
//     complete && naturalWidth === 0 → échec → initiales.
//
//   • referrerPolicy="no-referrer" : beaucoup de sites bloquent
//     l'affichage externe dès qu'un « referer » est envoyé ;
//   • http:// promu automatiquement en https:// (les pages https
//     bloquent les images http dites « mixtes ») ;
//   • onError : filet de sécurité après hydratation.
//   • En cas d'échec : INITIALES de la liste sur le dégradé de marque
//     — plus jamais d'espace vide ou d'icône cassée.
//
// Signature inchangée : <LogoMarque nom={liste.nom} logo={liste.logoUrl} />
import { useCallback, useState } from "react";

export default function LogoMarque({
  nom,
  logo,
}: {
  nom: string;
  logo?: string | null;
}) {
  const [echec, setEchec] = useState(false);

  const initiales = nom
    .split(/[\s:.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0])
    .join("")
    .toUpperCase();

  // Lot 63 — rattrape les erreurs survenues AVANT l'hydratation React.
  const refImg = useCallback((el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth === 0) {
      setEchec(true);
    }
  }, []);

  if (!logo || echec) {
    return (
      <div
        aria-hidden
        className="grid size-16 shrink-0 place-items-center rounded-carte bg-[linear-gradient(135deg,#00d1ff,#6a3bff)] font-titre text-[20px] font-bold text-white shadow-carte"
      >
        {initiales}
      </div>
    );
  }

  // Les pages https refusent les images http (« contenu mixte ») :
  // on tente directement l'équivalent https.
  const src = logo.startsWith("http://")
    ? logo.replace(/^http:\/\//, "https://")
    : logo;

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      ref={refImg}
      src={src}
      alt={`Logo de la liste ${nom}`}
      referrerPolicy="no-referrer"
      onError={() => setEchec(true)}
      className="size-16 shrink-0 rounded-carte border border-bordure bg-white object-contain p-1 shadow-carte"
    />
  );
}