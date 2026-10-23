import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import my from './locales/my.json';
let language = 'en';
try { language = localStorage.getItem('e9-language') === 'my' ? 'my' : 'en'; } catch { /* Storage may be unavailable in private browsing. */ }
void i18n.use(initReactI18next).init({ resources: { en: { translation: en }, my: { translation: my } }, lng: language, fallbackLng: 'en', interpolation: { escapeValue: false } });
i18n.on('languageChanged', lng => {
  document.documentElement.lang = lng;
  try { localStorage.setItem('e9-language', lng); } catch { /* Calculation does not depend on storage. */ }
});
document.documentElement.lang = language;
export default i18n;
