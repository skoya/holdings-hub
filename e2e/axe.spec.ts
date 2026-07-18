import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { createSessionViaWizard } from './helpers';

/** axe-core accessibility assertions on top-level routes (PLAN Section 22). */

const PUBLIC_ROUTES = ['/', '/#/wizard/step/1', '/#/styleguide', '/#/library'];

for (const route of PUBLIC_ROUTES) {
  test(`axe: no serious/critical violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForSelector('#main');
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}

test('axe: no serious/critical violations on session views', async ({ page }) => {
  await createSessionViaWizard(page);
  // Every session-dependent top-level route (PLAN Section 22, M7 full coverage),
  // including the mobile companion, the DeFi module and the payment forms.
  for (const route of [
    '/#/holdings',
    '/#/personas',
    '/#/transactions',
    '/#/transactions/new/payment',
    '/#/transactions/new/usdc',
    '/#/timeline',
    '/#/audit',
    '/#/graph',
    '/#/defi',
    '/#/mobile',
  ]) {
    await page.goto(route);
    await page.waitForSelector('#main');
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious, `${route}: ${JSON.stringify(serious, null, 2)}`).toEqual([]);
  }
});

test('axe: no serious/critical violations on a transaction detail view', async ({ page }) => {
  await createSessionViaWizard(page);
  await page.goto('/#/transactions/new/payment');
  await page.getByTestId('create-payment').click();
  await page.waitForURL(/#\/transactions\/tx-/);
  await page.waitForSelector('#main');
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});
