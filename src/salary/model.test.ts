import { describe, expect, it } from 'vitest';
import { blankSettings, daysInMonth, isMonthRecord, moveMonth, validateRecord, type MonthRecord } from './model';
const record = (): MonthRecord => ({ month: '2024-02', settings: blankSettings(), entries: [{ date: '2024-02-29', normalHours: '8', overtimeHours: '2.25', nightHours: '3.50' }] });
describe('salary calendar and input validation', () => {
  it('uses calendar dates across leap days and year transitions', () => {
    expect(daysInMonth('2024-02')).toHaveLength(29);
    expect(daysInMonth('2025-02')).toHaveLength(28);
    expect(moveMonth('2024-12', 1)).toBe('2025-01');
    expect(moveMonth('2025-01', -1)).toBe('2024-12');
  });
  it('accepts decimal hours while rejecting excess daily/night hours and precision', () => {
    const value = record(); expect(validateRecord(value)).toEqual({});
    value.entries[0].nightHours = '10.26';
    expect(validateRecord(value)['entries.0.nightHours']).toBe('NIGHT_HOURS_EXCEEDED');
    value.entries[0].normalHours = '23';
    expect(validateRecord(value)['entries.0.overtimeHours']).toBe('DAILY_HOURS_EXCEEDED');
    value.entries[0].normalHours = '1.001';
    expect(validateRecord(value)['entries.0.normalHours']).toBe('INVALID_HOURS');
  });
  it('guards corrupt storage, duplicate/out-of-month dates and excessive money', () => {
    expect(isMonthRecord(null)).toBe(false); expect(isMonthRecord({ month: '2024-02' })).toBe(false);
    const value = record(); expect(isMonthRecord(value)).toBe(true);
    value.entries.push({ ...value.entries[0] }); expect(isMonthRecord(value)).toBe(false);
    value.entries = [{ ...value.entries[0], date: '2024-02-30' }]; expect(isMonthRecord(value)).toBe(false);
    value.entries[0].date = '2024-03-01'; expect(isMonthRecord(value)).toBe(false);
    value.entries = []; value.settings.basicSalary = '1000000000000000'; expect(isMonthRecord(value)).toBe(false);
  });
});
