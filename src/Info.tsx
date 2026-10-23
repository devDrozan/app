import { ArrowRight, ArrowUpRight, BookOpen, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const sources = [
  { key: 'sourceCalculator', url: 'https://moel.go.kr/retirementpayCal.do' },
  { key: 'sourceEligibility', url: 'https://www.moel.go.kr/minwon/fastcounsel/fastcounselView.do?inetDcssMngId=202302031324407911000' },
  { key: 'sourcePensions', url: 'https://moel.go.kr/retirementpay.do' },
  { key: 'sourceInsurance', url: 'https://www.eps.go.kr/eo/EmployPerSystem.eo?tabGb=06' },
];
export function Sources() {
  const { t } = useTranslation();
  return <div className="sources"><h3>{t('sources')}</h3>{sources.map(s => <a href={s.url} key={s.key} target="_blank" rel="noreferrer">{t(s.key)}<ArrowUpRight size={14} /></a>)}</div>;
}
export function Info({ view, onBack }: { view: 'guide' | 'insurance'; onBack: () => void }) {
  const { t } = useTranslation();
  return <div className="info-page animate-in">
    <div className="eyebrow">{t('madeFor')}</div>
    <h1>{t(view === 'guide' ? 'guideTitle' : 'insuranceTitle')}</h1>
    <p className="lead">{t(view === 'guide' ? 'guideSub' : 'insuranceSub')}</p>
    {view === 'guide' ? <>
      <div className="guide-grid">{(['normal', 'db', 'dc'] as const).map((m, i) => <article className="card guide-card" key={m}><span className="plan-index">0{i + 1}</span><h2>{t(m)}</h2><p>{t(`${m}Guide`)}</p></article>)}</div>
      <article className="soft-note"><BookOpen /><div><h3>{t('eligibilityTitle')}</h3><p>{t('eligibilityGuide')}</p></div></article>
    </> : <article className="card insurance-article"><div className="large-icon"><ShieldCheck size={32} /></div><p>{t('insuranceBody')}</p><p>{t('insuranceBody2')}</p><a className="button primary" href={sources[3].url} target="_blank" rel="noreferrer">{t('openEps')}<ArrowUpRight size={16} /></a></article>}
    <Sources />
    <button className="button primary" onClick={onBack}>{t('returnCalculator')}<ArrowRight size={16} /></button>
  </div>;
}
