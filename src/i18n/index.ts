import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';

/**
 * i18n setup (PLAN Section 21). Bundles are generated at build time
 * (scripts/translate.mjs) and imported statically so the site stays fully
 * static with no runtime translation API. CI enforces key parity across
 * locales (scripts/check-i18n-keys.mjs).
 */
export const SUPPORTED_LOCALES = ['en', 'de', 'fr', 'ja'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const STORAGE_KEY = 'holdings-hub.locale';

function initialLocale(): Locale {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
      return stored as Locale;
    }
  }
  return 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    fr: { translation: fr },
    ja: { translation: ja },
  },
  lng: initialLocale(),
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LOCALES,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function setLocale(locale: Locale): void {
  void i18n.changeLanguage(locale);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, locale);
  }
}

export default i18n;
