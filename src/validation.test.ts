import { describe, expect, it } from 'vitest';
import { employmentSchema, validMoney, reviewMoney } from './validation';
import en from './locales/en.json';
import my from './locales/my.json';
describe('worker input validation', () => {
  it('rejects reversed employment dates before sending a request', () => {
    const input = { startDate: '2025-01-01', lastWorkingDate: '2024-12-31', weeklyHours: 40, hasSpecialCircumstances: false };
    expect(employmentSchema.safeParse(input).success).toBe(false);
  });
  it('allows zero and decimals but rejects negatives, exponents, and formatted money', () => {
    expect(['0', '3000000', '150.25'].every(validMoney)).toBe(true);
    expect(['-1', '1e6', 'NaN', '3,000,000', ''].some(validMoney)).toBe(false);
  });
  it('has a Burmese translation for every English key, including all result reasons', () => {
    const keys = (value: Record<string, unknown>, prefix = ''): string[] => Object.entries(value).flatMap(([key, v]) => v && typeof v === 'object' ? keys(v as Record<string, unknown>, `${prefix}${key}.`) : [`${prefix}${key}`]);
    expect(keys(my).sort()).toEqual(keys(en).sort());
  });
  it('shows accepted review amounts exactly without binary conversion or whole-won rounding', () => {
    expect(reviewMoney('1000000.50')).toBe('1,000,000.50');
    expect(reviewMoney('999999999999999.123456')).toBe('999,999,999,999,999.123456');
    expect(reviewMoney('0.000001')).toBe('0.000001');
    expect(reviewMoney('0')).toBe('0');
    expect(reviewMoney('1000')).toBe('1,000');
  });
});
