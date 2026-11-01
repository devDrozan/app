import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiFailure } from '../api/client';
import type { paths } from '../api/schema';
import { blankSettings, daysInMonth, koreanMonth, moveMonth, rateKeys, validateRecord, isMonthRecord, type Entry, type MonthRecord } from './model';
import { salaryStore } from './storage';

type SalaryResult = paths['/v1/salary-estimates']['post']['responses'][200]['content']['application/json'];
const emptyEntry = (date: string): Entry => ({ date, normalHours: '0', overtimeHours: '0', nightHours: '0' });
export function SalaryEstimate({ active, offline }: { active: boolean; offline: boolean }) {
  const { t } = useTranslation();
  const tr = (key: string) => t(`salary.${key}`);
  const initialMonth = koreanMonth();
  const [month, setMonth] = useState(initialMonth);
  const [records, setRecords] = useState<Record<string, MonthRecord>>({});
  const [selected, setSelected] = useState(`${initialMonth}-01`);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SalaryResult>();
  const [busy, setBusy] = useState(false);
  const [focusTarget, setFocusTarget] = useState('');
  const [saving, setSaving] = useState(false);
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('e9-salary-theme') === 'dark' || (!localStorage.getItem('e9-salary-theme') && matchMedia('(prefers-color-scheme: dark)').matches); } catch { return false; } });
  const generation = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const current = records[month] ?? { month, settings: blankSettings(), entries: [] };
  const entry = current.entries.find(row => row.date === selected) ?? emptyEntry(selected);
  const entryIndex = current.entries.findIndex(row => row.date === selected);
  async function loadRecords() {
    setReady(false);
    try {
      const rows = await salaryStore.all();
      if (!rows.every(isMonthRecord)) throw new Error('INVALID_STORAGE');
      const saved = Object.fromEntries(rows.map(row => [row.month, row]));
      const previous = rows.filter(row => row.month < initialMonth).sort((a, b) => b.month.localeCompare(a.month))[0];
      if (!saved[initialMonth]) saved[initialMonth] = { month: initialMonth, settings: { ...(previous?.settings ?? blankSettings()) }, entries: [] };
      setRecords(old => ({ ...saved, ...old })); setConsent(value => value || rows.length > 0); setLoaded(true); setStatus('');
    } catch { setStatus('storageError'); }
    finally { setReady(true); }
  }
  useEffect(() => { void loadRecords(); }, []);
  useEffect(() => { if (active) heading.current?.focus(); }, [active]);
  useEffect(() => { if (active && result) resultHeading.current?.focus(); }, [result, active]);
  useEffect(() => {
    if (!active || !focusTarget) return;
    const target = document.getElementById(`salary-${focusTarget}`) ?? heading.current;
    target?.focus(); target?.scrollIntoView({ block: 'center', behavior: 'instant' }); setFocusTarget('');
  }, [active, focusTarget, errors, selected]);
  function invalidate() { generation.current++; setResult(undefined); setErrors({}); setStatus('unsaved'); }
  function change(next: MonthRecord) { invalidate(); setDirty(old => new Set(old).add(month)); setRecords(old => ({ ...old, [month]: next })); }
  function changeMonth(next: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(next) || next < '1900-01' || next > '2099-12') return;
    generation.current++; setResult(undefined); setErrors({}); setStatus(dirty.has(next) ? 'unsaved' : '');
    if (!records[next]) {
      const previous = Object.values(records).filter(row => row.month < next).sort((a, b) => b.month.localeCompare(a.month))[0];
      setRecords(old => ({ ...old, [next]: { month: next, settings: { ...(previous?.settings ?? blankSettings()) }, entries: [] } }));
    }
    setMonth(next); setSelected(`${next}-01`);
  }
  function updateHours(key: 'normalHours' | 'overtimeHours' | 'nightHours', value: string) {
    const next = { ...entry, [key]: value };
    change({ ...current, entries: [...current.entries.filter(row => row.date !== selected), next].sort((a, b) => a.date.localeCompare(b.date)) });
  }
  function showErrors(next: Record<string, string>) {
    setErrors(next);
    const first = Object.keys(next)[0];
    const index = /^entries\.(\d+)/.exec(first ?? '');
    if (index && current.entries[Number(index[1])]) setSelected(current.entries[Number(index[1])].date);
    setFocusTarget(first);
  }
  async function save() {
    const invalid = validateRecord(current); if (Object.keys(invalid).length) { showErrors(invalid); return; }
    if (!consent) { document.getElementById('salary-consent')?.focus(); setStatus('consentRequired'); return; }
    const version = generation.current; setSaving(true);
    try { await salaryStore.save(current); if (version === generation.current) { setStatus('saved'); setDirty(old => { const next = new Set(old); next.delete(month); return next; }); } }
    catch { setStatus('storageError'); } finally { setSaving(false); }
  }
  async function remove(all: boolean) {
    if (!confirm(tr(all ? 'confirmAll' : 'confirmMonth'))) return;
    setSaving(true);
    try {
      if (all) await salaryStore.clear(); else await salaryStore.remove(month);
      invalidate(); setRecords(old => { const next = all ? {} : { ...old }; delete next[month]; return next; });
      setDirty(old => { const next = all ? new Set<string>() : new Set(old); next.delete(month); return next; }); setStatus('deleted');
    } catch { setStatus('storageError'); } finally { setSaving(false); }
  }
  async function calculate() {
    if (!consent) { document.getElementById('salary-consent')?.focus(); setStatus('consentRequired'); return; }
    const invalid = validateRecord(current); if (Object.keys(invalid).length) { showErrors(invalid); return; }
    const version = generation.current; setBusy(true); setResult(undefined); setErrors({});
    try {
      const { data, error } = await api.POST('/v1/salary-estimates', { body: current });
      if (version !== generation.current) return;
      if (error || !data) throw new ApiFailure(error?.issues);
      setResult(data); setStatus(dirty.has(month) ? 'unsaved' : '');
    } catch (error) {
      if (version !== generation.current) return;
      if (error instanceof ApiFailure && error.issues.length) showErrors(Object.fromEntries(error.issues.map(issue => [issue.field, issue.code])));
      setStatus('requestError');
    } finally { setBusy(false); }
  }
  const errorMessage = (field: string) => errors[field] ? <span id={`salary-${field}-error`} className="field-error">{tr(`errors.${errors[field]}`)}</span> : null;
  const weekday = (day: number) => tr(`weekdays.${day}`);
  const formatDay = (date: string) => `${weekday(new Date(`${date}T00:00:00Z`).getUTCDay())} · ${date}`;
  return <section hidden={!active} className={`salary-module ${dark ? 'salary-dark' : ''}`} aria-labelledby="salary-heading">
    <div className="salary-title"><div><h1 id="salary-heading" ref={heading} tabIndex={-1}>{tr('title')}</h1><p>{tr('intro')}</p></div><button className="button secondary" onClick={() => { setDark(value => !value); try { localStorage.setItem('e9-salary-theme', dark ? 'light' : 'dark'); } catch { /* appearance is optional */ } }} aria-pressed={dark}>{tr(dark ? 'light' : 'dark')}</button></div>
    <p className="salary-note">{tr('rules')}</p>
    <div className="salary-month"><button className="button secondary" disabled={!ready || !loaded || saving || month === '1900-01'} onClick={() => changeMonth(moveMonth(month, -1))} aria-label={tr('previous')}>‹</button><label className="field">{tr('month')}<input type="month" min="1900-01" max="2099-12" value={month} disabled={!ready || !loaded || saving} onChange={e => changeMonth(e.target.value)} /></label><button className="button secondary" disabled={!ready || !loaded || saving || month === '2099-12'} onClick={() => changeMonth(moveMonth(month, 1))} aria-label={tr('next')}>›</button></div>
    {!ready && <p role="status">{tr('loading')}</p>}
    <fieldset disabled={!ready || saving} className="salary-settings"><legend>{tr('settings')}</legend><div className="salary-fields">{rateKeys.map(key => <label className="field" key={key} htmlFor={`salary-settings.${key}`}><span id={`salary-settings.${key}-label`}>{tr(key)} · KRW</span><input aria-labelledby={`salary-settings.${key}-label`} id={`salary-settings.${key}`} inputMode="decimal" autoComplete="off" maxLength={22} value={current.settings[key]} aria-invalid={!!errors[`settings.${key}`]} aria-describedby={errors[`settings.${key}`] ? `salary-settings.${key}-error` : undefined} onChange={e => change({ ...current, settings: { ...current.settings, [key]: e.target.value } })} />{errorMessage(`settings.${key}`)}</label>)}</div><p className="help">{tr('snapshot')}</p></fieldset>
    <div className="salary-work"><section className="salary-panel"><h2>{tr('calendar')}</h2><p className="help">{tr('calendarHelp')}</p><div className="salary-calendar" aria-label={tr('calendar')}>{Array.from({ length: 7 }, (_, i) => <span className="salary-weekday" key={`weekday-${i}`}>{weekday((i + 1) % 7)}</span>)}{Array.from({ length: (new Date(`${month}-01T00:00:00Z`).getUTCDay() + 6) % 7 }, (_, i) => <span key={`blank-${i}`} aria-hidden="true" />)}{daysInMonth(month).map(date => <button type="button" className={selected === date ? 'selected' : ''} key={date} disabled={!ready} onClick={() => setSelected(date)} aria-pressed={selected === date} aria-label={`${formatDay(date)}${current.entries.some(row => row.date === date) ? ` · ${tr('recorded')}` : ''}`}><span>{date.slice(-2)}</span>{current.entries.some(row => row.date === date) && <small aria-hidden="true">●</small>}</button>)}</div></section>
    <section className="salary-panel"><h2>{tr('daily')}</h2><label className="field">{tr('dateList')}<select value={selected} onChange={e => setSelected(e.target.value)}>{daysInMonth(month).map(date => <option value={date} key={date}>{formatDay(date)}</option>)}</select></label><p className="help">{tr('hoursHelp')}</p>{(['normalHours', 'overtimeHours', 'nightHours'] as const).map(key => { const field = `entries.${entryIndex}.${key}`; return <label className="field" key={key} htmlFor={`salary-${field}`}><span id={`salary-${field}-label`}>{tr(key)}</span><input aria-labelledby={`salary-${field}-label`} disabled={!ready || saving} id={`salary-${field}`} inputMode="decimal" autoComplete="off" maxLength={5} value={entry[key]} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `salary-${field}-error` : undefined} onChange={e => updateHours(key, e.target.value)} />{errorMessage(field)}</label>; })}<button className="button secondary" disabled={entryIndex < 0 || saving} onClick={() => { if (confirm(tr('confirmDay'))) change({ ...current, entries: current.entries.filter(row => row.date !== selected) }); }}>{tr('deleteDay')}</button></section></div>
    <section className="salary-panel salary-storage"><h2>{tr('localRecords')}</h2><p>{tr('disclosure')}</p><label className="salary-consent"><input type="checkbox" id="salary-consent" checked={consent} onChange={e => setConsent(e.target.checked)} />{tr('consent')}</label><div className="salary-actions"><button className="button primary" disabled={!ready || !loaded || saving} onClick={() => void save()}>{tr(saving ? 'saving' : 'save')}</button><button className="button secondary" disabled={!ready || saving} onClick={() => void remove(false)}>{tr('deleteMonth')}</button><button className="button secondary" disabled={!ready || saving} onClick={() => void remove(true)}>{tr('deleteAll')}</button></div></section>
    {!loaded && ready && <button className="button secondary" onClick={() => void loadRecords()}>{tr('retryStorage')}</button>}
    {status && <p className={['storageError', 'requestError', 'consentRequired'].includes(status) ? 'salary-error' : 'salary-status'} role={['storageError', 'requestError'].includes(status) ? 'alert' : 'status'}>{tr(status)}</p>}
    {Object.keys(errors).length > 0 && <p className="salary-error" role="alert">{tr('checkFields')}</p>}
    <div className="salary-actions"><button className="button primary" disabled={!ready || busy || offline} onClick={() => void calculate()}>{tr(busy ? 'calculating' : 'calculate')}</button>{offline && <p role="status">{tr('offline')}</p>}</div>
    {result && <section className="salary-panel salary-result" aria-labelledby="salary-result"><h2 id="salary-result" ref={resultHeading} tabIndex={-1}>{tr('result')}</h2><p className="salary-amount">₩{result.amountKrw.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</p><p>{tr('beforeTax')}</p><dl>{Object.entries(result.components).map(([key, value]) => <div key={key}><dt>{tr(`components.${key}`)}</dt><dd>₩{value}</dd></div>)}</dl><h3>{tr('hourSummary')}</h3><dl>{Object.entries(result.hours).map(([key, value]) => <div key={key}><dt>{tr(`hours.${key}`)}</dt><dd>{value} {tr('hoursUnit')}</dd></div>)}</dl><p className="help">{tr('version')}: {result.formulaVersion} · {tr('rounding')}</p><p className="help">{tr('exclusions')}</p></section>}
  </section>;
}
