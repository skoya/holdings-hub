import { expect, test } from '@playwright/test';
import { createSessionViaWizard } from './helpers';

/**
 * M7 mobile companion (PLAN Sections 28 / 44): a simplified single-column view
 * scoped to holdings summary plus payment initiation and approval. It reuses
 * the same store, so the four-eyes control behaves identically to desktop.
 */
test.describe('mobile companion (M7)', () => {
  test('shows holdings summary and approves a payment via four-eyes', async ({ page }) => {
    await createSessionViaWizard(page);

    await page.goto('/#/mobile');
    await expect(page.getByTestId('mobile-companion')).toBeVisible();
    // Holdings summary renders a formatted total.
    await expect(page.getByTestId('mobile-total')).toContainText('£');
    await expect(page.getByText('No payments awaiting approval.')).toBeVisible();

    // Initiate a cross-border payment from the mobile companion.
    await page.getByTestId('mobile-new-payment').click();
    await page.waitForURL(/#\/transactions\/new\/payment/);
    await page.getByTestId('create-payment').click();
    await page.waitForURL(/#\/transactions\/tx-/);
    await page.getByTestId('btn-validate').click();
    await expect(page.getByText('pending-approval', { exact: true }).first()).toBeVisible();

    // Back on mobile the payment is queued for approval; approve as the
    // independent control signatory (four-eyes — the initiator cannot self-approve).
    await page.goto('/#/mobile');
    await expect(page.getByTestId('mobile-approvals')).toBeVisible();
    await page.getByTestId('mobile-approval-persona').selectOption({ index: 1 });
    await page.getByTestId('mobile-approve').click();

    await expect(page.getByText('No payments awaiting approval.')).toBeVisible();
    await expect(page.getByTestId('mobile-transactions')).toContainText('approved');
  });
});
