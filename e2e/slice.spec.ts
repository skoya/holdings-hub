import { expect, test } from '@playwright/test';
import { createSessionViaWizard, runPaymentToSettled } from './helpers';

test.describe('vertical slice golden path (Family Office CIO)', () => {
  test('banner is present on every route', async ({ page }) => {
    for (const route of ['/', '/#/styleguide', '/#/library', '/#/wizard/step/1']) {
      await page.goto(route);
      await expect(page.getByTestId('disclaimer-banner')).toContainText(
        'Simulation only — no real transactions or investment advice.',
      );
    }
  });

  test('wizard -> holdings -> payment -> route -> settled -> audit/timeline', async ({ page }) => {
    await createSessionViaWizard(page);

    // Holdings dashboard shows the slice portfolio with source-of-truth labels.
    await expect(page.getByTestId('total-value')).toContainText('£');
    await expect(page.getByTestId('holdings-table')).toContainText('USD Coin');
    await expect(page.getByText('Meridian-authoritative').first()).toBeVisible();

    // Payment through the full lifecycle via the stablecoin rail.
    await runPaymentToSettled(page, 'stablecoin');
    await expect(page.getByText('settled', { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId('route-comparison')).toContainText('SWIFT correspondent chain');
    await expect(page.getByTestId('route-comparison')).toContainText('USDC stablecoin rail');
    await expect(page.getByTestId('lifecycle-events')).toContainText('in-flight');

    // Timeline and audit reflect the transaction.
    await page.goto('/#/timeline');
    await expect(page.getByTestId('timeline')).toContainText('transaction.settled');
    await page.goto('/#/audit');
    await expect(page.getByTestId('audit-table')).toContainText('route.selected');

    // Entity graph renders.
    await page.goto('/#/graph');
    await expect(page.getByTestId('entity-graph')).toBeVisible();
  });

  test('USDC transfer carries a Travel Rule packet', async ({ page }) => {
    await createSessionViaWizard(page);
    await page.goto('/#/transactions/new/usdc');
    await page.getByTestId('create-usdc').click();
    await page.waitForURL(/#\/transactions\/tx-/);
    await expect(page.getByTestId('travel-rule-packet')).toContainText('Meridian Bank Wallet Services');
    await expect(page.getByText('Required — ≥ 1000 USD')).toBeVisible();
    await page.getByTestId('btn-validate').click();
    await page.getByTestId('btn-approve').click();
    await page.getByTestId('btn-route-stablecoin').click();
    await page.getByTestId('btn-settle').click();
    await expect(page.getByTestId('lifecycle-events')).toContainText('settled');
  });

  test('export produces a session JSON download', async ({ page }) => {
    await createSessionViaWizard(page);
    await page.goto('/#/library');
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-session').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.json');
  });
});
