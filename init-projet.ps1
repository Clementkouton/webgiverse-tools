$liste = @'
package.json
postcss.config.mjs
tsconfig.json
next.config.ts
auth.config.ts
auth.ts
middleware.ts
vitest.config.ts
playwright.config.ts
README.md
.env.example
app/globals.css
app/layout.tsx
app/page.tsx
app/sitemap.ts
app/robots.ts
app/actions/favoris.ts
app/actions/newsletter.ts
app/actions/listes.ts
app/actions/profil.ts
app/actions/propositions.ts
app/actions/admin.ts
app/api/auth/[...nextauth]/route.ts
app/api/assistant/route.ts
app/api/assistant/guide/route.ts
app/api/favoris/route.ts
app/api/recherche/route.ts
app/outils/page.tsx
app/agents/page.tsx
app/gratuits/page.tsx
app/open-source/page.tsx
app/categories/page.tsx
app/categorie/[slug]/page.tsx
app/outil/[slug]/page.tsx
app/comparer/page.tsx
app/assistant/page.tsx
app/dashboard/page.tsx
app/proposer/page.tsx
app/connexion/page.tsx
app/inscription/page.tsx
app/admin/layout.tsx
app/admin/page.tsx
components/ui/bouton.tsx
components/ui/badge.tsx
components/ui/carte.tsx
components/ui/champ.tsx
components/ui/accordeon.tsx
components/commun/logo.tsx
components/commun/logo-outil.tsx
components/commun/bouton-copier.tsx
components/commun/bouton-confirmer.tsx
components/commun/formulaire-newsletter.tsx
components/commun/icone-categorie.tsx
components/layout/header.tsx
components/layout/footer.tsx
components/outil/carte-outil.tsx
components/outil/bouton-favori.tsx
components/annuaire/vue-annuaire.tsx
components/auth/formulaire-auth.tsx
components/dashboard/selecteur-statut.tsx
components/dashboard/editeur-note.tsx
components/assistant/assistant-client.tsx
components/assistant/mode-guide.tsx
components/assistant/chat.tsx
components/comparer/comparateur.tsx
components/proposer/formulaire-proposition.tsx
content/accueil.ts
lib/prisma.ts
lib/utils.ts
lib/fonts.ts
lib/queries.ts
lib/schemas.ts
lib/assistant/scoring.ts
lib/assistant/contexte.ts
lib/assistant/prompt.ts
prisma/schema.prisma
prisma/seed.ts
types/next-auth.d.ts
tests/scoring.test.ts
tests/schemas.test.ts
tests/e2e/parcours.spec.ts
'@ -split "`r?`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ }

$liste | ForEach-Object {
  $d = Split-Path $_ -Parent
  if ($d) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
  if (-not (Test-Path $_)) { New-Item -ItemType File -Path $_ | Out-Null }
}

@'
node_modules/
.next/
.env
.env.local
.env*.local
*.tsbuildinfo
playwright-report/
test-results/
'@ | Set-Content .gitignore -Encoding utf8

foreach ($p in "blog","actualites","mentions-legales","confidentialite","cgu") {
  New-Item -ItemType Directory -Force -Path "app/$p" | Out-Null
  Set-Content "app/$p/page.tsx" @'
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page" };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-h2 font-semibold">Page en cours de rédaction</h1>
      <p className="mt-2 text-encre">Contenu à venir.</p>
    </div>
  );
}
'@ -Encoding utf8
}

Write-Host "Structure créée avec succès." -ForegroundColor Green