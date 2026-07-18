import { expect, test } from '@playwright/test';

/** M5 i18n (PLAN Section 21): the UI renders in a non-English locale. */

test.describe('internationalisation', () => {
  test('switching to German translates the chrome', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('disclaimer-banner')).toContainText(
      'Simulation only — no real transactions or investment advice.',
    );

    await page.getByTestId('language-switcher').selectOption('de');

    await expect(page.getByTestId('disclaimer-banner')).toContainText('Nur Simulation');
    await expect(page.getByTestId('home-heading')).toHaveText('Kunden-Bestandsübersicht');
    await expect(page.getByRole('link', { name: 'Bestände' })).toBeVisible();
  });

  test('language choice persists across navigation', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('language-switcher').selectOption('fr');
    await page.goto('/#/library');
    await expect(page.getByTestId('disclaimer-banner')).toContainText('Simulation uniquement');
  });
});
