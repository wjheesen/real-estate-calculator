import { expect, test, type Page } from '@playwright/test';

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
