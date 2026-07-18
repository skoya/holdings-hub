import { expect, test } from '@playwright/test';
import { createSessionViaWizard } from './helpers';

test('persona workbench exposes role journeys and records persona activation', async ({ page }) => {
  await createSessionViaWizard(page);
  await page.goto('/#/personas');

  await expect(page.getByRole('heading', { name: 'Persona workbench' })).toBeVisible();
  await expect(page.getByText('Liquidity & rail economics')).toBeVisible();
  await expect(page.getByText('Screening & policy review')).toBeVisible();
  await expect(page.getByText('Exception resolution')).toBeVisible();
  await expect(page.getByText('Independent evidence review')).toBeVisible();

  const complianceCard = page
    .getByRole('heading', { name: 'Screening & policy review' })
    .locator('../..');
  await complianceCard.getByRole('button', { name: 'Act as this persona' }).click();
  await expect(page.getByText('Compliance Officer · compliance-officer')).toBeVisible();

  await page.goto('/#/audit');
  await expect(page.getByText('persona.activated')).toBeVisible();
});
