import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, setLocale, type Locale } from '@/i18n';

/** Locale selector (PLAN Section 21). Persists choice to localStorage. */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  return (
    <select
      aria-label={t('language.label')}
      data-testid="language-switcher"
      className="ml-1 rounded border border-white/20 bg-dark-2 px-2 py-1.5 text-sm text-white"
      value={(i18n.resolvedLanguage ?? 'en') as Locale}
      onChange={(event) => setLocale(event.target.value as Locale)}
    >
      {SUPPORTED_LOCALES.map((locale) => (
        <option key={locale} value={locale} className="text-ink">
          {t(`language.${locale}`)}
        </option>
      ))}
    </select>
  );
}
