import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { registerSW } from 'virtual:pwa-register';
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Calculator, CalendarDays, Check, ChevronRight, CircleHelp, Globe2, Leaf, LockKeyhole, RotateCcw, ShieldCheck, Sparkles, Wallet, WifiOff } from 'lucide-react';
import { ApiFailure, calculate, getContext, type Calculation, type CalculationInput, type Context, type ContextInput } from './api/client';
import { employmentSchema, type EmploymentValues, validMoney, validCalendarDate, dateLabel, reviewMoney } from './validation';
import { Info, Sources } from './Info';
import { ResultDetails, ResultSummary } from './Result';

type Method = ContextInput['method'];
type WageRow = { startDate: string; endDate: string; basePay: string; allowances: string };
type YearRow = { year: number; wages: string };
const blank: EmploymentValues = { startDate: '', lastWorkingDate: '', weeklyHours: 40, hasSpecialCircumstances: false };
const exampleEmployment: EmploymentValues = { startDate: '2014-10-02', lastWorkingDate: '2017-09-15', weeklyHours: 40, hasSpecialCircumstances: false };

function MoneyInput({ label, value, onChange, optional = false, help, id, error }: { label: string; value: string; onChange: (v: string) => void; optional?: boolean; help?: string; id: string; error?: string }) {
  const { t } = useTranslation();
  const description = [error && `${id}-error`, help && `${id}-help`].filter(Boolean).join(' ') || undefined;
  return <label className="field" htmlFor={id}><span id={`${id}-label`}>{label}{optional && <small>{t('optional')}</small>}</span><div className="input-wrap"><input id={id} inputMode="decimal" type="text" autoComplete="off" maxLength={22} value={value} placeholder="0" onChange={e => onChange(e.target.value)} aria-labelledby={`${id}-label`} aria-invalid={!!error} aria-describedby={description} /><span className="input-suffix">KRW</span></div>{error && <span className="field-error" id={`${id}-error`}>{t(error)}</span>}{help && <span className="help" id={`${id}-help`}>{help}</span>}</label>;
}
function CardHeading({ number, title, sub }: { number: string; title: string; sub: string }) {
  return <div className="section-heading"><span className="section-number">{number}</span><div><h2 tabIndex={-1} data-step-focus>{title}</h2><p>{sub}</p></div></div>;
}

export default function App() {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<'calculator' | 'guide' | 'insurance'>('calculator');
  const [method, setMethod] = useState<Method>('normal');
  const [step, setStep] = useState(0);
  const [context, setContext] = useState<Context>();
  const [result, setResult] = useState<Calculation>();
  const [wages, setWages] = useState<WageRow[]>([]);
  const [years, setYears] = useState<YearRow[]>([]);
  const [bonus, setBonus] = useState('0');
  const [leave, setLeave] = useState('0');
  const [ordinary, setOrdinary] = useState('');
  const [balance, setBalance] = useState('');
  const [balanceDate, setBalanceDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [periodsChanged, setPeriodsChanged] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const focusTarget = useRef<string>('');
  const panelRef = useRef<HTMLDivElement>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [updateReady, setUpdateReady] = useState(false);
  const updateSW = useRef<((reload?: boolean) => Promise<void>) | null>(null);
  const form = useForm<EmploymentValues>({ resolver: zodResolver(employmentSchema), defaultValues: blank });

  useEffect(() => {
    const online = () => setOffline(!navigator.onLine);
    window.addEventListener('online', online); window.addEventListener('offline', online);
    if (import.meta.env.PROD) updateSW.current = registerSW({ onNeedRefresh: () => setUpdateReady(true) });
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', online); };
  }, []);
  useEffect(() => {
    if (!focusRequest || view !== 'calculator') return;
    const target = focusTarget.current === 'step'
      ? panelRef.current?.querySelector<HTMLElement>('[data-step-focus]')
      : document.getElementById(focusTarget.current);
    target?.focus({ preventScroll: true });
    // Instant movement keeps the destination visible and respects reduced motion.
    (target?.closest('.field') ?? target)?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [focusRequest, view]);
  function focus(id: string) { focusTarget.current = id; setFocusRequest(n => n + 1); }
  function transition(next: number) { setStep(next); focus('step'); }
  function clearFieldError(id: string) {
    setFieldErrors(old => { const next = { ...old }; delete next[id]; return next; });
  }
  function navigate(next: typeof view) { setView(next); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function resetPlan(next: Method, force = false) {
    if (next === method && !force) return;
    setMethod(next); transition(0); setContext(undefined); setResult(undefined); setError(''); setFieldErrors({}); setPeriodsChanged(false);
  }
  async function run(task: () => Promise<void>) {
    setBusy(true); setError('');
    try { await task(); } catch (e) {
      if (e instanceof ApiFailure && e.issues.length) {
        const errors: Record<string, string> = {};
        let employmentError = false;
        for (const item of e.issues) {
          const key = item.field.replace('employment.', '');
          if (key === 'startDate' || key === 'lastWorkingDate' || key === 'weeklyHours') {
            employmentError = true;
            const message = key === 'weeklyHours' ? 'validHours' : item.code === 'DATE_ORDER' ? 'dateOrder' : 'invalidDate';
            form.setError(key, { message });
            errors[key] = message;
            continue;
          }
          const wage = /^wages\.(\d+)\.(basePay|allowances)$/.exec(item.field);
          const year = /^dcWages\.(\d+)\.wages$/.exec(item.field);
          const id = wage ? `${wage[2] === 'basePay' ? 'base' : 'allowances'}-${wage[1]}`
            : year && years[Number(year[1])] ? `year-${years[Number(year[1])].year}`
            : ({ annualBonus: 'bonus', annualLeavePay: 'leave', ordinaryDailyWage: 'ordinary', 'reportedBalance.amount': 'balance', 'reportedBalance.asOf': 'balanceDate' } as Record<string, string>)[item.field];
          if (id) errors[id] = id === 'balanceDate' ? 'balanceDateRequired' : item.code === 'POSITIVE_ORDINARY_WAGE' ? 'positiveOrdinary' : 'invalidMoney';
        }
        if (Object.keys(errors).length) {
          setFieldErrors(errors); setStep(employmentError ? 0 : 1);
          focus(employmentError ? Object.keys(errors).find(key => ['startDate', 'lastWorkingDate', 'weeklyHours'].includes(key))! : Object.keys(errors)[0]);
        } else { setError('invalid'); focus('request-error'); }
      } else { setError('error'); focus('request-error'); }
    } finally { setBusy(false); }
  }
  async function prepare(employment: EmploymentValues, sample = false) {
    const prepared = await getContext({ method, employment });
    setContext(prepared); setResult(undefined);
    if (prepared.eligibility.status !== 'eligible') {
      const output = await calculate({ method, employment } as CalculationInput);
      setResult(output); transition(3); return;
    }
    const previous = !sample && context;
    setWages(prepared.wagePeriods.map((p, index) => {
      const saved = previous && wages.find(w => w.startDate === p.startDate && w.endDate === p.endDate);
      return saved || { startDate: p.startDate, endDate: p.endDate, basePay: sample ? (index === 0 || index === 3 ? '1000000' : '2000000') : '', allowances: sample ? (index === 0 || index === 3 ? '180000' : '360000') : '0' };
    }));
    setYears(prepared.dcPeriods.map(p => {
      const samePeriod = previous && previous.dcPeriods.some(old => old.year === p.year && old.startDate === p.startDate && old.endDate === p.endDate);
      return (samePeriod && years.find(y => y.year === p.year)) || { year: p.year, wages: sample ? '30000000' : '' };
    }));
    if (!previous || previous.retirementDate !== prepared.retirementDate) {
      setBonus(sample ? '4000000' : '0'); setLeave(sample ? '300000' : '0'); setOrdinary('');
    }
    if (!previous) { setBalance(''); setBalanceDate(''); }
    const oldPeriods = method === 'dc' ? previous && previous.dcPeriods : previous && previous.wagePeriods;
    const newPeriods = method === 'dc' ? prepared.dcPeriods : prepared.wagePeriods;
    setPeriodsChanged(!!oldPeriods && JSON.stringify(oldPeriods) !== JSON.stringify(newPeriods));
    setFieldErrors({}); transition(1);
  }
  function makePayload(): CalculationInput {
    const employment = form.getValues();
    if (method === 'dc') return { method, employment, dcWages: years, reportedBalance: balance ? { amount: balance, asOf: balanceDate } : null };
    return { method, employment, wages, annualBonus: bonus, annualLeavePay: leave, ordinaryDailyWage: ordinary || null };
  }
  function reviewWages() {
    const errors: Record<string, string> = {};
    const check = (id: string, value: string) => { if (!validMoney(value)) errors[id] = 'invalidMoney'; };
    if (method === 'dc') {
      years.forEach(y => check(`year-${y.year}`, y.wages));
      if (balance) { check('balance', balance); if (!validCalendarDate(balanceDate)) errors.balanceDate = 'balanceDateRequired'; }
    } else {
      wages.forEach((w, index) => { check(`base-${index}`, w.basePay); check(`allowances-${index}`, w.allowances); });
      check('bonus', bonus); check('leave', leave);
      if (ordinary) { check('ordinary', ordinary); if (validMoney(ordinary) && !/[1-9]/.test(ordinary)) errors.ordinary = 'positiveOrdinary'; }
    }
    setFieldErrors(errors); setError('');
    if (Object.keys(errors).length) { focus(Object.keys(errors)[0]); return; }
    transition(2);
  }
  function moneyField(id: string, value: string, onChange: (value: string) => void, label: string, help?: string, optional = false) {
    return <MoneyInput id={id} label={t(label)} value={value} onChange={v => { onChange(v); clearFieldError(id); }} help={help && t(help)} optional={optional} error={fieldErrors[id]} />;
  }
  const fmtDate = (v: string) => dateLabel(v, i18n.language);
  const nextButton = (label: string, onClick?: () => void, type: 'button' | 'submit' = 'button') => <button className="button primary" type={type} onClick={onClick} disabled={busy || offline}>{busy ? t('working') : label}<ArrowRight size={17} /></button>;
  const navItems = [{ key: 'calculator' as const, icon: Calculator }, { key: 'guide' as const, icon: BookOpen }, { key: 'insurance' as const, icon: ShieldCheck }];

  let panel: ReactNode;
  if (step === 0) panel = <form onSubmit={form.handleSubmit(v => run(() => prepare(v)))} noValidate>
    <CardHeading number="01" title={t('employmentTitle')} sub={t('employmentSub')} />
    <div className="field-grid">
      <label className="field"><span>{t('startDate')}</span><input id="startDate" type="date" min="1900-01-01" max="2100-12-31" {...form.register('startDate')} aria-invalid={!!form.formState.errors.startDate} aria-describedby={form.formState.errors.startDate ? 'startDate-error' : undefined} />{form.formState.errors.startDate && <span id="startDate-error" className="field-error">{t(form.formState.errors.startDate.message!)}</span>}</label>
      <label className="field"><span>{t('lastWorkingDate')}</span><input id="lastWorkingDate" type="date" min="1900-01-01" max="2100-12-31" {...form.register('lastWorkingDate')} aria-invalid={!!form.formState.errors.lastWorkingDate} aria-describedby={form.formState.errors.lastWorkingDate ? 'lastWorkingDate-error' : undefined} />{form.formState.errors.lastWorkingDate && <span id="lastWorkingDate-error" className="field-error">{t(form.formState.errors.lastWorkingDate.message!)}</span>}</label>
    </div>
    <p className="inline-help"><CalendarDays size={14} />{t('lastDayHelp')}</p>
    <label className="field hours-field"><span>{t('weeklyHours')}</span><div className="input-wrap"><input id="weeklyHours" type="number" inputMode="decimal" min="0" max="168" step="0.5" {...form.register('weeklyHours', { valueAsNumber: true })} aria-invalid={!!form.formState.errors.weeklyHours} aria-describedby={form.formState.errors.weeklyHours ? 'weeklyHours-error' : undefined} /><span className="input-suffix">{t('hoursSuffix')}</span></div><span className="help">{t('hoursHelp')}</span>{form.formState.errors.weeklyHours && <span id="weeklyHours-error" className="field-error">{t('validHours')}</span>}</label>
    <label className="special-case"><input type="checkbox" {...form.register('hasSpecialCircumstances')} /><span><strong>{t('special')}</strong><small>{t('specialHelp')}</small></span></label>
    <div className="form-footer"><span><LockKeyhole size={13} />{t('private')}</span>{nextButton(t('continue'), undefined, 'submit')}</div>
  </form>;
  else if (step === 1 && context) panel = <form onSubmit={e => { e.preventDefault(); reviewWages(); }} noValidate>
    <CardHeading number="02" title={t(method === 'dc' ? 'dcTitle' : 'wagesTitle')} sub={t(method === 'dc' ? 'dcHelp' : 'wagesSub')} />
    {periodsChanged && <p className="period-notice" role="status">{t('periodsChanged')}</p>}
    {method === 'dc' ? <>
      {years.map((row, index) => <div className="wage-period" key={row.year}><div className="period-heading"><span>{row.year}</span><small>{fmtDate(context.dcPeriods[index].startDate)} — {fmtDate(context.dcPeriods[index].endDate)}</small></div>{moneyField(`year-${row.year}`, row.wages, v => setYears(old => old.map((r, i) => i === index ? { ...r, wages: v } : r)), 'yearWages')}</div>)}
      <div className="extra-wages">{moneyField('balance', balance, setBalance, 'balance', 'balanceHelp', true)}{balance && <label className="field" htmlFor="balanceDate"><span>{t('balanceDate')}</span><input id="balanceDate" type="date" value={balanceDate} onChange={e => { setBalanceDate(e.target.value); clearFieldError('balanceDate'); }} aria-invalid={!!fieldErrors.balanceDate} aria-describedby={fieldErrors.balanceDate ? 'balanceDate-error' : undefined} />{fieldErrors.balanceDate && <span id="balanceDate-error" className="field-error">{t(fieldErrors.balanceDate)}</span>}</label>}</div>
    </> : <>
      {wages.map((row, index) => <div className="wage-period" key={row.startDate}><div className="period-heading"><span>{fmtDate(row.startDate)} — {fmtDate(row.endDate)}</span><small>{t('days', { count: context.wagePeriods[index].days })}</small></div><div className="field-grid">{moneyField(`base-${index}`, row.basePay, v => setWages(old => old.map((r, i) => i === index ? { ...r, basePay: v } : r)), 'basePay')}{moneyField(`allowances-${index}`, row.allowances, v => setWages(old => old.map((r, i) => i === index ? { ...r, allowances: v } : r)), 'allowances')}</div></div>)}
      <div className="extra-wages">{moneyField('bonus', bonus, setBonus, 'annualBonus', 'bonusHelp')}{moneyField('leave', leave, setLeave, 'annualLeavePay', 'leaveHelp')}{moneyField('ordinary', ordinary, setOrdinary, 'ordinaryDailyWage', 'ordinaryHelp', true)}</div>
    </>}
    <div className="form-footer"><button type="button" className="text-button" onClick={() => { transition(0); setError(''); }}><ArrowLeft size={15} />{t('back')}</button>{nextButton(t('next'), undefined, 'submit')}</div>
  </form>;
  else if (step === 2 && context) panel = <>
    <CardHeading number="03" title={t('reviewTitle')} sub={t('reviewSub')} />
    <dl className="breakdown review-data"><div><dt>{t('yourPlan')}</dt><dd>{t(method)} · {t(`${method}Sub`)}</dd></div><div><dt>{t('yourPeriod')}</dt><dd>{fmtDate(form.getValues('startDate'))} — {fmtDate(form.getValues('lastWorkingDate'))}</dd></div><div><dt>{t('weeklyHours')}</dt><dd>{form.getValues('weeklyHours')}</dd></div>
      {method === 'dc' ? years.map(row => <div key={row.year}><dt>{row.year} · {t('yearWages')}</dt><dd>₩{reviewMoney(row.wages)}</dd></div>) : wages.map(row => <div key={row.startDate}><dt>{fmtDate(row.startDate)} — {fmtDate(row.endDate)}</dt><dd><span>{t('basePay')}: ₩{reviewMoney(row.basePay)}</span><span>{t('allowances')}: ₩{reviewMoney(row.allowances)}</span></dd></div>)}
      {method !== 'dc' && <><div><dt>{t('annualBonus')}</dt><dd>₩{reviewMoney(bonus)}</dd></div><div><dt>{t('annualLeavePay')}</dt><dd>₩{reviewMoney(leave)}</dd></div>{ordinary && <div><dt>{t('ordinaryDailyWage')}</dt><dd>₩{reviewMoney(ordinary)}</dd></div>}</>}
      {method === 'dc' && balance && <div><dt>{t('balance')}</dt><dd>₩{reviewMoney(balance)} · {fmtDate(balanceDate)}</dd></div>}
    </dl><div className="form-footer"><button className="text-button" onClick={() => { setError(''); transition(1); }}><ArrowLeft size={15} />{t('back')}</button>{nextButton(t('calculate'), () => run(async () => { const output = await calculate(makePayload()); setResult(output); transition(3); }))}</div>
  </>;
  else panel = result && <div data-step-focus tabIndex={-1} role="region" aria-label={t('result')}><div className="mobile-result"><ResultSummary value={result} /></div><ResultDetails value={result} /><div className="form-footer"><button className="text-button" onClick={() => { transition(context?.eligibility.status === 'eligible' ? 1 : 0); setResult(undefined); }}><ArrowLeft size={15} />{t('edit')}</button><button className="button secondary" onClick={() => { resetPlan(method, true); form.reset(blank); }}><RotateCcw size={15} />{t('startAgain')}</button></div></div>;

  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="#" onClick={e => { e.preventDefault(); navigate('calculator'); }}><img src="/icon.svg" alt="" /><span>{t('appName')}<small>{t('brandSubtitle')}</small></span></a><p className="sidebar-label">{t('toolkit')}</p><nav>{navItems.map(item => <button key={item.key} className={view === item.key ? 'nav-item active' : 'nav-item'} onClick={() => navigate(item.key)}><item.icon size={18} /><span>{t(item.key)}</span>{view === item.key && <ChevronRight size={15} />}</button>)}</nav><div className="sidebar-bottom"><span className="support-mark"><Leaf size={21} /></span><p>{t('tagline')}</p><span className="country-dot" />{t('madeFor')}</div></aside>
    <div className="workspace"><header className="topbar"><span className="breadcrumb">{t('toolkit')}<ChevronRight size={12} /><strong>{t(view)}</strong></span><span className="mobile-brand">{t('appName')}</span><div className="topbar-actions"><span className="country"><span className="korea-flag" aria-hidden="true">🇰🇷</span>{t('country')}</span><div className="language-toggle" aria-label={t('language')}><button onClick={() => void i18n.changeLanguage('en')} aria-pressed={i18n.language === 'en'}>EN</button><button onClick={() => void i18n.changeLanguage('my')} aria-pressed={i18n.language === 'my'}>မြန်မာ</button></div></div></header>
      <nav className="mobile-nav">{navItems.map(item => <button key={item.key} className={view === item.key ? 'active' : ''} onClick={() => navigate(item.key)}><item.icon size={16} />{t(item.key)}</button>)}</nav>
      <main>
        {offline && <div className="notice" role="status"><WifiOff size={17} />{t('offline')}</div>}
        {updateReady && <div className="notice" role="status">{t('update')}<button className="text-button" onClick={() => void updateSW.current?.(true)}>{t('reload')}</button></div>}
        {view === 'calculator' ? <>
          <section className="hero"><div className="eyebrow"><span />{t('eyebrow')}</div><h1>{t('hero')}</h1><p>{t('heroSub')}</p><div className="hero-trust"><span><ShieldCheck size={14} />{t('basedOn')}</span><span className="trust-divider" /><span>{t('private')}</span></div></section>
          <div className="calculator-layout"><div className="calculator-main"><section className="card calculator-card"><div className="card-top"><div><h2>{t('calculatorTitle')}</h2><p>{t('calculatorSub')}</p></div><button className="example-button" disabled={busy || offline} onClick={() => run(async () => { form.reset(exampleEmployment); await prepare(exampleEmployment, true); })}><Sparkles size={14} />{t('example')}</button></div>
            <div className="plan-selector"><span className="eyebrow">{t('planLabel')}</span><div className="plan-options">{(['normal', 'db', 'dc'] as const).map(m => <button key={m} className={`plan-option ${method === m ? 'selected' : ''}`} aria-pressed={method === m} disabled={busy} onClick={() => resetPlan(m)}><span className="plan-radio">{method === m && <Check size={11} strokeWidth={3} />}</span><strong>{t(m)}</strong><small>{t(`${m}Sub`)}</small></button>)}</div><button className="plan-help" onClick={() => navigate('guide')}><CircleHelp size={13} />{t('planHelp')}<ArrowUpRight size={12} /></button></div>
            <ol className="stepper">{['employment', 'wages', 'review'].map((key, i) => <li className={step >= i ? 'current' : ''} key={key}><span>{step > i ? <Check size={12} /> : i + 1}</span>{t(key)}{i < 2 && <div />}</li>)}</ol>
            <div className="form-panel" ref={panelRef} key={step}>{error && <div id="request-error" tabIndex={-1} className="error-banner" role="alert">{t(error)}</div>}{panel}</div>
          </section><div className="bottom-notes"><span><LockKeyhole size={14} />{t('privacySub')}</span><span>{t('connection')}</span></div></div>
          <aside className="estimate-aside"><section className={`estimate-card ${result ? 'has-result' : ''}`}>{result ? <ResultSummary value={result} /> : <><div className="estimate-top"><span className="eyebrow">{t('estimateTitle')}</span><Wallet size={17} /></div><div className="empty-amount">₩ <span>— — —</span></div><div className="empty-rule" /><h2>{t('placeholderTitle')}</h2><p>{t('placeholderSub')}</p><ol className="estimate-checklist">{['step1', 'step2', 'step3'].map((s, i) => <li key={s} className={step > i ? 'done' : ''}><span>{step > i ? <Check size={12} /> : i + 1}</span>{t(s)}</li>)}</ol><div className="result-trust"><ShieldCheck size={15} />{t('basedOn')}</div></>}</section><div className="privacy-card"><div className="privacy-icon"><LockKeyhole size={17} /></div><div><h3>{t('privacyTitle')}</h3><p>{t('privacySub')}</p></div></div><Sources /></aside></div>
        </> : <Info view={view} onBack={() => navigate('calculator')} />}
        <footer><span><Leaf size={13} />{t('footer')}</span><span>ထွယ်ဂျီဂွမ်Caculator</span></footer>
      </main>
    </div>
  </div>;
}
