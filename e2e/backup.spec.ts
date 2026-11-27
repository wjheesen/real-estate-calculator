import { expect, test, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';

test.use({ viewport: { width: 375, height: 812 }, colorScheme: 'light', acceptDownloads: true });

const now = '2026-01-01T00:00:00.000Z';
const propertyHeader = 'id,portfolioId,name,description,createdAt,updatedAt,ownershipStatus,purchasePrice,existingLoanBalance,sellingCostsPercentage,rehabCosts,closingCosts,downPayment,usePercentageForDownPayment,financeRehabAndClosing,interestRate,termYears,paymentsPerYear,existingMonthlyPI,insuranceCost,propertyTaxes,mortgageInsurance,usePercentageForMortgageInsurance,monthlyHOA,monthlyUtilities,rentalIncomeMode,expectedRentalIncome,nightlyRate,occupancyRatePercentage,operatingExpenses,usePercentageForOpex,capitalExpenditures,usePercentageForCapex,appreciationRate,plannedHoldPeriodYears,scheduleEDeductibleAmount,rentalUsePercentage';
const budgetHeader = 'section,position,id,name,description,amount,grossIncome,useTwoWeekPayStub,anticipatedMortgageRate,anticipatedMortgageTermYears,createdAt,updatedAt';

async function fixtureBackup(dataset: 'A' | 'B'): Promise<Buffer> {
  const id = dataset === 'A' ? 7 : 77;
  const propertyId = dataset === 'A' ? 8 : 88;
  const theme = dataset === 'A' ? 'dark' : 'light';
  const price = dataset === 'A' ? 200000 : 300000;
  const zip = new JSZip();
  zip.file('metadata.json', JSON.stringify({
    schemaVersion: 2, appVersion: '0.0.0', exportedAt: now, includeCalculatedFigures: false,
  }));
  zip.file('portfolios.csv', `id,name,description,createdAt,updatedAt\r\n${id},Dataset ${dataset},,${now},${now}\r\n`);
  const values = [propertyId, id, `Sale ${dataset}`, '', now, now, 'selling', price, 205000, 6];
  zip.file('properties.csv', `${propertyHeader}\r\n${[...values, ...Array(27).fill('')].join(',')}\r\n`);
  zip.file('settings.csv', `interestRate,themeMode\r\n${dataset === 'A' ? 0 : 7},${theme}\r\n`);
  zip.file('budget.csv', [
    budgetHeader,
    `BASIC,,,,,,${dataset === 'A' ? 12000 : 24000},false,0,10,${now},${now}`,
    'MONTHLY_HOUSING_EXPENSES,0,2,Utilities,,75,,,,,,',
    'ANNUAL_HOUSING_EXPENSES,0,3,Tax,,1234,,,,,,',
    '',
  ].join('\r\n'));
  return Buffer.from(await zip.generateAsync({ type: 'uint8array' }));
}

async function importBytes(page: Page, buffer: Buffer) {
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  const chooserEvent = page.waitForEvent('filechooser');
  await page.getByRole('dialog', { name: 'Replace saved planner data?' })
    .getByRole('button', { name: 'Choose ZIP file' }).click();
  await (await chooserEvent).setFiles({ name: 'backup.zip', mimeType: 'application/zip', buffer });
}

async function downloadBackup(page: Page, figures = false) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const options = page.getByRole('dialog', { name: 'Export options' });
  const checkbox = options.getByRole('checkbox', { name: 'Include calculated figures' });
  await expect(checkbox).not.toBeChecked();
  if (figures) await checkbox.check();
  const downloadEvent = page.waitForEvent('download');
  await options.getByRole('button', { name: 'Export', exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/^real-estate-planner-\d{4}-\d{2}-\d{2}\.zip$/);
  return readFile((await download.path())!);
}

function allStores(page: Page) {
  return page.evaluate(() => new Promise<unknown[][]>((resolve, reject) => {
    const open = indexedDB.open('RealEstatePlannerDB', 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(['settings', 'budget', 'portfolios', 'properties']);
      const reads = ['settings', 'budget', 'portfolios', 'properties'].map((name) => tx.objectStore(name).getAll());
      tx.oncomplete = () => { db.close(); resolve(reads.map((request) => request.result)); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }));
}

test('exports real ZIP bytes and preserves all four stores and the active draft after a later-write abort', async ({ page }) => {
  await page.goto('/calculator');
  await importBytes(page, await fixtureBackup('A'));
  await expect(page.getByText('Backup restored.', { exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  const a = await allStores(page);

  const raw = await JSZip.loadAsync(await downloadBackup(page));
  expect(raw.file('portfolio_summaries.csv')).toBeNull();
  expect(await raw.file('budget.csv')!.async('string')).toContain('ANNUAL_HOUSING_EXPENSES,0,3,Tax,,1234');
  const spreadsheet = await JSZip.loadAsync(await downloadBackup(page, true));
  expect(spreadsheet.file('portfolio_summaries.csv')).not.toBeNull();
  expect(await spreadsheet.file('properties.csv')!.async('string')).toContain('calc_netProceedsFromSale');

  await page.goto('/calculator?id=8');
  const price = page.getByRole('spinbutton', { name: 'Estimated sale price' });
  await expect(price).toHaveValue('200000');
  await price.fill('190000');
  await page.evaluate(() => {
    document.documentElement.dataset['stayMounted'] = 'yes';
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

  const b = await fixtureBackup('B');
  await importBytes(page, b);
  await expect(page.getByRole('alert')).toContainText(/abort/i);
  await expect(page.getByText('Backup restored.', { exact: true })).toBeHidden();
  await expect(price).toHaveValue('190000');
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  expect(await allStores(page)).toEqual(a);
  await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeEnabled();

  await importBytes(page, b);
  await expect(page).toHaveURL(/\/calculator$/);
  await expect(page.getByRole('spinbutton', { name: 'Purchase price' })).toHaveValue('');
  await expect(page.locator('html')).toHaveAttribute('data-stay-mounted', 'yes');
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
  const state = await allStores(page);
  expect(state[2]).toEqual([expect.objectContaining({ id: 77, name: 'Dataset B' })]);
  expect(state[3]).toEqual([expect.objectContaining({ id: 88, portfolioId: 77 })]);

  await page.getByRole('navigation').getByRole('link', { name: 'Budget' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Gross income' })).toHaveValue('24000');
  await importBytes(page, b);
  await expect(page.getByText('Backup restored.', { exact: true })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Gross income' })).toHaveValue('24000');
  expect(await allStores(page)).toEqual(state);
});

test('releases controls after canceling confirmation, canceling the picker, or choosing a corrupt archive', async ({ page }) => {
  await page.goto('/portfolios');
  const start = page.getByRole('button', { name: 'Import', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Replace saved planner data?' });
  await start.click();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(start).toBeEnabled();

  await start.click();
  const pendingPicker = page.waitForEvent('filechooser');
  await dialog.getByRole('button', { name: 'Choose ZIP file' }).click();
  await pendingPicker;
  await page.locator('input[type=file]').dispatchEvent('cancel');
  await expect(start).toBeEnabled();
  await expect(dialog).toBeHidden();

  const before = await allStores(page);
  await importBytes(page, Buffer.from('invalid archive'));
  await expect(page.getByRole('alert')).toContainText('Invalid or corrupt archive');
  await expect(start).toBeEnabled();
  expect(await allStores(page)).toEqual(before);
  await expect(page.getByRole('link', { name: 'My Portfolio', exact: true })).toBeVisible();
});
