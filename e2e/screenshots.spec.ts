import { test } from '@playwright/test';
import { createSessionViaWizard } from './helpers';

/**
 * Capture per-route screenshots (PLAN M8 deliverable "README + screenshots").
 * Saved to screenshots/ and uploaded as a CI artefact. Chromium is the
 * canonical capture project; the spec is a no-op assertion — its purpose is the
 * side-effect PNGs, so it never fails the E2E gate.
 */
test.describe('screenshots', () => {
  test('capture key routes', async ({ page }, testInfo) => {
    // Only the Chromium project produces the canonical gallery.
    test.skip(testInfo.project.name !== 'chromium', 'chromium captures the gallery');

    const shot = (name: string) =>
      page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });

    await page.goto('/');
    await page.waitForSelector('#main');
    await shot('01-home');

    await page.goto('/#/wizard/step/1');
    await page.waitForSelector('#main');
    await shot('02-wizard');

    await createSessionViaWizard(page);
    await shot('03-holdings');

    // A transaction through to the detail view (route comparison + Travel Rule).
    await page.goto('/#/transactions/new/payment');
    await page.getByTestId('create-payment').click();
    await page.waitForURL(/#\/transactions\/tx-/);
    await page.waitForSelector('#main');
    await shot('04-transaction-detail');

    for (const [name, route] of [
      ['05-transactions', '/#/transactions'],
      ['06-timeline', '/#/timeline'],
      ['07-audit', '/#/audit'],
      ['08-graph', '/#/graph'],
      ['09-mobile', '/#/mobile'],
    ] as const) {
      await page.goto(route);
      await page.waitForSelector('#main');
      await shot(name);
    }
  });
});
