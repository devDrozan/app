import { CircleCheck, Info, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Calculation } from './api/client';
import { dateLabel, money } from './validation';

export function ResultSummary({ value }: { value: Calculation }) {
  const { t, i18n } = useTranslation();
  const result = value.result;
  if (!result) return <div className="result-message" role="status"><Info size={30} /><h2>{t(value.status === 'ineligible' ? 'ineligibleTitle' : 'reviewTitleResult')}</h2><p>{t(value.status === 'ineligible' ? 'ineligibleSub' : 'reviewResultSub')}</p>{[...value.context.eligibility.reasons, ...value.warnings].map(r => <p className="reason" key={r}>{t(`reasons.${r}`)}</p>)}</div>;
  return <div className="result-value" role="status">
    <span className="result-check"><CircleCheck size={18} />{t('result')}</span>
    <h2 className="eyebrow">{t(result.kind === 'dc' ? 'contributionTitle' : 'estimateTitle')}</h2>
    <div className="big-money"><span>₩</span>{money(result.kind === 'dc' ? result.requiredContributionKrw : result.amountKrw)}</div>
    <p>{t('beforeTax')}</p>
    {result.kind === 'severance' && result.provisional && <span className="provisional"><Info size={13} />{t('provisional')}</span>}
    {result.kind === 'dc' && result.reportedBalance && <div className="balance-note"><span>{t('balance')}</span><strong>₩{money(result.reportedBalance.amount)}</strong><small>{dateLabel(result.reportedBalance.asOf, i18n.language)}</small></div>}
    <div className="result-trust"><ShieldCheck size={15} />{t('basedOn')}</div>
  </div>;
}
export function ResultDetails({ value }: { value: Calculation }) {
  const { t, i18n } = useTranslation();
  const result = value.result;
  return <section className="result-details animate-in">
    <h2>{t('calculation')}</h2>
    {result && <>
      <dl className="breakdown">
        <div><dt>{t('serviceDays')}</dt><dd>{value.context.employmentDays.toLocaleString()}</dd></div>
        {result.kind === 'severance' ? <>
          <div><dt>{t('referenceWages')}</dt><dd>₩{money(result.referenceWagesKrw)}</dd></div>
          <div><dt>{t('bonusIncluded')}</dt><dd>₩{money(result.bonusIncludedKrw)}</dd></div>
          <div><dt>{t('leaveIncluded')}</dt><dd>₩{money(result.leaveIncludedKrw)}</dd></div>
          <div><dt>{t('dailyAverage')}</dt><dd>₩{money(result.averageDailyWageKrw)}</dd></div>
          <div><dt>{t('dailyApplied')}</dt><dd>₩{money(result.applicableDailyWageKrw)}</dd></div>
        </> : <>
          <div><dt>{t('totalWages')}</dt><dd>₩{money(result.totalWagesKrw)}</dd></div>
          {result.years.map(y => <div key={y.year}><dt>{y.year} · {t('requiredContribution')}</dt><dd>₩{money(y.contributionKrw)}</dd></div>)}
        </>}
      </dl>
      <div className="formula"><span>{t(result.kind === 'dc' ? 'dcFormula' : 'formula')}</span><small>{t('rounding')}</small></div>
    </>}
    {value.warnings.map(w => <div className="warning-note" key={w}><Info size={16} /><p>{t(`reasons.${w}`)}</p></div>)}
    <p className="rules-version">{t('verified', { date: dateLabel(value.verifiedOn, i18n.language), version: value.rulesVersion })}</p>
  </section>;
}
