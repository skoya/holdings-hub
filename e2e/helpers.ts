import type { Page } from '@playwright/test';

/** Drive the wizard and create a session; optionally pick a scenario preset. */
export async function createSessionViaWizard(page: Page, presetId?: string): Promise<void> {
  await page.goto('/#/wizard/step/1');
  if (presetId) {
    await page.getByTestId('preset-select').selectOption(presetId);
  }
  for (let step = 1; step < 5; step++) {
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await page.getByTestId('wizard-create').click();
  await page.waitForURL(/#\/holdings/);
}

/** Run a cross-border payment through the full lifecycle. */
export async function runPaymentToSettled(page: Page, route: 'stablecoin' | 'swift-correspondent') {
  await page.goto('/#/transactions/new/payment');
  await page.getByTestId('create-payment').click();
  await page.waitForURL(/#\/transactions\/tx-/);
  await page.getByTestId('btn-validate').click();
  // Four-eyes control (PLAN Section 12): a payment above the materiality
  // threshold is signed off by an independent approver, not the initiator.
  await approveAsSecondPersona(page);
  await page.getByTestId(`btn-route-${route}`).click();
  await page.getByTestId('btn-settle').click();
}

/**
 * Approve a pending transaction as the independent control signatory (persona
 * index 1), satisfying the four-eyes rule. Safe for below-threshold
 * transactions too — the signatory can always approve.
 */
export async function approveAsSecondPersona(page: Page) {
  await page.getByTestId('approval-persona').selectOption({ index: 1 });
  await page.getByTestId('btn-approve').click();
}
