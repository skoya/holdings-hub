import type { Page } from '@playwright/test';

/** Drive the wizard with default values and create a session. */
export async function createSessionViaWizard(page: Page): Promise<void> {
  await page.goto('/#/wizard/step/1');
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
  await page.getByTestId('btn-approve').click();
  await page.getByTestId(`btn-route-${route}`).click();
  await page.getByTestId('btn-settle').click();
}
