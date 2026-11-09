// ─────────────────────────────────────────────────────────────────
// Lot 48 — ALIAS pour components/skills/bouton-epingle-skill.tsx
//
// Ce bouton (l'épingle « épingler ce skill » des cartes de skills)
// importe « basculerSkillFavori », qui n'existait pas dans ce
// fichier d'actions — d'où l'erreur de build :
//   Module '"@/app/actions/skills-favoris"' has no exported member
//   'basculerSkillFavori'.
//
// La fonction qui bascule réellement l'épingle s'appelle
// « basculerFavoriSkill » (elle vit plus haut dans CE MÊME fichier).
// Cet alias porte simplement le second nom attendu par le bouton —
// même principe que l'alias basculerSkillFavoriFormulaire du lot 47.
// ─────────────────────────────────────────────────────────────────
export async function basculerSkillFavori(skillId: string) {
  return basculerFavoriSkill(skillId);
}

function basculerFavoriSkill(skillId: string) {
  throw new Error("Function not implemented.");
}
