import { createI18n } from 'vue-i18n';
import ru from './ru.json';
import en from './en.json';
import sr from './sr.json';

const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('calc-locale') : null;

export default createI18n({
  legacy: false,
  locale: saved || 'ru',
  fallbackLocale: 'ru',
  warnHtmlMessage: false,
  messages: { ru, en, sr },
});
