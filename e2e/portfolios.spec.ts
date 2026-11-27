import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

test('updates portfolio cards after committed actions and explains reassignment', async ({ page }) => {
  await page.goto('/portfolios');
  const list = page.getByRole('list', { name: 'Saved portfolios' });
  const seed = list.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'My Portfolio', exact: true }) });
  await expect(seed.getByRole('button', { name: 'Delete My Portfolio' })).toBeDisabled();
  await expect(seed.getByRole('link', { name: 'Set Budget' })).toHaveAttribute('href', '/budget');

  await page.getByRole('button', { name: 'New portfolio' }).click();
  const create = page.getByRole('dialog', { name: 'New portfolio' });
  await create.getByRole('textbox', { name: 'Name', exact: true }).fill('Rentals');
  await create.getByRole('button', { name: 'Create portfolio' }).click();
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await page.getByRole('button', { name: 'Rename Rentals', exact: true }).click();
  const rename = page.getByRole('dialog', { name: 'Rename portfolio' });
  await rename.getByRole('textbox', { name: 'Name', exact: true }).fill('Long-term homes');
  await rename.getByRole('button', { name: 'Save name' }).click();
  await expect(list.getByRole('link', { name: 'Long-term homes', exact: true })).toBeVisible();

  await list.getByRole('button', { name: 'Duplicate Long-term homes', exact: true }).click();
  await expect(list.getByRole('link', { name: 'Long-term homes (Copy)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete Long-term homes', exact: true }).click();
  const deleteDialog = page.getByRole('dialog', { name: 'Delete portfolio?' });
  await expect(deleteDialog).toContainText('will move to “My Portfolio”');
  await deleteDialog.getByRole('button', { name: 'Delete portfolio' }).click();
  await expect(list.getByRole('listitem')).toHaveCount(2);

  await seed.getByRole('link', { name: 'Set Budget' }).click();
  await page.getByRole('button', { name: 'Save budget', exact: true }).click();
  await expect(page.getByText('Budget saved.')).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Portfolios' }).click();
  await expect(seed.getByText('$0.00 / month · Break-even')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});
