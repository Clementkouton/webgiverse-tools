// tests/e2e/parcours.spec.ts
import { expect, test } from "@playwright/test";

// Pré requis : AUTH_ALLOW_CREDENTIALS=true, NEXT_PUBLIC_CREDENTIALS_ACTIFS=true,
// E2E_TEST_EMAIL / E2E_TEST_MOT_DE_PASSE définis, puis `npm run db:seed`.
test("parcours complet : connexion → recherche → fiche → favori → dashboard", async ({ page }) => {
  // 1. Connexion avec le compte de test créé par le seed
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(process.env.E2E_TEST_EMAIL ?? "e2e@webgiverse.test");
  await page.getByLabel("Mot de passe").fill(process.env.E2E_TEST_MOT_DE_PASSE ?? "motdepasse-test");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  // 2. Recherche depuis l'accueil
  await page.goto("/");
  await page.getByLabel("Rechercher dans l'annuaire").fill("Claude");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/outils\?.*q=Claude/);

  // 3. Ouverture de la fiche outil
  await page.getByRole("link", { name: /Claude/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: /Claude/ })).toBeVisible();

  // 4. Ajout aux favoris
  await page.getByRole("button", { name: "Ajouter aux favoris" }).click();
  await expect(page.getByRole("button", { name: "Retirer des favoris" })).toBeVisible();

  // 5. Le favori apparaît dans le dashboard
  await page.goto("/dashboard");
  await expect(page.getByText("Claude").first()).toBeVisible();
  await expect(page.getByText("favoris").first()).toBeVisible();
});