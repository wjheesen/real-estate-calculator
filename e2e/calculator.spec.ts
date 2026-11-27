import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

function field(page: Page, name: string) {
  return page.getByRole('spinbutton', { name, exact: true });
}

async function persistedProperties(page: Page) {
  return page.evaluate(() => new Promise<Record<string, unknown>[]>((resolve, reject) => {
    const open = indexedDB.open('RealEstatePlannerDB', 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('properties');
      const read = tx.objectStore('properties').getAll();
      tx.oncomplete = () => { db.close(); resolve(read.result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  }));
}

test('saves, reloads, discards, updates, and duplicates a property only on explicit save', async ({ page }) => {
  await page.goto('/calculator?portfolioId=1');
  const name = page.getByRole('textbox', { name: 'Property name' });
  const save = page.getByRole('region', { name: 'Save to portfolio' }).getByRole('button', { name: 'Save property' });
  const price = field(page, 'Purchase price');

  await expect(price).toHaveValue('');
  await expect(save).toBeDisabled();
  await price.fill('200000');
  await expect(page.getByText('Monthly cash flow', { exact: true })).toBeVisible();
  await expect(save).toBeDisabled();
  await name.fill('  Oak Street  ');
  await page.getByRole('radiogroup', { name: 'Down payment unit' }).getByRole('radio', { name: 'Dollars' }).click();
  await expect(field(page, 'Down payment')).toHaveValue('40000');
  expect(await persistedProperties(page)).toEqual([]);

  await save.click();
  await expect(page).toHaveURL(/\/calculator\?id=\d+$/);
  const savedUrl = page.url();
  const id = Number(new URL(savedUrl).searchParams.get('id'));
  await expect(page.getByText('Editing Oak Street')).toBeVisible();
  await page.reload();
  await expect(price).toHaveValue('200000');

  await price.fill('210000');
  expect((await persistedProperties(page))[0].purchasePrice).toBe(200000);
  await page.getByRole('region', { name: 'Save to portfolio' }).getByRole('button', { name: 'Discard', exact: true }).click();
  await expect(price).toHaveValue('200000');
  await price.fill('215000');
  await save.click();
  await expect(page.getByText('Property saved.')).toBeVisible();
  expect((await persistedProperties(page)).map((row) => [row.id, row.purchasePrice])).toEqual([[id, 215000]]);

  await page.goto(`/calculator?duplicate=${id}&name=Oak%20Street%20Alternative`);
  await expect(name).toHaveValue('Oak Street Alternative');
  await expect(price).toHaveValue('215000');
  expect((await persistedProperties(page)).length).toBe(1);
  await save.click();
  await expect(page).toHaveURL(/\/calculator\?id=\d+$/);
  expect(page.url()).not.toBe(savedUrl);
  expect((await persistedProperties(page)).length).toBe(2);

  await price.fill('230000');
  await page.getByRole('button', { name: 'New calculation', exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: 'Start a new calculation?' });
  await confirmation.getByRole('button', { name: 'Cancel' }).click();
  await expect(price).toHaveValue('230000');
  await page.getByRole('button', { name: 'New calculation', exact: true }).click();
  await confirmation.getByRole('button', { name: 'Start new calculation' }).click();
  await expect(page).toHaveURL(/\/calculator$/);
  await expect(price).toHaveValue('');
});

test('validates owned payment, retries an aborted save, and stores only the active sale fields', async ({ page }) => {
  await page.goto('/calculator?portfolioId=1');
  await page.getByRole('radio', { name: 'Already owned' }).click();
  await page.getByRole('textbox', { name: 'Property name' }).fill('Maple Avenue');
  await field(page, 'Current market value').fill('200000');
  await field(page, 'Existing loan balance').fill('12000');
  await field(page, 'Annual interest rate').fill('0');
  await field(page, 'Remaining term').fill('2');
  const payment = field(page, 'Monthly P&I (excluding escrow)');
  await expect(page.getByText('Estimated monthly P&I $500.00.')).toBeVisible();
  await payment.fill('750');
  await expect(page.getByText('Statement monthly P&I $750.00.')).toBeVisible();

  await field(page, 'Existing loan balance').fill('120000');
  await field(page, 'Annual interest rate').fill('6');
  await field(page, 'Remaining term').fill('30');
  await payment.fill('600');
  const save = page.getByRole('region', { name: 'Save to portfolio' }).getByRole('button', { name: 'Save property' });
  await expect(save).toBeDisabled();
  await expect(page.getByText('Enter a monthly P&I payment above the first month’s interest, or leave it blank to estimate.'))
    .toBeVisible();
  await expect(page.locator('app-kpi-strip')).toBeHidden();
  await payment.fill('600.01');
  await expect(save).toBeEnabled();
  await payment.fill('');
  await expect(page.getByText('Estimated monthly P&I $719.46.')).toBeVisible();
  await payment.fill('600.01');

  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (...args) {
      const request = original.apply(this, args);
      if (this.name === 'properties') {
        IDBObjectStore.prototype.add = original;
        request.addEventListener('success', () => this.transaction.abort());
      }
      return request;
    };
  });
  await save.click();
  await expect(page.getByRole('alert')).toContainText('Your draft is still here');
  expect(await persistedProperties(page)).toEqual([]);
  await expect(payment).toHaveValue('600.01');
  await save.click();
  await expect(page).toHaveURL(/\/calculator\?id=\d+$/);
  await expect(payment).toHaveValue('600.01');
  const [owned] = await persistedProperties(page);
  expect(owned).toMatchObject({ ownershipStatus: 'already_owned', existingMonthlyPI: 600.01, monthlyUtilities: 0 });
  expect(owned).not.toHaveProperty('downPayment');

  await page.getByRole('radio', { name: 'Selling' }).click();
  await field(page, 'Estimated sale price').fill('200000');
  await field(page, 'Loan payoff').fill('205000');
  await expect(page.getByText('Sale shortfall')).toBeVisible();
  await expect(page.locator('app-kpi-strip').getByText('-$17,000.00', { exact: true })).toHaveCount(2);
  await save.click();
  await expect(page.getByText('Property saved.')).toBeVisible();
  const [sale] = await persistedProperties(page);
  expect(sale).toMatchObject({ id: owned.id, ownershipStatus: 'selling', purchasePrice: 200000 });
  expect(sale).not.toHaveProperty('existingMonthlyPI');
  expect(sale).not.toHaveProperty('monthlyUtilities');
});

test('previews STR income, handles the PMI cutoff, and rejects ambiguous query parameters', async ({ page }) => {
  await page.goto('/calculator?id=1&duplicate=1');
  await expect(page.getByText('Choose either a saved property or a property to duplicate.')).toBeVisible();
  await field(page, 'Purchase price').fill('200000');
  const pmi = field(page, 'Mortgage insurance');
  await expect(pmi).toBeDisabled();
  await field(page, 'Down payment').fill('19.9');
  await expect(pmi).toBeEnabled();
  await page.getByRole('radio', { name: 'Short-term' }).click();
  await field(page, 'Nightly rate').fill('120');
  await field(page, 'Occupancy').fill('50');
  await expect(page.getByText('Estimated monthly rent $1,825.00.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);

  await page.getByRole('button', { name: 'New portfolio' }).click();
  const dialog = page.getByRole('dialog', { name: 'New portfolio' });
  await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill('Rentals');
  await dialog.getByRole('button', { name: 'Create portfolio' }).click();
  await expect(page.getByRole('combobox', { name: 'Portfolio' })).toHaveText('Rentals');
  expect(await persistedProperties(page)).toEqual([]);
});
