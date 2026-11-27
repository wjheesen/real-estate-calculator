import { expect, test } from '@playwright/test';

test.use({ colorScheme: 'light', viewport: { width: 375, height: 812 } });

test('navigates the shell and restores the theme and seed after reload', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/calculator$/);
  await expect(page.getByRole('heading', { name: 'Calculator', exact: true })).toBeVisible();

  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  const theme = page.locator('html');
  const toggle = page.getByRole('button', { name: 'Dark mode' });
  await expect(theme).toHaveCSS('color-scheme', 'light');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(nav.getByRole('link', { name: 'Calculator' })).toHaveAttribute('aria-current', 'page');

  await nav.getByRole('link', { name: 'Budget' }).click();
  await expect(page).toHaveURL(/\/budget$/);
  await expect(page.getByRole('heading', { name: 'Budget', exact: true })).toBeVisible();
  await expect(page.getByText('No budget has been set up.')).toBeVisible();

  await nav.getByRole('link', { name: 'Portfolios' }).click();
  await expect(page).toHaveURL(/\/portfolios$/);
  await expect(page.getByRole('heading', { name: 'Portfolios' })).toBeVisible();
  const portfolios = page.getByRole('list', { name: 'Saved portfolios' });
  const seed = portfolios.getByRole('link', { name: 'My Portfolio' });
  await expect(portfolios.getByRole('listitem')).toHaveCount(1);
  await expect(seed).toHaveAttribute('href', '/portfolio/1');

  await toggle.click();
  await expect(theme).toHaveCSS('color-scheme', 'dark');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle).toBeEnabled();

  await page.reload();
  await expect(theme).toHaveCSS('color-scheme', 'dark');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(nav.getByRole('link', { name: 'Portfolios' })).toHaveAttribute('aria-current', 'page');
  await expect(portfolios.getByRole('listitem')).toHaveCount(1);
  await seed.click();
  await expect(page).toHaveURL(/\/portfolio\/1$/);
  await expect(page.getByRole('heading', { name: 'My Portfolio' })).toBeVisible();

  for (const width of [375, 768]) {
    await page.setViewportSize({ width, height: 812 });
    for (const label of ['Settings', 'Import', 'Export']) {
      const control = page.getByRole('button', { name: label });
      await expect(control).toBeDisabled();
      await expect(control).toBeInViewport();
    }
    await expect(toggle).toBeInViewport();
    for (const link of await nav.getByRole('link').all()) {
      await expect(link).toBeInViewport();
    }
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBe(width);
  }
});

test('redirects legacy budget URLs', async ({ page }) => {
  for (const route of ['budget-income', 'budget-expenses', 'budget-mortgage']) {
    await page.goto('/' + route);
    await expect(page).toHaveURL(/\/budget$/);
    await expect(page.getByRole('heading', { name: 'Budget', exact: true })).toBeVisible();
  }
});
