import { expect, test, type Browser } from '@playwright/test';
import { createSessionViaWizard, runPaymentToSettled } from './helpers';

/**
 * Determinism replay (PLAN Section 23): the same seed and action script in a
 * fresh browser context must produce an identical engine-state hash and audit
 * trail.
 */
async function runScriptAndCapture(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await createSessionViaWizard(page);
  await runPaymentToSettled(page, 'stablecoin');
  await page.goto('/#/holdings?debug=1');
  const hash = await page.getByTestId('engine-hash').textContent();
  await page.goto('/#/audit');
  const auditRows = await page.getByTestId('audit-table').locator('tbody tr').count();
  await context.close();
  return { hash, auditRows };
}

test('same seed + same actions => identical engine hash and audit length', async ({ browser }) => {
  const first = await runScriptAndCapture(browser);
  const second = await runScriptAndCapture(browser);
  expect(first.hash).not.toBeNull();
  expect(second.hash).toBe(first.hash);
  expect(second.auditRows).toBe(first.auditRows);
});
