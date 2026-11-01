import { test, expect, type Page } from '@playwright/test';
async function openSalary(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Salary Estimate from Work Time', exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole('button', { name: 'Save month', exact: true })).toBeEnabled();
  await page.getByLabel('I understand and want to save these records on this device.').check();
}
async function settings(page: Page) {
  for (const [key, value] of Object.entries({ basicSalary: '2000000', normalRate: '10000', overtimeRate: '15000', saturdayRate: '20000', sundayRate: '25000', nightRate: '5000' })) await page.locator(`[id="salary-settings.${key}"]`).fill(value);
}
async function hours(page: Page, date: string, normal: string, overtime: string, night: string) {
  await page.getByLabel('Choose a date (list alternative)').selectOption(date);
  await page.getByLabel('Normal hours', { exact: true }).fill(normal);
  await page.getByLabel('Overtime hours', { exact: true }).fill(overtime);
  await page.getByLabel('Night hours (overlapping)', { exact: true }).fill(night);
}
test('salary worked example, local restart persistence, month isolation and deletion', async ({ page }) => {
  await openSalary(page);
  await page.getByLabel('Selected month').fill('2026-11');
  await settings(page);
  await hours(page, '2026-11-02', '8', '10', '6');
  await hours(page, '2026-11-07', '8', '0', '0');
  await hours(page, '2026-11-08', '4', '0', '0');
  await page.getByRole('button', { name: 'Calculate monthly estimate' }).click();
  await expect(page.locator('.salary-amount')).toHaveText('₩2,440,000');
  await page.getByLabel('I understand and want to save these records on this device.').check();
  await page.getByRole('button', { name: 'Save month', exact: true }).click();
  await expect(page.getByText('Month saved on this device.', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Salary Estimate from Work Time', exact: true }).filter({ visible: true }).click();
  await expect(page.locator('[id="salary-settings.basicSalary"]')).toHaveValue('2000000');
  await page.getByLabel('Selected month').fill('2026-12');
  await expect(page.locator('[id="salary-settings.basicSalary"]')).toHaveValue('2000000');
  await page.locator('[id="salary-settings.basicSalary"]').fill('1000000');
  await page.getByLabel('Selected month').fill('2026-11');
  await expect(page.locator('[id="salary-settings.basicSalary"]')).toHaveValue('2000000');
  await page.getByRole('button', { name: 'Calculate monthly estimate' }).click();
  await expect(page.locator('.salary-amount')).toHaveText('₩2,440,000');
  await page.locator('[id="salary-settings.basicSalary"]').fill('2000001');
  await expect(page.locator('.salary-amount')).toHaveCount(0);
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete all records', exact: true }).click();
  await expect(page.getByText('Saved records deleted.', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Salary Estimate from Work Time', exact: true }).filter({ visible: true }).click();
  await expect(page.locator('[id="salary-settings.basicSalary"]')).toHaveValue('0');
});
test('salary failures retain inputs, offline save, and retry', async ({ page, context }) => {
  await openSalary(page); await settings(page);
  await page.route('**/v1/salary-estimates', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"code":"REQUEST_FAILED","message":"unavailable","issues":[]}' }));
  await page.getByRole('button', { name: 'Calculate monthly estimate' }).click();
  await expect(page.getByText('The estimate could not be calculated.', { exact: false })).toBeVisible();
  await expect(page.locator('[id="salary-settings.basicSalary"]')).toHaveValue('2000000');
  await page.unroute('**/v1/salary-estimates');
  await page.getByRole('button', { name: 'Calculate monthly estimate' }).click();
  await expect(page.locator('.salary-amount')).toHaveText('₩2,000,000');
  await context.setOffline(true);
  await page.getByLabel('Normal hours', { exact: true }).fill('8.5');
  await expect(page.locator('.salary-amount')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Calculate monthly estimate' })).toBeDisabled();
  await page.getByLabel('I understand and want to save these records on this device.').check();
  await page.getByRole('button', { name: 'Save month', exact: true }).click();
  await expect(page.getByText('Month saved on this device.', { exact: true })).toBeVisible();
  await context.setOffline(false);
});
test('Burmese dark salary interface fits a narrow phone and preserves severance draft', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/'); await page.getByLabel('First working day').fill('2020-01-01');
  await page.getByRole('button', { name: 'Salary Estimate from Work Time', exact: true }).filter({ visible: true }).click();
  await page.getByRole('button', { name: 'Dark appearance' }).click();
  await page.getByRole('button', { name: 'မြန်မာ', exact: true }).click();
  await expect(page.locator('#salary-heading')).toHaveText('အလုပ်ချိန်မှ လစာခန့်မှန်းခြင်း');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/salary-burmese-phone.png', fullPage: true });
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await page.getByRole('button', { name: 'Severance calculator', exact: true }).filter({ visible: true }).click();
  await expect(page.getByLabel('First working day')).toHaveValue('2020-01-01');
});

test('in-flight salary response cannot replace an edited draft', async ({ page }) => {
  await openSalary(page); await settings(page);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let received!: () => void;
  const started = new Promise<void>(resolve => { received = resolve; });
  await page.route('**/v1/salary-estimates', async route => { received(); await held; await route.continue(); });
  await page.getByRole('button', { name: 'Calculate monthly estimate' }).click();
  await started;
  await page.locator('[id="salary-settings.basicSalary"]').fill('3000000');
  release();
  await expect(page.getByRole('button', { name: 'Calculate monthly estimate' })).toBeEnabled();
  await expect(page.locator('.salary-amount')).toHaveCount(0);
  await page.unroute('**/v1/salary-estimates');
  await page.getByRole('button', { name: 'Calculate monthly estimate' }).click();
  await expect(page.locator('.salary-amount')).toHaveText('₩3,000,000');
});
test('storage failure supports retry without losing the in-memory draft', async ({ page }) => {
  await page.addInitScript(() => {
    const original = IDBFactory.prototype.open;
    let failed = true;
    IDBFactory.prototype.open = function (...args: Parameters<IDBFactory['open']>) {
      if (failed) throw new DOMException('Denied', 'SecurityError');
      return original.apply(this, args);
    };
    (window as unknown as { allowSalaryStorage: () => void }).allowSalaryStorage = () => { failed = false; };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Salary Estimate from Work Time', exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole('button', { name: 'Retry loading saved records' })).toBeVisible();
  await expect(page.getByLabel('Selected month')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Previous month', exact: true })).toBeDisabled();
  await page.locator('[id="salary-settings.basicSalary"]').fill('12345');
  await expect(page.getByRole('button', { name: 'Save month', exact: true })).toBeDisabled();
  await page.evaluate(() => (window as unknown as { allowSalaryStorage: () => void }).allowSalaryStorage());
  await page.getByRole('button', { name: 'Retry loading saved records' }).click();
  await expect(page.getByRole('button', { name: 'Save month', exact: true })).toBeEnabled();
  await expect(page.locator('[id="salary-settings.basicSalary"]')).toHaveValue('12345');
});
test('structured salary errors reveal and focus the affected day field', async ({ page }) => {
  await openSalary(page);
  await page.getByLabel('Selected month').fill('2026-11');
  await hours(page, '2026-11-02', '8', '2', '1');
  await page.getByLabel('Choose a date (list alternative)').selectOption('2026-11-07');
  await page.route('**/v1/salary-estimates', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'INVALID_INPUT', message: 'Check fields', issues: [{ field: 'entries.0.nightHours', code: 'NIGHT_HOURS_EXCEEDED' }] }) }));
  await page.getByRole('button', { name: 'Calculate monthly estimate' }).click();
  await expect(page.getByLabel('Choose a date (list alternative)')).toHaveValue('2026-11-02');
  await expect(page.getByLabel('Night hours (overlapping)', { exact: true })).toBeFocused();
  await expect(page.getByText('Night hours cannot exceed normal plus overtime hours.', { exact: true })).toBeVisible();
});
