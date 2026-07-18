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
  for (const route of ['/#/holdings', '/#/transactions', '/#/timeline', '/#/audit', '/#/graph']) {
    await page.goto(route);
    await page.waitForSelector('#main');
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious, `${route}: ${JSON.stringify(serious, null, 2)}`).toEqual([]);
  }
});
