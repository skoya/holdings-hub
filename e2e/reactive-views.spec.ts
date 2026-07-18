import { expect, test } from '@playwright/test';
import { createSessionViaWizard } from './helpers';

test('graph and timeline reflect a persona hand-off after navigation', async ({ page }) => {
  await createSessionViaWizard(page);
  await page.goto('/#/personas');

  const complianceCard = page
    .getByRole('heading', { name: 'Screening & policy review' })
    .locator('../..');
  await complianceCard.getByRole('button', { name: 'Act as this persona' }).click();

  await page.goto('/#/graph');
  await expect(page.getByText('Compliance Officer (active)')).toBeVisible();
  await expect(page.getByTestId('active-persona-node')).toBeVisible();

  await page.goto('/#/timeline');
  await page.getByRole('button', { name: 'persona' }).click();
  await expect(page.getByText('persona.activated')).toBeVisible();
});
