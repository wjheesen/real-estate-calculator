import { devices, expect, test, type Locator, type Page } from '@playwright/test';

const { defaultBrowserType, ...iphone } = devices['iPhone 13'];
test.use({ ...iphone, viewport: { width: 375, height: 480 } });

async function fieldPosition(field: Locator) {
  return field.evaluate(async (el) => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return {
      top: el.getBoundingClientRect().top - (window.visualViewport?.offsetTop ?? 0),
      scrollY: window.scrollY,
    };
  });
}

async function tapField(field: Locator) {
  await field.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await field.tap();
  await expect(field).toBeFocused();
  await expect(field).toBeInViewport();
  return fieldPosition(field);
}

async function pressAndCheck(page: Page, field: Locator, key: string, initial: { top: number; scrollY: number }) {
  await page.keyboard.press(key);
  const position = await fieldPosition(field);
  await expect(field).toBeFocused();
  expect(Math.abs(position.top - initial.top), `field movement after ${key}`).toBeLessThanOrEqual(2);
  expect(Math.abs(position.scrollY - initial.scrollY), `scroll after ${key}`).toBeLessThanOrEqual(2);
}

test('keeps calculator fields in place as the live preview appears and disappears', async ({ page }) => {
  await page.goto('/calculator');
  const price = page.getByRole('spinbutton', { name: 'Purchase price', exact: true });
  const cashFlow = page.getByText('Monthly cash flow', { exact: true });
  const start = await tapField(price);
  for (const key of ['2', '0', '0']) await pressAndCheck(page, price, key, start);
  await expect(price).toHaveValue('200');
  await expect(cashFlow).toBeVisible();
  for (let i = 0; i < 3; i++) await pressAndCheck(page, price, 'Backspace', start);
  await expect(cashFlow).toBeHidden();

  await price.fill('200000');
  await page.getByRole('radio', { name: 'Short-term' }).tap();
  const rentalUse = page.getByRole('spinbutton', { name: 'Rental use', exact: true });
  const rentalStart = await tapField(rentalUse);
  await rentalUse.press('ControlOrMeta+a');
  await pressAndCheck(page, rentalUse, 'Backspace', rentalStart);
  await expect(cashFlow).toBeHidden();
  await pressAndCheck(page, rentalUse, '5', rentalStart);
  await expect(cashFlow).toBeVisible();
});

test('keeps budget income in place through autosave and live benchmark updates', async ({ page }) => {
  await page.goto('/budget');
  const income = page.getByRole('spinbutton', { name: 'Gross income' });
  const start = await tapField(income);
  await income.press('ControlOrMeta+a');
  for (const key of '120000') await pressAndCheck(page, income, key, start);
  await expect(income).toHaveValue('120000');
  await expect(page.getByText('Budget saved.')).toBeVisible();
  await expect(page.locator('app-kpi-strip').getByText('$10,000.00', { exact: true }).first()).toBeVisible();
  expect(Math.abs((await fieldPosition(income)).top - start.top)).toBeLessThanOrEqual(2);
});
