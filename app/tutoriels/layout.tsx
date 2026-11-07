// app/tutoriels/layout.tsx
//
// ⚠️ Rôle : layout de SEGMENT uniquement.
// Seul app/layout.tsx (mise en page RACINE) a le droit de rendre
// <html> et <body>. L'ancienne version de ce fichier rendait
// <html lang="en"><body>{children}</body></html>, ce qui provoquait :
//   - « <html> cannot be a child of <main> »
//   - « You are mounting a new body component… »
//   - l'échec d'hydratation et la grande zone blanche sous le footer.
//
// Correction : on renvoie UNIQUEMENT les enfants, dans un fragment.

export const metadata = {
  title: "Tutoriels — Webgiverse Tools",
  description:
    "Tous les tutoriels Webgiverse Tools : IA, prompting et outils no-code, gratuits avec un compte.",
};

export default function LayoutTutoriels({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}