import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

async function addItem(page: Page, title: string, name: string, amount: number) {
  const list = page.getByRole('region', { name: title, exact: true });
  await list.getByRole('textbox', { name: 'Name' }).fill(name);
  await list.getByRole('spinbutton', { name: 'Amount' }).fill(String(amount));
  await list.getByRole('button', { name: 'Add', exact: true }).click();
}

test('updates the benchmark and restores all five ordered lists on reload', async ({ page }) => {
  await page.goto('/budget');
  const tab = (name: string) => page.getByRole('tab', { name, exact: true });
  const summary = page.locator('app-kpi-strip');
  const clear = page.getByRole('button', { name: 'Clear budget', exact: true });
  await expect(page.getByText('No budget has been set up.')).toBeVisible();
  await page.getByRole('radio', { name: 'Biweekly' }).click();
  await page.getByRole('spinbutton', { name: 'Gross income' }).fill('3000');
  await addItem(page, 'Pay deductions', 'Income taxes', 600);
  await addItem(page, 'Pay deductions', 'Zero item', 0);
  await expect(page.locator('app-doughnut-chart canvas')).toBeVisible();
  const deductions = page.getByRole('region', { name: 'Pay deductions' });
  await deductions.getByRole('button', { name: 'Move Income taxes down' }).click();

  await tab('Non-housing living expenses').click();
  await addItem(page, 'Monthly living expenses', 'Groceries', 1000);
  await addItem(page, 'Annual living expenses', 'Car insurance', 2400);
  await tab('Single-home benchmark').click();
  await addItem(page, 'Monthly benchmark costs', 'Utilities', 300);
  await addItem(page, 'Annual benchmark costs', 'Property taxes', 2400);
  await page.getByRole('spinbutton', { name: 'Mortgage rate' }).fill('0');
  await page.getByRole('spinbutton', { name: 'Mortgage term' }).fill('10');
  await expect(page.getByText('Budget saved.')).toBeVisible();
  for (const value of ['$5,200.00', '$1,200.00', '$4,000.00', '$420,000.00', '$3,500.00 / month at 0% over 10 years']) {
    await expect(summary.getByText(value, { exact: true })).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);

  await clear.click();
  const confirm = page.getByRole('dialog', { name: 'Clear budget?' });
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(summary.getByText('$420,000.00')).toBeVisible();
  await page.reload();
  await expect(deductions.getByRole('listitem').nth(0)).toContainText('Zero item');
  await expect(deductions.getByRole('listitem').nth(1)).toContainText('Income taxes');
  await tab('Non-housing living expenses').click();
  await expect(page.getByText('Groceries', { exact: true })).toBeVisible();
  await expect(page.getByText('Car insurance', { exact: true })).toBeVisible();
  await tab('Single-home benchmark').click();
  await expect(page.getByText('Utilities', { exact: true })).toBeVisible();
  await expect(page.getByText('Property taxes', { exact: true })).toBeVisible();
  await expect(summary.getByText('$420,000.00')).toBeVisible();

  await clear.click();
  await confirm.getByRole('button', { name: 'Clear budget' }).click();
  await expect(page.getByText('No budget has been set up.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('No budget has been set up.')).toBeVisible();
});

test('retains budget edits after an aborted write and supports a configured zero', async ({ page }) => {
  await page.goto('/budget');
  await page.getByRole('button', { name: 'Save budget', exact: true }).click();
  await expect(page.getByText('Budget saved.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Budget saved.')).toBeVisible();
  const income = page.getByRole('spinbutton', { name: 'Gross income' });
  await expect(income).toHaveValue('0');
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      const request = original.apply(this, args);
      if (this.name === 'budget') {
        IDBObjectStore.prototype.put = original;
        request.addEventListener('success', () => this.transaction.abort());
      }
      return request;
    };
  });
  await income.fill('12000');
  await expect(page.getByRole('alert')).toHaveText('Budget changes are unsaved. Try saving again.');
  await expect(income).toHaveValue('12000');
  await page.getByRole('button', { name: 'Save budget', exact: true }).click();
  await expect(page.getByText('Budget saved.')).toBeVisible();
  await income.fill('-1');
  await expect(page.getByText('Fix the highlighted inputs to save.')).toBeVisible();
  await page.reload();
  await expect(income).toHaveValue('12000');
});
