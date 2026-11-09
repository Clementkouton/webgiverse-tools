// app/dashboard/skills/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 47b — ANCIENNE page « Mes skills » (doublon signalé aux lots 44
// et 47). La page officielle vit dans
// app/dashboard/skills-favoris/page.tsx — c'est elle qu'ouvre le menu
// du tableau de bord (Apprendre → Mes skills).
//
// Cette ancienne URL est devenue une simple REDIRECTION vers la page
// officielle :
//   · plus aucune ligne de code à typer → plus AUCUNE erreur de type
//     possible dans ce fichier (les 2 dernières erreurs de build
//     venaient de ses imports et de son « type géant » en ligne 129
//     avec Intl.FormattableTemporalObject, un type qui n'existe pas) ;
//   · /dashboard/skills mène toujours à « Mes skills » : aucun 404,
//     l'expérience ne change pas ;
//   · le menu du tableau de bord ne change pas (il pointe déjà
//     /dashboard/skills-favoris).
// ─────────────────────────────────────────────────────────────────
import { redirect } from "next/navigation";

export default async function PageSkillsAncienne() {
  redirect("/dashboard/skills-favoris");
}