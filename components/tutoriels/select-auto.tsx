// components/tutoriels/select-auto.tsx
// Petit composant client : un <select> qui soumet automatiquement son
// formulaire natif dès qu'on change de valeur. Utilisé pour les filtres
// de la page /tutoriels (niveau, tri) — la page est ensuite rechargée
// avec les bons paramètres GET, sans logique JavaScript custom.
"use client";

export function SelectAuto({
  nom,
  valeur,
  libelle,
  options,
}: {
  nom: string;
  valeur: string;
  libelle: string;
  options: { valeur: string; libelle: string }[];
}) {
  return (
    <select
      name={nom}
      defaultValue={valeur}
      aria-label={libelle}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="min-h-11 cursor-pointer rounded-[7px] -skew-x-[18deg] border border-bordure bg-white px-4 text-[14px] leading-5 font-medium text-bleu hover:border-sky-500 focus:border-sky-500 focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.valeur} value={o.valeur}>
          {o.libelle}
        </option>
      ))}
    </select>
  );
}