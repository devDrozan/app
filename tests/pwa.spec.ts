import { test, expect } from '@playwright/test';
test.use({ baseURL: 'http://127.0.0.1:4173' });
test('production PWA caches guides and assets without financial responses', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.getByRole('button', { name: 'Try an example' }).click();
  await page.getByRole('button', { name: 'Review my details' }).click();
  await page.getByRole('button', { name: 'Calculate my estimate' }).click();
  await expect(page.getByText('7,868,433', { exact: false }).filter({ visible: true }).first()).toBeVisible();
  const cachedUrls = await page.evaluate(async () => {
    const entries = await Promise.all((await caches.keys()).map(async name => (await (await caches.open(name)).keys()).map(request => request.url)));
    return entries.flat();
  });
  expect(cachedUrls.length).toBeGreaterThan(0);
  expect(cachedUrls.some(url => /\/(api|v1)\//.test(url))).toBe(false);
  await context.setOffline(true);
  await page.getByRole('button', { name: 'How it works', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Understand your retirement pay' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Know what you’ve earned.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue to wages' })).toBeDisabled();
  await context.setOffline(false);
});
test('salary requests stay out of PWA caches and local records survive offline reload', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.getByRole('button', { name: 'Salary Estimate from Work Time', exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole('button', { name: 'Save month', exact: true })).toBeEnabled();
  await page.locator('[id="salary-settings.basicSalary"]').fill('23456');
  await page.getByLabel('I understand and want to save these records on this device.').check();
  await page.getByRole('button', { name: 'Save month', exact: true }).click();
  await expect(page.getByText('Month saved on this device.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Calculate monthly estimate' }).click();
  await expect(page.locator('.salary-amount')).toHaveText('₩23,456');
  const financialCaches = await page.evaluate(async () => {
    const entries = await Promise.all((await caches.keys()).map(async name => (await (await caches.open(name)).keys()).map(request => request.url)));
    return entries.flat().filter(url => /\/(api|v1)\//.test(url));
  });
  expect(financialCaches).toEqual([]);
  await context.setOffline(true); await page.reload();
  await page.getByRole('button', { name: 'Salary Estimate from Work Time', exact: true }).filter({ visible: true }).click();
  await expect(page.locator('[id="salary-settings.basicSalary"]')).toHaveValue('23456');
  await expect(page.locator('.salary-amount')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Calculate monthly estimate' })).toBeDisabled();
  await context.setOffline(false);
});
