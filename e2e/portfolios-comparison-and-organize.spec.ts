import { expect, test, type Page } from '@playwright/test';

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

test.describe('desktop organizer', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  async function field(page: Page, name: string, value: string) {
    await page.getByRole('spinbutton', { name, exact: true }).fill(value);
  }

  test('moves a stable ID after retry and changes only capital totals for a sale', async ({ page }) => {
    await page.goto('/budget');
    await field(page, 'Gross income', '12000');
    await expect(page.getByText('Budget saved.')).toBeVisible();
    await page.goto('/portfolios');
    await page.getByRole('button', { name: 'New portfolio' }).click();
    const dialog = page.getByRole('dialog', { name: 'New portfolio' });
    await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill('Alternative');
    await dialog.getByRole('button', { name: 'Create portfolio' }).click();
    await expect(page.getByText('Portfolio created.')).toBeVisible();

    const save = page.getByRole('region', { name: 'Save to portfolio' })
      .getByRole('button', { name: 'Save property' });
    await page.goto('/calculator?portfolioId=1');
    await page.getByRole('radio', { name: 'Already owned' }).click();
    await page.getByRole('textbox', { name: 'Property name' }).fill('Rental');
    await field(page, 'Current market value', '200000');
    await field(page, 'Monthly rent', '250');
    await field(page, 'Operating expenses (excluding HOA and owner-paid utilities)', '0');
    await field(page, 'Capital expenditures', '0');
    await save.click();
    await expect(page).toHaveURL(/\/calculator\?id=\d+$/);
    const rentalHref = new URL(page.url()).pathname + new URL(page.url()).search;

    await page.goto('/calculator?portfolioId=1');
    await page.getByRole('radio', { name: 'Selling' }).click();
    await page.getByRole('textbox', { name: 'Property name' }).fill('Underwater sale');
    await field(page, 'Estimated sale price', '200000');
    await field(page, 'Loan payoff', '205000');
    await save.click();
    await expect(page).toHaveURL(/\/calculator\?id=\d+$/);

    await page.goto('/portfolio/1');
    await page.getByRole('link', { name: 'Organize properties' }).click();
    await expect(page).toHaveURL(/\/portfolios\/organize\?from=1$/);
    const source = page.getByRole('region', { name: 'My Portfolio', exact: true });
    const target = page.getByRole('region', { name: 'Alternative', exact: true });
    await expect(source).toContainText('Cash flow +$250.00 / month');
    await expect(source).toContainText('Budget Fit +$1,250.00 / month');
    await expect(target).toContainText('0 properties');

    await page.evaluate(() => {
      const original = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        const request = original.apply(this, args);
        if (this.name === 'properties') {
          IDBObjectStore.prototype.put = original;
          request.addEventListener('success', () => this.transaction.abort());
        }
        return request;
      };
    });
    await source.getByRole('button', { name: 'Move Rental' }).press('Enter');
    await page.getByRole('menuitem', { name: 'Alternative' }).press('Enter');
    await expect(page.getByRole('alert')).toContainText('Could not move the property');
    await expect(source.getByRole('link', { name: 'Rental', exact: true })).toHaveAttribute('href', rentalHref);
    await expect(target).toContainText('0 properties');

    await page.getByRole('button', { name: 'Retry move' }).click();
    await expect(target.getByRole('link', { name: 'Rental', exact: true })).toHaveAttribute('href', rentalHref);
    await expect(source).toContainText('Budget Fit +$1,000.00 / month');
    await expect(target).toContainText('Budget Fit +$1,250.00 / month');
    await expect(target).toContainText('1 property');

    await source.getByRole('button', { name: 'Move Underwater sale' }).click();
    await page.getByRole('menuitem', { name: 'Alternative' }).click();
    await expect(target).toContainText('-$17,000.00 net sale proceeds');
    await expect(target).toContainText('Cash flow +$250.00 / month');
    await page.reload();
    await expect(target.getByRole('link', { name: 'Rental', exact: true })).toHaveAttribute('href', rentalHref);
    await expect(target).toContainText('2 properties');
    await page.getByRole('link', { name: 'Back to portfolios' }).click();
    await expect(page).toHaveURL(/\/portfolio\/1$/);
  });
});

test.describe('competing homeowner scenarios', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  async function addProperty(
    page: Page,
    portfolioId: number,
    name: string,
    mode: 'To be purchased' | 'Already owned' | 'Selling',
    fields: Record<string, string>,
  ) {
    await page.goto(`/calculator?portfolioId=${portfolioId}`);
    await page.getByRole('radio', { name: mode, exact: true }).click();
    await page.getByRole('textbox', { name: 'Property name' }).fill(name);
    for (const [label, value] of Object.entries(fields)) {
      await page.getByRole('spinbutton', { name: label, exact: true }).fill(value);
    }
    await page.getByRole('region', { name: 'Save to portfolio' }).getByRole('button', { name: 'Save property' }).click();
    await expect(page).toHaveURL(/\/calculator\?id=\d+$/);
    const url = new URL(page.url());
    return url.pathname + url.search;
  }

  test('compares keep-and-rent with sell-and-buy and physically drags an existing property', async ({ page }) => {
    await page.goto('/portfolios');
    await expect(page.getByRole('link', { name: 'Set Budget' })).toBeVisible();
    await page.getByRole('button', { name: 'Rename My Portfolio' }).click();
    const rename = page.getByRole('dialog', { name: 'Rename portfolio' });
    await rename.getByRole('textbox', { name: 'Name', exact: true }).fill('Keep and rent');
    await rename.getByRole('button', { name: 'Save name' }).click();
    await createPortfolio(page, 'Sell and buy');
    await createPortfolio(page, 'Empty landing');
    const salePortfolio = (await page.getByRole('link', { name: 'Sell and buy', exact: true }).getAttribute('href'))!;
    const sellId = Number(salePortfolio.split('/').at(-1));

    await addProperty(page, sellId, 'Cash acquisition', 'To be purchased', { 'Purchase price': '40000', 'Down payment': '100' });
    await addProperty(page, sellId, 'Underwater sale', 'Selling', {
      'Estimated sale price': '200000', 'Loan payoff': '205000',
    });
    const rental = await addProperty(page, 1, 'Retained rental', 'Already owned', {
      'Current market value': '200000', 'Monthly rent': '250',
      'Operating expenses (excluding HOA and owner-paid utilities)': '0', 'Capital expenditures': '0',
    });
    await page.goto('/portfolios');
    const selling = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Sell and buy', exact: true }) });
    await expect(selling).toContainText('+$57,000.00');
    await expect(selling.getByText('$0.00', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Keep and rent', exact: true }).click();
    await page.getByRole('combobox', { name: 'Compare with' }).click();
    await page.getByRole('option', { name: 'Sell and buy' }).click();
    await expect(page.getByRole('row', { name: /Net cash required/ }).getByRole('cell').last())
      .toContainText('+$57,000.00');
    await expect(page.getByRole('row', { name: /Monthly cash flow/ }).getByRole('cell').last())
      .toContainText('-$250.00');
    await expect(page.getByRole('rowheader', { name: /Monthly cash flow/ })).toContainText('$/month');

    await page.getByRole('navigation').getByRole('link', { name: 'Budget' }).click();
    await page.getByRole('spinbutton', { name: 'Gross income' }).fill('18000');
    await expect(page.getByText('Budget saved.')).toBeVisible();
    await page.getByRole('navigation').getByRole('link', { name: 'Portfolios' }).click();
    await page.getByRole('link', { name: 'Organize properties' }).click();
    const source = page.getByRole('list', { name: 'Properties in Keep and rent', exact: true });
    const target = page.getByRole('list', { name: 'Properties in Empty landing', exact: true });
    const sourceRegion = page.getByRole('region', { name: 'Keep and rent', exact: true });
    const targetRegion = page.getByRole('region', { name: 'Empty landing', exact: true });
    const handle = source.getByRole('listitem').filter({ hasText: 'Retained rental' }).locator('.handle');
    await expect(target).toContainText('Drop a property here.');
    await handle.scrollIntoViewIfNeeded();
    const origin = (await handle.boundingBox())!;
    const destination = (await target.boundingBox())!;
    const from = { x: origin.x + origin.width / 2, y: origin.y + origin.height / 2 };
    const to = { x: destination.x + destination.width / 2, y: destination.y + destination.height / 2 };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 14, from.y + 2, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 18 });
    await page.mouse.move(to.x + 4, to.y + 2, { steps: 3 });
    await page.mouse.up();
    await expect(target.getByRole('link', { name: 'Retained rental' })).toHaveAttribute('href', rental);
    await expect(sourceRegion).toContainText('0 properties');
    await expect(sourceRegion).toContainText('Budget Fit +$1,500.00 / month');
    await expect(targetRegion).toContainText('1 property');
    await expect(targetRegion).toContainText('Budget Fit +$1,750.00 / month');
    await page.reload();
    await expect(target.getByRole('link', { name: 'Retained rental' })).toHaveAttribute('href', rental);

    const movedPortfolio = (await targetRegion.getByRole('link', { name: 'Empty landing', exact: true }).getAttribute('href'))!;
    await page.goto(salePortfolio);
    await page.getByRole('button', { name: 'Duplicate portfolio' }).click();
    await expect(page.getByRole('heading', { name: 'Sell and buy (Copy)', exact: true })).toBeVisible();
    const copyPortfolio = new URL(page.url()).pathname;
    await page.goto(movedPortfolio);
    await page.getByRole('button', { name: 'Copy Retained rental' }).click();
    const dialog = page.getByRole('dialog', { name: 'Copy property' });
    await dialog.getByRole('combobox', { name: 'Target portfolio' }).click();
    await page.getByRole('option', { name: 'Sell and buy (Copy)', exact: true }).click();
    await dialog.getByRole('textbox', { name: 'New name (optional)' }).fill('Rental variation');
    await dialog.getByRole('button', { name: 'Copy', exact: true }).click();
    await expect(page.getByText('Property copied.', { exact: true })).toBeVisible();
    await page.goto(copyPortfolio);
    await page.getByRole('link', { name: 'Rental variation', exact: true }).click();
    await page.getByRole('spinbutton', { name: 'Monthly rent' }).fill('400');
    await page.getByRole('region', { name: 'Save to portfolio' }).getByRole('button', { name: 'Save property' }).click();
    await expect(page.getByText('Property saved.', { exact: true })).toBeVisible();
    await page.goto(rental);
    await expect(page.getByRole('spinbutton', { name: 'Monthly rent' })).toHaveValue('250');
  });
});
