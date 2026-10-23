import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
});

for (const method of ['Normal Standard severance pay', 'DB Defined benefit pension']) {
  test(`${method}: Back and unchanged employment retain the entire wage draft`, async ({ page }) => {
    await page.getByRole('button', { name: method, exact: true }).click();
    await page.getByRole('button', { name: 'Try an example' }).click();
    const values = { 'base-0': '1000000.50', 'allowances-0': '180000.123456', bonus: '5000000.50', leave: '100000.25', ordinary: '100000.125' };
    for (const [id, value] of Object.entries(values)) await page.locator(`#${id}`).fill(value);
    // Choosing the active plan must not discard the current step or draft.
    await page.getByRole('button', { name: method, exact: true }).click();
    await expect(page.locator('#base-0')).toHaveValue(values['base-0']);
    await page.getByRole('button', { name: 'Review my details' }).click();
    await expect(page.locator('.review-data')).toContainText('₩1,000,000.50');
    await expect(page.locator('.review-data')).toContainText('₩180,000.123456');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('button', { name: 'Continue to wages' }).click();
    for (const [id, value] of Object.entries(values)) await expect(page.locator(`#${id}`)).toHaveValue(value);
    // Hours do not change the reference wage periods.
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.locator('#weeklyHours').fill('35');
    await page.getByRole('button', { name: 'Continue to wages' }).click();
    for (const [id, value] of Object.entries(values)) await expect(page.locator(`#${id}`)).toHaveValue(value);
    // A new reference boundary invalidates only affected period rows.
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.locator('#lastWorkingDate').fill('2017-09-16');
    await page.getByRole('button', { name: 'Continue to wages' }).click();
    await expect(page.locator('#base-0')).toHaveValue('');
    await expect(page.locator('#base-1')).toHaveValue('2000000');
    await expect(page.locator('#bonus')).toHaveValue('0');
    await expect(page.getByRole('status')).toContainText('Your employment dates changed');
  });
}

test('DC retains yearly wages, exact balance and statement date, but invalidates a changed partial year', async ({ page }) => {
  await page.getByRole('button', { name: 'DC Defined contribution pension', exact: true }).click();
  await page.locator('#startDate').fill('2024-07-01');
  await page.locator('#lastWorkingDate').fill('2025-12-31');
  await page.getByRole('button', { name: 'Continue to wages' }).click();
  await page.locator('#year-2024').fill('18000000.123456');
  await page.locator('#year-2025').fill('36000000.50');
  await page.locator('#balance').fill('999999999999999.123456');
  await page.locator('#balanceDate').fill('2025-12-31');
  await page.getByRole('button', { name: 'Review my details' }).click();
  await expect(page.locator('.review-data')).toContainText('₩999,999,999,999,999.123456');
  await expect(page.locator('.review-data')).toContainText('₩18,000,000.123456');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Continue to wages' }).click();
  await expect(page.locator('#year-2024')).toHaveValue('18000000.123456');
  await expect(page.locator('#year-2025')).toHaveValue('36000000.50');
  await expect(page.locator('#balance')).toHaveValue('999999999999999.123456');
  await expect(page.locator('#balanceDate')).toHaveValue('2025-12-31');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.locator('#startDate').fill('2024-07-02');
  await page.getByRole('button', { name: 'Continue to wages' }).click();
  await expect(page.locator('#year-2024')).toHaveValue('');
  await expect(page.locator('#year-2025')).toHaveValue('36000000.50');
});

test('invalid amounts show linked errors and reveal/focus the first affected field', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: 'Try an example' }).click();
  await page.locator('#base-0').fill('-1');
  await page.locator('#allowances-1').fill('');
  await page.locator('#ordinary').fill('0.000000');
  await page.getByRole('button', { name: 'Review my details' }).click();
  await expect(page.locator('#base-0')).toBeFocused();
  await expect(page.locator('#base-0')).toBeInViewport();
  await expect(page.locator('#base-0-label')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('#base-0-error')).toBeInViewport();
  await expect(page.locator('#base-0')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#base-0')).toHaveAccessibleDescription(/non-negative amount/);
  await expect(page.locator('#allowances-1')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#ordinary-error')).toHaveText(/positive daily ordinary wage/);
  if (testInfo.project.name === 'phone') await page.screenshot({ path: testInfo.outputPath('inline-error.png') });
  // Language changes update the linked error without moving focus/reading position.
  const scroll = await page.evaluate(() => scrollY);
  await page.getByRole('button', { name: 'မြန်မာ', exact: true }).dispatchEvent('click');
  await expect(page.locator('#base-0-error')).not.toHaveText(/non-negative amount/);
  await expect(page.locator('#base-0')).toBeFocused();
  expect(Math.abs(await page.evaluate(() => scrollY) - scroll)).toBeLessThan(100);
  await page.getByRole('button', { name: 'EN', exact: true }).dispatchEvent('click');
  await page.locator('#base-0').fill('1000000');
  await page.locator('#allowances-1').fill('0');
  await page.getByRole('button', { name: 'Review my details' }).click();
  await expect(page.locator('#ordinary')).toBeFocused();
  await expect(page.locator('#ordinary-error')).toBeInViewport();
});

test('DC amount and required statement date errors are field-level and reachable', async ({ page }) => {
  await page.getByRole('button', { name: 'DC Defined contribution pension', exact: true }).click();
  await page.locator('#startDate').fill('2024-07-01');
  await page.locator('#lastWorkingDate').fill('2025-12-31');
  await page.getByRole('button', { name: 'Continue to wages' }).click();
  await page.locator('#year-2025').fill('36000000');
  await page.locator('#balance').fill('1e6');
  await page.getByRole('button', { name: 'Review my details' }).click();
  await expect(page.locator('#year-2024')).toBeFocused();
  await expect(page.locator('#year-2024-error')).toBeInViewport();
  await expect(page.locator('#balance')).toHaveAccessibleDescription(/non-negative amount/);
  await page.locator('#year-2024').fill('18000000');
  await page.locator('#balance').fill('4000000.50');
  await page.getByRole('button', { name: 'Review my details' }).click();
  await expect(page.locator('#balanceDate')).toBeFocused();
  await expect(page.locator('#balanceDate')).toHaveAccessibleDescription(/valid statement date/);
  await expect(page.locator('#balanceDate-error')).toBeInViewport();
});

test('step transitions reveal and focus the destination, with keyboard continuation and exact payloads', async ({ page }) => {
  await page.getByRole('button', { name: 'Try an example' }).click();
  const wages = page.getByRole('heading', { name: 'A closer look at your wages' });
  await expect(wages).toBeFocused();
  await expect(wages).toBeInViewport();
  await page.keyboard.press('Tab');
  await expect(page.locator('#base-0')).toBeFocused();
  await page.locator('#base-0').fill('1000000.50');
  await page.getByRole('button', { name: 'Review my details' }).click();
  const review = page.getByRole('heading', { name: 'One last look' });
  await expect(review).toBeFocused();
  await expect(review).toBeInViewport();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeFocused();
  const request = page.waitForRequest(r => r.url().endsWith('/v1/calculations') && r.method() === 'POST');
  await page.getByRole('button', { name: 'Calculate my estimate' }).click();
  expect((await request).postDataJSON().wages[0].basePay).toBe('1000000.50');
  await expect(page.getByRole('region', { name: 'Your result', exact: true })).toBeFocused();
  await expect(page.locator('.big-money').filter({ visible: true }).first()).toBeInViewport();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Edit details' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(wages).toBeFocused();
  await expect(wages).toBeInViewport();
  await expect(page.locator('#base-0')).toHaveValue('1000000.50');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your time at work' })).toBeFocused();
});

test('structured API amount issues return to the affected wage field without losing the draft', async ({ page }) => {
  await page.getByRole('button', { name: 'Try an example' }).click();
  await page.getByRole('button', { name: 'Review my details' }).click();
  await page.route('**/v1/calculations', route => route.fulfill({ status: 400, json: { code: 'INVALID_INPUT', message: 'Invalid input', issues: [{ field: 'wages.2.allowances', code: 'INVALID_VALUE' }] } }));
  await page.getByRole('button', { name: 'Calculate my estimate' }).click();
  await expect(page.locator('#allowances-2')).toBeFocused();
  await expect(page.locator('#allowances-2-error')).toBeInViewport();
  await expect(page.locator('#base-0')).toHaveValue('1000000');
  await expect(page.locator('#allowances-2')).toHaveAccessibleDescription(/non-negative amount/);
});
