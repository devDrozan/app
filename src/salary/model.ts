export const rateKeys = ['basicSalary', 'normalRate', 'overtimeRate', 'saturdayRate', 'sundayRate', 'nightRate'] as const;
export type Settings = Record<typeof rateKeys[number], string>;
export type Entry = { date: string; normalHours: string; overtimeHours: string; nightHours: string };
export type MonthRecord = { month: string; settings: Settings; entries: Entry[] };
export const blankSettings = (): Settings => Object.fromEntries(rateKeys.map(key => [key, '0'])) as Settings;
export function daysInMonth(month: string) {
  const [year, n] = month.split('-').map(Number);
  return Array.from({ length: new Date(Date.UTC(year, n, 0)).getUTCDate() }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}
export function moveMonth(month: string, offset: number) {
  const [year, n] = month.split('-').map(Number);
  return new Date(Date.UTC(year, n - 1 + offset, 1)).toISOString().slice(0, 7);
}
export function koreanMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`;
}
export function validateRecord(record: MonthRecord): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of rateKeys) if (!/^(0|[1-9]\d{0,14})(\.\d{1,6})?$/.test(record.settings[key])) errors[`settings.${key}`] = 'INVALID_VALUE';
  record.entries.forEach((entry, i) => {
    for (const key of ['normalHours', 'overtimeHours', 'nightHours'] as const) {
      if (!/^(0|[1-9]\d?)(\.\d{1,2})?$/.test(entry[key])) errors[`entries.${i}.${key}`] = 'INVALID_HOURS';
    }
    // Integer hundredths validate input relationships, never financial arithmetic.
    const hundredths = (value: string) => Math.round(Number(value) * 100);
    const total = hundredths(entry.normalHours) + hundredths(entry.overtimeHours);
    if (total > 2400) errors[`entries.${i}.overtimeHours`] = 'DAILY_HOURS_EXCEEDED';
    if (hundredths(entry.nightHours) > total) errors[`entries.${i}.nightHours`] = 'NIGHT_HOURS_EXCEEDED';
  });
  return errors;
}

export function isMonthRecord(value: unknown): value is MonthRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as MonthRecord;
  if (typeof record.month !== 'string' || !/^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(record.month) || !record.settings || typeof record.settings !== 'object' || !Array.isArray(record.entries) || record.entries.length > 31) return false;
  if (rateKeys.some(key => typeof record.settings[key] !== 'string')) return false;
  const dates = new Set(daysInMonth(record.month));
  if (record.entries.some(entry => !entry || typeof entry !== 'object' || !dates.has(entry.date) || ['normalHours', 'overtimeHours', 'nightHours'].some(key => typeof entry[key as keyof Entry] !== 'string'))) return false;
  if (new Set(record.entries.map(entry => entry.date)).size !== record.entries.length) return false;
  return Object.keys(validateRecord(record)).length === 0;
}
