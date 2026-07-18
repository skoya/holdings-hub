import { expect, test } from '@playwright/test';
import { createSessionViaWizard } from './helpers';

/** M6 library + deep links (PLAN Sections 18/20). */

test.describe('simulation library and deep links', () => {
  test('deep link restores a locally-stored session', async ({ page }) => {
    await createSessionViaWizard(page);
    await page.goto('/');
    const id = await page.getByTestId('session-id').getAttribute('data-session-id');
    expect(id).toBeTruthy();

    await page.goto(`/#/open/${id}`);
    await page.waitForURL(/#\/holdings/);
    await expect(page.getByTestId('total-value')).toBeVisible();
  });

  test('deep link to an unknown session prompts to import', async ({ page }) => {
    await page.goto('/#/open/session-does-not-exist');
    await expect(page.getByTestId('deeplink-missing')).toBeVisible();
  });

  test('duplicate, rename and ZIP-bundle a stored session', async ({ page }) => {
    await createSessionViaWizard(page);
    await page.goto('/#/library');

    await page.getByTestId('duplicate-session').first().click();
    await expect(page.getByRole('button', { name: 'Load' })).toHaveCount(2);

    page.once('dialog', (dialog) => dialog.accept('Renamed via test'));
    await page.getByTestId('rename-session').first().click();
    await expect(page.getByText('Renamed via test')).toBeVisible();

    const download = page.waitForEvent('download');
    await page.getByTestId('bundle-session').first().click();
    expect((await download).suggestedFilename()).toContain('.zip');
  });
});
