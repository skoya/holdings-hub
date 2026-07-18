import { expect, test } from '@playwright/test';
import { approveAsSecondPersona, createSessionViaWizard } from './helpers';

/** Golden-path scenarios 2 and 3 (M3 gate: three golden paths incl. slice.spec). */

test('corporate treasury preset: tokenised deposits and treasurer persona', async ({ page }) => {
  await createSessionViaWizard(page, 'corporate-treasury');
  await expect(page.getByTestId('holdings-table')).toContainText('Meridian tokenised deposit');
  await expect(page.getByTestId('holdings-table')).toContainText('Euro Coin');
  await expect(page.getByTestId('total-value')).toContainText('£');

  // Entity graph reflects the treasury entity and permissioned network.
  await page.goto('/#/graph');
  await expect(page.getByTestId('entity-graph')).toBeVisible();
});

test('asset manager preset: DvP settlement demo end-to-end', async ({ page }) => {
  await createSessionViaWizard(page, 'asset-manager-dsvp');
  await expect(page.getByTestId('holdings-table')).toContainText('Tokenised corporate bond');

  await page.goto('/#/transactions');
  await page.getByTestId('new-dsvp').click();
  await page.waitForURL(/#\/transactions\/tx-/);
  await expect(page.getByTestId('route-comparison')).toContainText('atomic DvP');

  await page.getByTestId('btn-validate').click();
  await approveAsSecondPersona(page);
  await page.getByTestId('btn-route-internal-book').click();
  await page.getByTestId('btn-settle').click();
  await expect(page.getByTestId('lifecycle-events')).toContainText('settled');

  // Audit shows the atomic DvP effect.
  await page.goto('/#/audit');
  await expect(page.getByTestId('audit-table')).toContainText('holdings.dsvp-settled');
});
