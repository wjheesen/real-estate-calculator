import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

async function createPortfolio(page: Page, name: string) {
  await page.getByRole('button', { name: 'New portfolio' }).click();
  const dialog = page.getByRole('dialog', { name: 'New portfolio' });
  await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
  await dialog.getByRole('button', { name: 'Create portfolio' }).click();
  await expect(page.getByRole('link', { name, exact: true })).toBeVisible();
}

test('handles invalid links and removes unavailable comparisons without leaving the main portfolio', async ({ page, context }) => {
  await page.goto('/portfolio/1e0');
  await expect(page).toHaveURL(/\/portfolios$/);
  await expect(page.getByText('That portfolio could not be found.')).toBeVisible();
  await createPortfolio(page, 'Empty scenario');
  await page.getByRole('link', { name: 'My Portfolio', exact: true }).click();
  const chart = page.locator('app-cartesian-chart canvas');
  await expect(chart).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Compare with' }).click();
  await expect(page.getByRole('option', { name: 'My Portfolio' })).toHaveCount(0);
  await page.getByRole('option', { name: 'Empty scenario' }).click();
  await expect(page.getByRole('heading', { name: 'Portfolio comparison' })).toBeVisible();
  await expect(page.getByRole('row', { name: /Monthly Budget Fit/ }).getByRole('cell')).toHaveText(['—', '—', '—']);
  await expect(page.getByRole('row', { name: /Monthly cash flow/ }).getByRole('cell')).toHaveText(['$0.00', '$0.00', '$0.00']);
  await expect(chart).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);

  const grid = await context.newPage();
  await grid.goto('/portfolios');
  await grid.getByRole('button', { name: 'Delete Empty scenario' }).click();
  await grid.getByRole('dialog', { name: 'Delete portfolio?' }).getByRole('button', { name: 'Delete portfolio' }).click();
  await expect(grid.getByText('Portfolio deleted.', { exact: true })).toBeVisible();
  await expect(grid.getByRole('link', { name: 'Empty scenario', exact: true })).toBeHidden();
  await grid.close();
  await page.evaluate(() => window.dispatchEvent(new FocusEvent('focus')));
  await expect(page.getByText('The comparison portfolio is no longer available.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'My Portfolio', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Portfolio summary' })).toBeVisible();
  await expect(chart).toHaveCount(0);
});

test('copies and duplicates a sold property with independent records after reload', async ({ page }) => {
  await page.goto('/portfolios');
  await createPortfolio(page, 'Alternative');
  const target = await page.getByRole('link', { name: 'Alternative', exact: true }).getAttribute('href');
  await page.getByRole('link', { name: 'My Portfolio', exact: true }).click();
  await page.getByRole('link', { name: 'Add property' }).click();
  await expect(page).toHaveURL(/\/calculator\?portfolioId=1$/);
  await page.getByRole('radio', { name: 'Selling' }).click();
  await page.getByRole('textbox', { name: 'Property name' }).fill('Oak Street');
  await page.getByRole('spinbutton', { name: 'Estimated sale price' }).fill('200000');
  await page.getByRole('spinbutton', { name: 'Loan payoff' }).fill('205000');
  await page.getByRole('region', { name: 'Save to portfolio' }).getByRole('button', { name: 'Save property' }).click();
  await expect(page).toHaveURL(/\/calculator\?id=\d+$/);
  const original = new URL(page.url()).searchParams.get('id');
  await page.goto('/portfolio/1');
  await expect(page.getByRole('link', { name: 'Oak Street', exact: true })).toHaveAttribute('href', `/calculator?id=${original}`);

  await page.getByRole('button', { name: 'Copy Oak Street', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Copy property' });
  await dialog.getByRole('combobox', { name: 'Target portfolio' }).click();
  await page.getByRole('option', { name: 'Alternative' }).click();
  await dialog.getByRole('textbox', { name: 'New name (optional)' }).fill('Copied Oak Street');
  await dialog.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(page.getByText('Property copied.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Copied Oak Street' })).toBeHidden();
  await page.getByRole('button', { name: 'Duplicate Oak Street', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Oak Street (Copy)', exact: true })).toBeVisible();

  await page.goto(target!);
  await page.reload();
  const copy = page.getByRole('link', { name: 'Copied Oak Street', exact: true });
  await expect(copy).toBeVisible();
  await expect(copy).not.toHaveAttribute('href', `/calculator?id=${original}`);
  await expect(page.getByText('Signed net proceeds', { exact: true })).toBeVisible();
  await copy.click();
  await expect(page.getByRole('spinbutton', { name: 'Loan payoff' })).toHaveValue('205000');
});
