import { expect, test } from '@playwright/test';
import { createSessionViaWizard } from './helpers';

/**
 * M4 controls & compliance (PLAN Section 40 M4): four-eyes approval path and a
 * policy-blocked transaction path, plus the opt-in DeFi module gating.
 */

test.describe('controls and compliance (M4)', () => {
  test('four-eyes: initiator cannot approve, independent signatory can', async ({ page }) => {
    await createSessionViaWizard(page);

    await page.goto('/#/transactions/new/payment');
    await page.getByTestId('create-payment').click();
    await page.waitForURL(/#\/transactions\/tx-/);

    await page.getByTestId('btn-validate').click();

    // Policy decisions are explainable and surfaced on the detail view.
    await expect(page.getByTestId('policy-decisions')).toContainText('APP-001');
    await expect(page.getByTestId('policy-decisions')).toContainText('require-approval');
    await expect(page.getByText('pending-approval', { exact: true }).first()).toBeVisible();

    // Attempt to approve as the initiator (default persona) — blocked by four-eyes.
    await page.getByTestId('btn-approve').click();
    await expect(page.getByTestId('tx-error')).toContainText('initiator cannot approve');
    await expect(page.getByText('pending-approval', { exact: true }).first()).toBeVisible();

    // Switch to the independent control signatory and approve.
    await page.getByTestId('approval-persona').selectOption({ index: 1 });
    await page.getByTestId('btn-approve').click();
    await expect(page.getByText('approved', { exact: true }).first()).toBeVisible();
  });

  test('policy block: a transaction above the per-transaction limit fails', async ({ page }) => {
    await createSessionViaWizard(page);

    await page.goto('/#/transactions/new/payment');
    await page.getByLabel('Amount (GBP)').fill('2000000');
    await page.getByTestId('create-payment').click();
    await page.waitForURL(/#\/transactions\/tx-/);

    await page.getByTestId('btn-validate').click();

    await expect(page.getByTestId('policy-decisions')).toContainText('LIM-001');
    await expect(page.getByTestId('policy-decisions')).toContainText('block');
    await expect(page.getByText('failed', { exact: true }).first()).toBeVisible();
  });

  test('DeFi module: opt-in required and entitlement-gated', async ({ page }) => {
    // Without opt-in the module reports disabled.
    await createSessionViaWizard(page);
    await page.goto('/#/defi');
    await expect(page.getByTestId('defi-disabled')).toBeVisible();

    // Re-run the wizard with the DeFi opt-in enabled.
    await page.goto('/#/wizard/step/1');
    for (let step = 1; step < 4; step++) {
      await page.getByRole('button', { name: 'Next' }).click();
    }
    // Step 4 hosts the opt-in checkbox.
    await page.getByTestId('defi-optin').check();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByTestId('wizard-create').click();
    await page.waitForURL(/#\/holdings/);

    await page.goto('/#/defi');
    await expect(page.getByTestId('defi-perimeter-banner')).toContainText(
      'Outside Meridian custody perimeter',
    );
    await expect(page.getByTestId('defi-position').first()).toBeVisible();
    await expect(page.getByTestId('defi-risks').first()).toBeVisible();
  });
});
