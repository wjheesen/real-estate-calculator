import { expect, test } from '@playwright/test';

test.use({ colorScheme: 'light', viewport: { width: 375, height: 812 } });

test('saves settings and the theme, discards canceled edits, and resets after confirmation', async ({ page }) => {
  await page.goto('/');
  const openSettings = page.getByRole('button', { name: 'Settings', exact: true });
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  const interest = settings.getByRole('spinbutton', { name: 'Interest rate', exact: true });
  const save = settings.getByRole('button', { name: 'Save', exact: true });
  const root = page.locator('html');

  await openSettings.click();
  await expect(interest).toHaveValue('6.5');
  await interest.fill('101');
  await interest.blur();
  await expect(save).toBeDisabled();
  await expect(settings.getByText('Enter a number from 0 to 100.')).toBeVisible();
  await interest.fill('7');
  await settings.getByRole('combobox', { name: 'Appearance' }).click();
  await page.getByRole('option', { name: 'Dark', exact: true }).click();
  await expect(root).toHaveCSS('color-scheme', 'light');

  await save.click();
  await expect(settings).toBeHidden();
  await expect(root).toHaveCSS('color-scheme', 'dark');
  await page.reload();
  await expect(root).toHaveCSS('color-scheme', 'dark');
  await openSettings.click();
  await expect(interest).toHaveValue('7');
  await expect(settings.getByRole('combobox', { name: 'Appearance' })).toHaveText('Dark');
  await interest.fill('8');
  await settings.getByRole('button', { name: 'Cancel', exact: true }).click();
  await openSettings.click();
  await expect(interest).toHaveValue('7');

  const reset = settings.getByRole('button', { name: 'Reset to defaults' });
  const confirmation = page.getByRole('dialog', { name: 'Reset settings?' });
  await reset.click();
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(interest).toHaveValue('7');
  await reset.click();
  await confirmation.getByRole('button', { name: 'Reset settings', exact: true }).click();
  await expect(settings).toBeHidden();
  await expect(root).toHaveCSS('color-scheme', 'light');
  await openSettings.click();
  await expect(interest).toHaveValue('6.5');
  await expect(settings.getByRole('combobox', { name: 'Appearance' })).toHaveText('System');
});
