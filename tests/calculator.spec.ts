import { test, expect } from '@playwright/test';
test('calculates the reference example through review and result', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'desktop') await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  if (testInfo.project.name === 'desktop') {
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: testInfo.outputPath('landing.png'), fullPage: true, animations: 'disabled' });
  }
  await page.getByRole('button', { name: 'Try an example' }).click();
  await expect(page.getByRole('heading', { name: 'A closer look at your wages' })).toBeVisible();
  await page.getByRole('button', { name: 'Review my details' }).click();
  await page.getByRole('button', { name: 'Calculate my estimate' }).click();
  await expect(page.getByText('7,868,433', { exact: false }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText('Provisional estimate').filter({ visible: true }).first()).toBeVisible();
  if (testInfo.project.name === 'desktop') {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath('result.png'), animations: 'disabled' });
  }
});
test('retains wage entries when the API is unavailable and can retry', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try an example' }).click();
  await page.getByRole('button', { name: 'Review my details' }).click();
  await page.route('**/v1/calculations', route => route.abort());
  await page.getByRole('button', { name: 'Calculate my estimate' }).click();
  await expect(page.getByRole('alert')).toContainText('Your entries are still here');
  await page.unroute('**/v1/calculations');
  await page.getByRole('button', { name: 'Calculate my estimate' }).click();
  await expect(page.getByText('7,868,433', { exact: false }).filter({ visible: true }).first()).toBeVisible();
});
test('switches all result screens to Burmese and saves only language', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'မြန်မာ', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'သင်ရရှိသင့်သည့်ငွေကို သိရှိပါ။' })).toBeVisible();
  await page.getByRole('button', { name: 'နမူနာဖြင့် စမ်းကြည့်ရန်' }).click();
  await page.getByRole('button', { name: 'အချက်အလက်ပြန်စစ်ရန်' }).click();
  await page.getByRole('button', { name: 'ခန့်မှန်းငွေတွက်ရန်' }).click();
  await expect(page.getByText('ယာယီခန့်မှန်းချက်').filter({ visible: true }).first()).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['e9-language']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('DB uses the higher ordinary daily wage', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'DB Defined benefit pension', exact: true }).click();
  await page.getByRole('button', { name: 'Try an example' }).click();
  await page.locator('#ordinary').fill('100000');
  await page.getByRole('button', { name: 'Review my details' }).click();
  await page.getByRole('button', { name: 'Calculate my estimate' }).click();
  await expect(page.getByText('8,876,712', { exact: false }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText('This is a DB statutory baseline; your employer’s plan may provide more.')).toBeVisible();
});

test('DC separates required contributions from a reported balance', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'DC Defined contribution pension', exact: true }).click();
  await page.getByLabel('First working day', { exact: true }).fill('2024-07-01');
  await page.getByLabel('Last working day', { exact: true }).fill('2025-12-31');
  await page.getByRole('button', { name: 'Continue to wages' }).click();
  await page.locator('#year-2024').fill('18000000');
  await page.locator('#year-2025').fill('36000000');
  await page.locator('#balance').fill('4000000');
  await page.getByLabel('Statement date', { exact: true }).fill('2025-12-31');
  await page.getByRole('button', { name: 'Review my details' }).click();
  await page.getByRole('button', { name: 'Calculate my estimate' }).click();
  await expect(page.getByText('4,500,000', { exact: false }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText('4,000,000', { exact: false }).filter({ visible: true }).first()).toBeVisible();
});

test('special circumstances return review required without a benefit total', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('First working day', { exact: true }).fill('2024-01-01');
  await page.getByLabel('Last working day', { exact: true }).fill('2025-12-31');
  await page.getByRole('checkbox', { name: /My employment needs special adjustments/ }).check();
  await page.getByRole('button', { name: 'Continue to wages' }).click();
  await expect(page.getByRole('heading', { name: 'This needs a closer look' })).toBeVisible();
  await expect(page.locator('.big-money').filter({ visible: true })).toHaveCount(0);
});
