import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 }, colorScheme: 'light' });

function input(page: Page, name: string) {
  return page.getByRole('spinbutton', { name, exact: true });
}

test('shows saved and draft impact without changing the portfolio until Save commits', async ({ page, context }) => {
  await page.goto('/calculator?portfolioId=1');
  await page.getByRole('radio', { name: 'Already owned' }).click();
  await input(page, 'Current market value').fill('200000');
  await page.getByRole('textbox', { name: 'Property name' }).fill('Baseline rental');
  await input(page, 'Monthly rent').fill('1000');
  await input(page, 'Home insurance').fill('14400');
  await input(page, 'Operating expenses (excluding HOA and owner-paid utilities)').fill('0');
  await input(page, 'Capital expenditures').fill('0');

  const bar = page.getByRole('complementary', { name: 'Portfolio impact' });
  await expect(bar).toBeHidden();
  await page.getByRole('region', { name: 'Save to portfolio' }).getByRole('button', { name: 'Save property' }).click();
  await expect(page).toHaveURL(/\/calculator\?id=\d+$/);
  const savedUrl = page.url();
  await expect(bar.getByRole('link', { name: 'Set Budget' })).toBeVisible();

  await bar.getByRole('link', { name: 'Set Budget' }).click();
  await input(page, 'Gross income').fill('18000');
  await expect(page.getByText('Budget saved.')).toBeVisible();
  await page.goto(savedUrl);
  await expect(bar).toBeInViewport();
  await expect(bar.getByRole('row', { name: /Monthly cash flow/ }).getByRole('cell'))
    .toHaveText(['-$200.00', '-$200.00', '$0.00']);

  const rent = input(page, 'Monthly rent');
  await rent.fill('1100');
  const cf = bar.getByRole('row', { name: /Monthly cash flow/ }).getByRole('cell');
  const fit = bar.getByRole('row', { name: /Monthly Budget Fit/ }).getByRole('cell');
  await expect(cf).toHaveText(['-$200.00', '-$100.00', '+$100.00']);
  await expect(fit).toHaveText(['+$1,300.00', '+$1,400.00', '+$100.00']);

  const grid = await context.newPage();
  await grid.goto('/portfolios');
  await expect(grid.getByText('-$200.00', { exact: true })).toBeVisible();
  await expect(grid.getByText('+$1,300.00 / month · Surplus')).toBeVisible();

  await rent.fill('-1');
  await expect(bar.getByText('Preview incomplete')).toBeVisible();
  await expect(cf).toHaveText(['-$200.00', '—', '—']);
  await bar.getByRole('button', { name: 'Discard' }).click();
  await expect(rent).toHaveValue('1000');
  await expect(cf).toHaveText(['-$200.00', '-$200.00', '$0.00']);

  await rent.fill('1100');
  await bar.getByRole('button', { name: 'Save property' }).click();
  await expect(cf).toHaveText(['-$100.00', '-$100.00', '$0.00']);
  await expect(fit).toHaveText(['+$1,400.00', '+$1,400.00', '$0.00']);
  await grid.reload();
  await expect(grid.getByText('-$100.00', { exact: true })).toBeVisible();
  await grid.close();
});

test('shows labeled results charts, the Schedule E fixture, and the immediate-sale breakdown', async ({ page }) => {
  await page.goto('/calculator');
  const tab = (name: string) => page.getByRole('tab', { name, exact: true });
  for (const [label, value] of [
    ['Purchase price', '125000'], ['Annual interest rate', '6'],
    ['Monthly rent', '1000'], ['Home insurance', '600'], ['Property taxes', '1800'],
    ['HOA', '40'], ['Owner-paid utilities', '60'], ['Planned hold period', '5'],
    ['Building-only depreciable basis', '110000'], ['Rental use', '50'],
  ]) await input(page, label).fill(value);

  await page.getByRole('radiogroup', { name: 'Capital expenditures unit' })
    .getByRole('radio', { name: 'Dollars' }).click();
  await input(page, 'Capital expenditures').fill('200');
  await tab('Tax').click();
  await expect(page.getByRole('heading', { name: 'Schedule E estimate' })).toBeVisible();
  await expect(page.getByText('$4,616.70', { exact: true })).toBeVisible();

  await tab('Results').click();
  const charts = page.locator('app-cartesian-chart canvas');
  await expect(charts).toHaveCount(2);
  await expect(charts.first()).toBeVisible();
  await page.getByText('Yearly equity values', { exact: true }).click();
  await expect(page.getByRole('rowheader', { name: '0', exact: true })).toBeVisible();
  await expect(page.getByRole('rowheader', { name: '5', exact: true })).toBeVisible();
  const lightChart = await charts.first().evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  await page.getByRole('button', { name: 'Dark mode' }).click();
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await expect(charts.first()).toBeVisible();
  await expect.poll(() => charts.first().evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL()))
    .not.toBe(lightChart);

  await tab('Inputs').click();
  await page.getByRole('radio', { name: 'Selling' }).click();
  await input(page, 'Estimated sale price').fill('200000');
  await input(page, 'Loan payoff').fill('205000');
  await tab('Results').click();
  await expect(page.getByRole('heading', { name: 'Sale breakdown' })).toBeVisible();
  await expect(charts).toHaveCount(0);
  await tab('Tax').click();
  await expect(page.getByText('Schedule E estimates apply to operating properties.', { exact: false })).toBeVisible();
});
